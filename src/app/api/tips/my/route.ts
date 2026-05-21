import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { toDateOnlyIso } from '@/lib/shifts'
import { getTipsMyQuerySchema } from '@/lib/validations/tips'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getTipsMyQuerySchema.safeParse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, restaurantId: true },
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    const now = new Date()
    const year = parsed.data.year ?? now.getFullYear()
    const month = parsed.data.month ?? now.getMonth()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
    const monthLabel = monthStart.toLocaleDateString('it-IT', {
      month: 'long',
      year: 'numeric',
    })

    const employee = await prisma.employee.findFirst({
      where: { name: user.name, restaurantId: user.restaurantId },
      select: { id: true, name: true, score: true },
    })

    if (!employee) {
      return NextResponse.json({
        employee: null,
        month,
        year,
        monthLabel,
        summary: { total: 0, daysWithTips: 0, averageDaily: 0 },
        byDay: [],
        byLocation: [],
        distributions: [],
      })
    }

    const rows = await prisma.tipDistributionV2.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: [{ date: 'desc' }, { locationId: 'asc' }],
      select: {
        id: true,
        date: true,
        locationId: true,
        amount: true,
        employeeScore: true,
        totalTips: true,
        totalPoints: true,
        isPresent: true,
      },
    })

    const locationIds = [...new Set(rows.map((r) => r.locationId))]
    const locations =
      locationIds.length > 0
        ? await prisma.restaurantLocation.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : []
    const locationNameById = new Map(locations.map((l) => [l.id, l.name]))

    const byDayMap = new Map<
      string,
      { date: string; amount: number; locations: Array<{ locationId: string; locationName: string; amount: number }> }
    >()
    const byLocationMap = new Map<string, number>()

    for (const row of rows) {
      const dateIso = toDateOnlyIso(row.date)
      const amount = Number(row.amount)
      const locationName = locationNameById.get(row.locationId) ?? row.locationId

      const day = byDayMap.get(dateIso) ?? {
        date: dateIso,
        amount: 0,
        locations: [],
      }
      day.amount += amount
      day.locations.push({
        locationId: row.locationId,
        locationName,
        amount,
      })
      byDayMap.set(dateIso, day)

      byLocationMap.set(row.locationId, (byLocationMap.get(row.locationId) ?? 0) + amount)
    }

    const total = rows.reduce((s, r) => s + Number(r.amount), 0)
    const daysWithTips = byDayMap.size
    const averageDaily = daysWithTips > 0 ? total / daysWithTips : 0

    const byDay = [...byDayMap.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const byLocation = [...byLocationMap.entries()].map(([locationId, locTotal]) => ({
      locationId,
      locationName: locationNameById.get(locationId) ?? locationId,
      total: locTotal,
    }))

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name, score: employee.score },
      month,
      year,
      monthLabel,
      summary: {
        total,
        daysWithTips,
        averageDaily,
      },
      byDay,
      byLocation,
      distributions: rows.map((r) => ({
        id: r.id,
        date: toDateOnlyIso(r.date),
        locationId: r.locationId,
        locationName: locationNameById.get(r.locationId) ?? r.locationId,
        amount: Number(r.amount),
        employeeScore: r.employeeScore,
        totalTips: Number(r.totalTips),
        totalPoints: r.totalPoints,
        isPresent: r.isPresent,
      })),
    })
  } catch (error) {
    console.error('GET /api/tips/my error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
