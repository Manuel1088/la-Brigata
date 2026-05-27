import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { buildSystemPrompt, type EmployeeContext } from '@/lib/payslip-prompt'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// ── Config ─────────────────────────────────────────────────────────────────
const MAX_ANALYSES_PER_MONTH = 10
const MODEL = 'claude-opus-4-5'

const bodySchema = z.object({
  fileBase64: z.string().min(100),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1),
})

// ── Helper: strip base64 prefix ────────────────────────────────────────────
function cleanBase64(raw: string): string {
  // Remove data URL prefix if present: "data:application/pdf;base64,..."
  const idx = raw.indexOf(',')
  return idx !== -1 ? raw.slice(idx + 1) : raw
}

// ── Helper: extract JSON from Claude response ──────────────────────────────
function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Nessun JSON trovato nella risposta AI')
  return JSON.parse(text.slice(start, end + 1))
}

// ── POST /api/payslip/analyze ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // ── 1. Parse + validate body ───────────────────────────────────────────
    const rawBody = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload non valido', details: parsed.error.flatten() }, { status: 400 })
    }
    const { fileBase64: rawBase64, fileName, mimeType } = parsed.data
    const fileBase64 = cleanBase64(rawBase64)

    // ── 2. Load user profile ───────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        ccnlLevel: true,
        baseSalary: true,
        weeklyHours: true,
        contractType: true,
        contractTypeEnum: true,
        startDate: true,
        maritalStatus: true,
        childrenCount: true,
        position: true,
        employeeSubscriptionStatus: true,
        employeeSubscriptionPeriodEnd: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // ── 3. Premium gate ────────────────────────────────────────────────────
    if (user.employeeSubscriptionStatus !== 'PREMIUM') {
      return NextResponse.json(
        {
          error: 'Piano Premium richiesto',
          code: 'NOT_PREMIUM',
          upgradeUrl: '/subscription',
        },
        { status: 402 }
      )
    }

    // Verifica periodo abbonamento
    if (user.employeeSubscriptionPeriodEnd && new Date(user.employeeSubscriptionPeriodEnd) < new Date()) {
      return NextResponse.json(
        { error: 'Abbonamento Premium scaduto', code: 'EXPIRED', upgradeUrl: '/subscription' },
        { status: 402 }
      )
    }

    // ── 4. Monthly usage limit ─────────────────────────────────────────────
    const now = new Date()
    const currentMonth = now.getMonth() + 1  // 1-based
    const currentYear = now.getFullYear()

    const usedThisMonth = await prisma.payslipAnalysis.count({
      where: {
        userId: user.id,
        month: currentMonth,
        year: currentYear,
      },
    })

    if (usedThisMonth >= MAX_ANALYSES_PER_MONTH) {
      return NextResponse.json(
        {
          error: `Limite mensile raggiunto (${MAX_ANALYSES_PER_MONTH} analisi/mese). Upgrade disponibile.`,
          code: 'LIMIT_REACHED',
          used: usedThisMonth,
          limit: MAX_ANALYSES_PER_MONTH,
        },
        { status: 429 }
      )
    }

    // ── 5. Check API key ───────────────────────────────────────────────────
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Servizio AI non configurato. Contatta l\'amministratore.' },
        { status: 503 }
      )
    }

    // ── 6. Build employee context ──────────────────────────────────────────
    const displayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.name

    const empCtx: EmployeeContext = {
      name: displayName,
      ccnlLevel: user.ccnlLevel,
      baseSalary: user.baseSalary ? Number(user.baseSalary) : null,
      weeklyHours: user.weeklyHours,
      contractType: user.contractType,
      contractTypeEnum: user.contractTypeEnum,
      startDate: user.startDate,
      maritalStatus: user.maritalStatus,
      childrenCount: user.childrenCount,
      position: user.position,
    }

    const systemPrompt = buildSystemPrompt(empCtx)

    // ── 7. Call Claude ─────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')

    let messageContent: Anthropic.Messages.MessageCreateParamsNonStreaming['messages'][0]['content']

    if (isPdf) {
      // Use PDF beta document type
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: fileBase64,
          },
        } as Anthropic.Messages.DocumentBlockParam,
        {
          type: 'text',
          text: 'Analizza questa busta paga e rispondi SOLO con il JSON strutturato come specificato nelle istruzioni di sistema.',
        },
      ]
    } else {
      // Image (JPG / PNG)
      const imgMime = mimeType.startsWith('image/')
        ? (mimeType as Anthropic.Messages.Base64ImageSource['media_type'])
        : 'image/jpeg'
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imgMime,
            data: fileBase64,
          },
        },
        {
          type: 'text',
          text: 'Analizza questa busta paga e rispondi SOLO con il JSON strutturato come specificato nelle istruzioni di sistema.',
        },
      ]
    }

    const claudeResponse = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: messageContent }],
      },
      isPdf ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } } : undefined
    )

    const rawText =
      claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : ''

    if (!rawText) {
      return NextResponse.json({ error: 'Risposta AI vuota. Riprova.' }, { status: 500 })
    }

    // ── 8. Parse Claude JSON ───────────────────────────────────────────────
    let aiData: Record<string, unknown>
    try {
      aiData = extractJson(rawText) as Record<string, unknown>
    } catch {
      console.error('Failed to parse Claude JSON:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'Errore nel parsing della risposta AI. Riprova con un file più leggibile.' },
        { status: 422 }
      )
    }

    const extraction = (aiData.extraction ?? {}) as Record<string, unknown>
    const grossAmount = Number(extraction.grossAmount ?? 0)
    const netAmount = Number(extraction.netAmount ?? 0)

    // Extract month/year from the document analysis or from "now"
    const monthName = String(extraction.month ?? '')
    const yearStr = String(extraction.year ?? currentYear)
    const docYear = parseInt(yearStr, 10) || currentYear

    const monthNames = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                        'luglio','agosto','settembre','ottobre','novembre','dicembre']
    const docMonth = monthNames.indexOf(monthName.toLowerCase()) + 1 || currentMonth

    // ── 9. Save to DB ──────────────────────────────────────────────────────
    const record = await prisma.payslipAnalysis.create({
      data: {
        userId: user.id,
        month: docMonth,
        year: docYear,
        fileName,
        netAmount,
        grossAmount,
        aiAnalysis: aiData as object,
        anomalies: (aiData.anomalies ?? []) as object,
        ccnlComparison: (aiData.ccnlComparison ?? {}) as object,
        fiscalAnalysis: (aiData.fiscalAnalysis ?? {}) as object,
      },
    })

    return NextResponse.json({
      analysis: {
        id: record.id,
        month: docMonth,
        year: docYear,
        fileName,
        netAmount,
        grossAmount,
        aiAnalysis: aiData,
        anomalies: aiData.anomalies,
        ccnlComparison: aiData.ccnlComparison,
        fiscalAnalysis: aiData.fiscalAnalysis,
        createdAt: record.createdAt,
      },
      usedThisMonth: usedThisMonth + 1,
      remainingThisMonth: MAX_ANALYSES_PER_MONTH - usedThisMonth - 1,
    })
  } catch (error) {
    console.error('POST /api/payslip/analyze error:', error)
    const msg = error instanceof Error ? error.message : 'Errore interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
