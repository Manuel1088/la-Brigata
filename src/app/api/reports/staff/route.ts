import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  assertReportsAccess,
  getRestaurantLocationIds,
  monthBounds,
  REPORTS_MANAGER_ROLES,
} from '@/lib/reports'
import { reportsQuerySchema } from '@/lib/validations/reports'
import { isPresentShift, toDateOnlyIso } from '@/lib/shifts'

/** GET /api/reports/staff?year=&month= */
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

    const locations = await getRestaurantLocationIds(prisma, restaurantId)
    const locationIds = locations.map((l) => l.id)

    const [distributions, shifts] = await Promise.all([
      locationIds.length > 0
        ? prisma.tipDistributionV2.findMany({
            where: {
              locationId: { in: locationIds },
              date: { gte: start, lte: end },
            },
            select: {
              employeeId: true,
              employeeName: true,
              amount: true,
            },
          })
        : Promise.resolve([]),
      prisma.shift.findMany({
        where: { restaurantId, date: { gte: start, lte: end } },
        select: {
          userId: true,
          date: true,
          status: true,
          startTime: true,
          endTime: true,
          user: { select: { name: true } },
        },
      }),
    ])

    const tipsByEmployee = new Map<
      string,
      { employeeName: string; total: number }
    >()
    for (const row of distributions) {
      const amount = Number(row.amount)
      const existing = tipsByEmployee.get(row.employeeId)
      if (existing) {
        existing.total += amount
      } else {
        tipsByEmployee.set(row.employeeId, {
          employeeName: row.employeeName,
          total: amount,
        })
      }
    }

    const grandTotal = Array.from(tipsByEmployee.values()).reduce(
      (s, e) => s + e.total,
      0
    )

    const topEmployees = Array.from(tipsByEmployee.entries())
      .map(([employeeId, data]) => ({
        employeeId,
        employeeName: data.employeeName,
        totalAmount: Math.round(data.total * 100) / 100,
        sharePercent:
          grandTotal > 0
            ? Math.round((data.total / grandTotal) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)

    const shiftDaysByUser = new Map<
      string,
      { userName: string; days: Set<string> }
    >()
    for (const shift of shifts) {
      if (!isPresentShift(shift.status, shift.startTime, shift.endTime)) {
        continue
      }
      const dayKey = toDateOnlyIso(shift.date)
      const existing = shiftDaysByUser.get(shift.userId)
      if (existing) {
        existing.days.add(dayKey)
      } else {
        shiftDaysByUser.set(shift.userId, {
          userName: shift.user.name,
          days: new Set([dayKey]),
        })
      }
    }

    const attendance = Array.from(shiftDaysByUser.entries())
      .map(([userId, data]) => ({
        userId,
        name: data.userName,
        shiftDays: data.days.size,
      }))
      .sort((a, b) => b.shiftDays - a.shiftDays)

    const employeeCount = tipsByEmployee.size
    const averageTipPerEmployee =
      employeeCount > 0
        ? Math.round((grandTotal / employeeCount) * 100) / 100
        : 0

    const employeeStats = Array.from(tipsByEmployee.entries())
      .map(([employeeId, data]) => {
        const shiftEntry = attendance.find(
          (a) => a.name === data.employeeName
        )
        const shiftDays = shiftEntry?.shiftDays ?? 0
        return {
          employeeId,
          employeeName: data.employeeName,
          totalTips: Math.round(data.total * 100) / 100,
          shiftDays,
          averagePerShiftDay:
            shiftDays > 0
              ? Math.round((data.total / shiftDays) * 100) / 100
              : 0,
        }
      })
      .sort((a, b) => b.totalTips - a.totalTips)

    return NextResponse.json({
      year,
      month,
      monthLabel: start.toLocaleDateString('it-IT', {
        month: 'long',
        year: 'numeric',
      }),
      topEmployees,
      attendance,
      averages: {
        averageTipPerEmployee,
        employeesWithTips: employeeCount,
        totalTipsDistributed: Math.round(grandTotal * 100) / 100,
      },
      employeeStats,
    })
  } catch (error) {
    console.error('GET /api/reports/staff error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
