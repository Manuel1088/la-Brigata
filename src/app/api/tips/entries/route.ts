import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { PaymentType } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { toDateOnlyIso } from '@/lib/shifts'
import { getTipsEntriesQuerySchema } from '@/lib/validations/tips'

const MANAGER_ROLES = new Set([
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'MANAGER',
  'RESTAURANT_MANAGER',
  'CASSIERE',
  'RESPONSABILE_SALA',
])

function paymentTypeToUi(type: PaymentType): 'cash' | 'card' | 'foreign' {
  if (type === 'CASH') return 'cash'
  if (type === 'CARD') return 'card'
  return 'foreign'
}

async function assertRestaurantAccess(userId: string, restaurantId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true },
  })
  if (!user) return false

  if (user.restaurantId === restaurantId) return true

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })

  return !!(
    restaurant?.companyId &&
    user.companyId === restaurant.companyId &&
    MANAGER_ROLES.has(String(user.role))
  )
}

/** GET /api/tips/entries — manager: TipEntry ristorante; dipendente: TipDistributionV2 personali */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getTipsEntriesQuerySchema.safeParse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
      restaurantId: searchParams.get('restaurantId') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, restaurantId: true, role: true },
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    const restaurantId = parsed.data.restaurantId ?? user.restaurantId
    const isManager = MANAGER_ROLES.has(String(user.role))

    if (isManager && !(await assertRestaurantAccess(session.user.id, restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
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

    const locations = await prisma.restaurantLocation.findMany({
      where: { restaurantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    if (isManager) {
      const rows = await prisma.tipEntry.findMany({
        where: {
          restaurantId,
          date: { gte: monthStart, lte: monthEnd },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          date: true,
          location: true,
          locationId: true,
          type: true,
          amount: true,
          notes: true,
          createdAt: true,
        },
      })

      const entries = rows.map((r) => ({
        id: r.id,
        date: toDateOnlyIso(r.date),
        location: r.location,
        locationId: r.locationId,
        type: paymentTypeToUi(r.type),
        amount: Number(r.amount),
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      }))

      const byDayMap = new Map<string, typeof entries>()
      for (const entry of entries) {
        const list = byDayMap.get(entry.date) ?? []
        list.push(entry)
        byDayMap.set(entry.date, list)
      }

      const byDay = [...byDayMap.entries()]
        .map(([date, items]) => ({
          date,
          amount: items.reduce((s, e) => s + e.amount, 0),
          items,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return NextResponse.json({
        view: 'manager' as const,
        month,
        year,
        monthLabel,
        locations,
        entries,
        byDay,
        distributions: [],
      })
    }

    const employee = await prisma.employee.findFirst({
      where: { name: user.name, restaurantId },
      select: { id: true, name: true },
    })

    if (!employee) {
      return NextResponse.json({
        view: 'employee' as const,
        month,
        year,
        monthLabel,
        locations,
        entries: [],
        distributions: [],
        byDay: [],
        employee: null,
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

    const locationNameById = new Map(locations.map((l) => [l.id, l.name]))

    const distributions = rows.map((r) => ({
      id: r.id,
      date: toDateOnlyIso(r.date),
      locationId: r.locationId,
      locationName: locationNameById.get(r.locationId) ?? r.locationId,
      amount: Number(r.amount),
      employeeScore: r.employeeScore,
      totalTips: Number(r.totalTips),
      totalPoints: r.totalPoints,
      isPresent: r.isPresent,
    }))

    const byDayMap = new Map<
      string,
      { date: string; amount: number; items: typeof distributions }
    >()

    for (const d of distributions) {
      const day = byDayMap.get(d.date) ?? { date: d.date, amount: 0, items: [] }
      day.amount += d.amount
      day.items.push(d)
      byDayMap.set(d.date, day)
    }

    const byDay = [...byDayMap.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json({
      view: 'employee' as const,
      month,
      year,
      monthLabel,
      locations,
      employee: { id: employee.id, name: employee.name },
      entries: [],
      distributions,
      byDay,
    })
  } catch (error) {
    console.error('GET /api/tips/entries error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
