import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveEmployeeForUser } from '@/lib/tips'
import { decodeShiftTime, toDateOnlyIso } from '@/lib/shifts'

function getMonday(date: Date): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

async function getMonthlyTipsFromV2(
  userId: string,
  restaurantId: string,
  referenceDate: Date
) {
  const employee = await resolveEmployeeForUser(prisma, userId, restaurantId)

  if (!employee) {
    return { total: 0, daysWithTips: 0 }
  }

  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

  const rows = await prisma.tipDistributionV2.findMany({
    where: {
      employeeId: employee.id,
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { amount: true, date: true },
  })

  if (rows.length === 0) {
    return { total: 0, daysWithTips: 0 }
  }

  return {
    total: rows.reduce((s, r) => s + Number(r.amount), 0),
    daysWithTips: new Set(rows.map((r) => toDateOnlyIso(r.date))).size,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        department: true,
        restaurantId: true,
        role: true,
        avatar: true,
      },
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = toDateOnlyIso(today)

    const monday = getMonday(today)
    const weekEnd = new Date(monday)
    weekEnd.setDate(monday.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const shiftRows = await prisma.shift.findMany({
      where: {
        userId: user.id,
        restaurantId: user.restaurantId,
        date: { gte: monday, lte: weekEnd },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const shiftByDate = new Map(
      shiftRows.map((row) => [
        toDateOnlyIso(row.date),
        {
          id: row.id,
          time: decodeShiftTime(row.status, row.startTime, row.endTime),
          department: row.department,
          status: row.status,
          startTime: row.startTime.toISOString(),
          endTime: row.endTime.toISOString(),
        },
      ])
    )

    const weekShifts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const iso = toDateOnlyIso(d)
      return {
        date: iso,
        dayName: d.toLocaleDateString('it-IT', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isToday: iso === todayIso,
        shift: shiftByDate.get(iso) ?? null,
      }
    })

    const todayShift = shiftByDate.get(todayIso) ?? null

    const year = today.getFullYear()
    const month = today.getMonth()
    const monthLabel = today.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    const { total: monthlyTipsTotal, daysWithTips: monthlyTipsDays } =
      await getMonthlyTipsFromV2(user.id, user.restaurantId, today)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        department: user.department,
        role: user.role,
        avatar: user.avatar ?? '👤',
        restaurantId: user.restaurantId,
      },
      todayShift,
      weekShifts,
      weekRange: {
        from: toDateOnlyIso(monday),
        to: toDateOnlyIso(weekEnd),
      },
      monthlyTips: {
        total: monthlyTipsTotal,
        daysWithTips: monthlyTipsDays,
        month,
        year,
        monthLabel,
      },
    })
  } catch (error) {
    console.error('GET /api/me/hub error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
