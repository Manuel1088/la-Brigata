import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAuditAction } from '@/lib/audit'
import { recalculateDistributionsForDay } from '@/lib/tips'
import { toDateOnlyIso } from '@/lib/shifts'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DAYS_TO_RECALCULATE = 7
const CRON_RESOURCE = 'cron_recalculate_tips'

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

async function resolveAuditUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return admin?.id ?? null
}

async function runRecalculateJob() {
  const rangeEnd = new Date()
  rangeEnd.setHours(23, 59, 59, 999)
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - (DAYS_TO_RECALCULATE - 1))
  rangeStart.setHours(0, 0, 0, 0)

  const entries = await prisma.tipEntry.findMany({
    where: {
      date: { gte: rangeStart, lte: rangeEnd },
    },
    select: { restaurantId: true, date: true },
  })

  const pairKeys = new Map<string, { restaurantId: string; dateIso: string }>()
  for (const entry of entries) {
    const dateIso = toDateOnlyIso(entry.date)
    const key = `${entry.restaurantId}:${dateIso}`
    pairKeys.set(key, { restaurantId: entry.restaurantId, dateIso })
  }

  const results: Array<{
    restaurantId: string
    dateIso: string
    distributions: number
    warning?: string
    error?: string
  }> = []

  let successCount = 0
  let errorCount = 0

  for (const { restaurantId, dateIso } of pairKeys.values()) {
    try {
      const result = await recalculateDistributionsForDay(
        prisma,
        restaurantId,
        dateIso
      )
      successCount++
      results.push({
        restaurantId,
        dateIso,
        distributions: result.distributions.length,
        warning: result.warning,
      })
    } catch (err) {
      errorCount++
      results.push({
        restaurantId,
        dateIso,
        distributions: 0,
        error: err instanceof Error ? err.message : 'Errore sconosciuto',
      })
    }
  }

  const daysRecalculated = new Set(results.map((r) => r.dateIso)).size
  const restaurantsRecalculated = new Set(results.map((r) => r.restaurantId)).size
  const pairsRecalculated = results.length

  return {
    rangeFrom: toDateOnlyIso(rangeStart),
    rangeTo: toDateOnlyIso(rangeEnd),
    daysInWindow: DAYS_TO_RECALCULATE,
    tipEntryPairsFound: pairKeys.size,
    daysRecalculated,
    restaurantsRecalculated,
    pairsRecalculated,
    successCount,
    errorCount,
    results,
  }
}

async function handleCron(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const startedAt = new Date()

  try {
    const summary = await runRecalculateJob()
    const auditUserId = await resolveAuditUserId()

    if (auditUserId) {
      await logAuditAction({
        userId: auditUserId,
        action: 'UPDATE',
        resource: 'cron',
        resourceId: CRON_RESOURCE,
        details: JSON.stringify({
          job: 'recalculate-tips',
          startedAt: startedAt.toISOString(),
          completedAt: new Date().toISOString(),
          daysRecalculated: summary.daysRecalculated,
          restaurantsRecalculated: summary.restaurantsRecalculated,
          pairsRecalculated: summary.pairsRecalculated,
          successCount: summary.successCount,
          errorCount: summary.errorCount,
          rangeFrom: summary.rangeFrom,
          rangeTo: summary.rangeTo,
        }),
        userAgent: 'vercel-cron',
      })
    }

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (error) {
    console.error('POST /api/cron/recalculate-tips error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore interno',
      },
      { status: 500 }
    )
  }
}

/** POST /api/cron/recalculate-tips — job notturno (Bearer CRON_SECRET) */
export async function POST(request: NextRequest) {
  return handleCron(request)
}

/**
 * Vercel Cron invoca GET; stessa logica e stessa protezione Bearer.
 */
export async function GET(request: NextRequest) {
  return handleCron(request)
}
