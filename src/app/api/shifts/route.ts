import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  dateFromIso,
  decodeShiftTime,
  getDateRange,
  parseTimeToBounds,
  toDateOnlyIso,
} from '@/lib/shifts'
import { recalculateDistributionsForDay } from '@/lib/tips'
import { getShiftsQuerySchema, postShiftsBodySchema } from '@/lib/validations/shifts'

function eachDayIsoInRange(rangeFrom: string, rangeTo: string): string[] {
  const dates: string[] = []
  const start = dateFromIso(rangeFrom)
  const end = dateFromIso(rangeTo)
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(toDateOnlyIso(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const MANAGER_ROLES = new Set([
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'MANAGER',
])

async function resolveRestaurantAccess(userId: string, restaurantId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true },
  })
  if (!user) return { allowed: false as const, user: null }

  if (user.restaurantId === restaurantId) {
    return { allowed: true as const, user }
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })

  if (
    restaurant?.companyId &&
    user.companyId === restaurant.companyId &&
    MANAGER_ROLES.has(String(user.role))
  ) {
    return { allowed: true as const, user }
  }

  return { allowed: false as const, user }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getShiftsQuerySchema.safeParse({
      restaurantId: searchParams.get('restaurantId') ?? undefined,
      date: searchParams.get('date'),
      days: searchParams.get('days') ?? '7',
      userId: searchParams.get('userId') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true },
    })

    const restaurantId = parsed.data.restaurantId ?? dbUser?.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId richiesto' }, { status: 400 })
    }

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const filterUserId = parsed.data.userId
    if (
      filterUserId &&
      filterUserId !== session.user.id &&
      !MANAGER_ROLES.has(String(access.user?.role))
    ) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const anchor = new Date(`${parsed.data.date}T12:00:00`)
    const { from, to, dates } = getDateRange(anchor, parsed.data.days)

    const rows = await prisma.shift.findMany({
      where: {
        restaurantId,
        date: { gte: from, lte: to },
        ...(filterUserId ? { userId: filterUserId } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const shifts = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user.name,
      date: toDateOnlyIso(row.date),
      department: row.department,
      time: decodeShiftTime(row.status, row.startTime, row.endTime),
      status: row.status,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
    }))

    return NextResponse.json({
      shifts,
      range: {
        from: toDateOnlyIso(from),
        to: toDateOnlyIso(dates[dates.length - 1]),
        days: dates.length,
      },
    })
  } catch (error) {
    console.error('GET /api/shifts error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postShiftsBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { restaurantId, rangeFrom, rangeTo, assignments } = parsed.data

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const canEdit =
      MANAGER_ROLES.has(String(access.user?.role)) ||
      ['HEAD_CHEF', 'RESPONSABILE_SALA', 'CASSIERE'].includes(String(access.user?.role))

    if (!canEdit) {
      return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
    }

    const rangeStart = dateFromIso(rangeFrom)
    const rangeEnd = new Date(`${rangeTo}T23:59:59.999`)

    await prisma.$transaction(async (tx) => {
      await tx.shift.deleteMany({
        where: {
          restaurantId,
          date: { gte: rangeStart, lte: rangeEnd },
        },
      })

      if (assignments.length === 0) return

      await tx.shift.createMany({
        data: assignments.map((a) => {
          const { startTime, endTime, status } = parseTimeToBounds(a.time, a.date)
          return {
            userId: a.userId,
            restaurantId,
            date: dateFromIso(a.date),
            startTime,
            endTime,
            department: a.department,
            status,
          }
        }),
      })
    })

    const tipEntriesInRange = await prisma.tipEntry.findMany({
      where: {
        restaurantId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true },
    })
    const daysWithTips = new Set(
      tipEntriesInRange.map((e) => toDateOnlyIso(e.date))
    )

    let distributionsRecalculated = 0
    for (const dateIso of eachDayIsoInRange(rangeFrom, rangeTo)) {
      if (!daysWithTips.has(dateIso)) continue
      try {
        await recalculateDistributionsForDay(prisma, restaurantId, dateIso)
        distributionsRecalculated++
      } catch (recalcErr) {
        console.error(
          `Ricalcolo mance fallito ${restaurantId} ${dateIso}:`,
          recalcErr
        )
      }
    }

    return NextResponse.json({
      success: true,
      saved: assignments.length,
      distributionsRecalculated,
    })
  } catch (error) {
    console.error('POST /api/shifts error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
