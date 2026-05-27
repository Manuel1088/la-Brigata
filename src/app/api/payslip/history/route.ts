import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

const MAX_ANALYSES_PER_MONTH = 10

/** GET /api/payslip/history — storico analisi dell'utente loggato */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const [analyses, usedThisMonth] = await Promise.all([
      prisma.payslipAnalysis.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          month: true,
          year: true,
          fileName: true,
          netAmount: true,
          grossAmount: true,
          anomalies: true,
          ccnlComparison: true,
          fiscalAnalysis: true,
          aiAnalysis: true,
          createdAt: true,
        },
      }),
      prisma.payslipAnalysis.count({
        where: {
          userId: session.user.id,
          month: currentMonth,
          year: currentYear,
        },
      }),
    ])

    return NextResponse.json({
      analyses: analyses.map((a) => ({
        ...a,
        netAmount: Number(a.netAmount),
        grossAmount: Number(a.grossAmount),
      })),
      usedThisMonth,
      remainingThisMonth: Math.max(0, MAX_ANALYSES_PER_MONTH - usedThisMonth),
    })
  } catch (error) {
    console.error('GET /api/payslip/history error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
