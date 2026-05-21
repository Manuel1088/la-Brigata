import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  assertReportsAccess,
  buildDailySeries,
  monthBounds,
  previousMonth,
  REPORTS_MANAGER_ROLES,
  sumByPaymentType,
  trendFromChange,
} from '@/lib/reports'
import { reportsQuerySchema } from '@/lib/validations/reports'
import { toDateOnlyIso } from '@/lib/shifts'

/** GET /api/reports/tips?year=&month= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = reportsQuerySchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, restaurantId: true },
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    if (!REPORTS_MANAGER_ROLES.has(String(user.role))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const restaurantId = user.restaurantId
    if (!(await assertReportsAccess(prisma, session.user.id, restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const now = new Date()
    const year = parsed.data.year ?? now.getFullYear()
    const month = parsed.data.month ?? now.getMonth()
    const { start, end } = monthBounds(year, month)
    const prev = previousMonth(year, month)
    const prevBounds = monthBounds(prev.year, prev.month)

    const locations = await prisma.restaurantLocation.findMany({
      where: { restaurantId },
      select: { id: true, name: true },
    })
    const locationNameById = new Map(locations.map((l) => [l.id, l.name]))

    const [monthRows, prevRows] = await Promise.all([
      prisma.tipEntry.findMany({
        where: { restaurantId, date: { gte: start, lte: end } },
        select: {
          date: true,
          amount: true,
          type: true,
          locationId: true,
          location: true,
        },
      }),
      prisma.tipEntry.findMany({
        where: {
          restaurantId,
          date: { gte: prevBounds.start, lte: prevBounds.end },
        },
        select: { amount: true, type: true },
      }),
    ])

    const byType = sumByPaymentType(monthRows)
    const prevByType = sumByPaymentType(prevRows)

    const byLocationMap = new Map<string, number>()
    for (const row of monthRows) {
      const key = row.locationId
      byLocationMap.set(key, (byLocationMap.get(key) ?? 0) + Number(row.amount))
    }

    const byLocation = Array.from(byLocationMap.entries())
      .map(([locationId, total]) => ({
        locationId,
        locationName:
          locationNameById.get(locationId) ?? rowLocationName(monthRows, locationId),
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)

    const dailyTotals = new Map<string, number>()
    for (const row of monthRows) {
      const key = toDateOnlyIso(row.date)
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + Number(row.amount))
    }

    const daysWithTips = dailyTotals.size
    const dailyAverage =
      daysWithTips > 0
        ? Math.round((byType.total / daysWithTips) * 100) / 100
        : 0

    let bestDay: { date: string; amount: number } | null = null
    for (const [date, amount] of dailyTotals) {
      if (!bestDay || amount > bestDay.amount) {
        bestDay = { date, amount: Math.round(amount * 100) / 100 }
      }
    }

    const changeAmount = Math.round((byType.total - prevByType.total) * 100) / 100
    const changePercent =
      prevByType.total > 0
        ? Math.round((changeAmount / prevByType.total) * 1000) / 10
        : byType.total > 0
          ? 100
          : 0

    return NextResponse.json({
      year,
      month,
      monthLabel: start.toLocaleDateString('it-IT', {
        month: 'long',
        year: 'numeric',
      }),
      totals: {
        total: Math.round(byType.total * 100) / 100,
        byType: {
          card: Math.round(byType.card * 100) / 100,
          cash: Math.round(byType.cash * 100) / 100,
          foreign: Math.round(byType.foreign * 100) / 100,
        },
        byLocation,
      },
      stats: {
        dailyAverage,
        daysWithTips,
        bestDay,
      },
      dailySeries: buildDailySeries(monthRows, year, month),
      comparison: {
        previousMonth: {
          year: prev.year,
          month: prev.month,
          total: Math.round(prevByType.total * 100) / 100,
        },
        changeAmount,
        changePercent,
        trend: trendFromChange(changePercent),
      },
    })
  } catch (error) {
    console.error('GET /api/reports/tips error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

function rowLocationName(
  rows: Array<{ locationId: string; location: string }>,
  locationId: string
) {
  const hit = rows.find((r) => r.locationId === locationId)
  return hit?.location ?? locationId
}
