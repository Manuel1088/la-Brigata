import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { PaymentType } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { dateFromIso, toDateOnlyIso } from '@/lib/shifts'
import { getTipsSummaryQuerySchema } from '@/lib/validations/tips'

import { assertRestaurantAccess, restaurantIdsForManager } from '@/lib/restaurant-access'
import { isManagerRole } from '@/lib/roles'

function emptyToUndefined(value: string | null): string | undefined {
  const v = value?.trim()
  return v ? v : undefined
}

function sumByType(rows: Array<{ type: PaymentType; amount: unknown }>) {
  let cash = 0
  let card = 0
  let foreign = 0
  for (const row of rows) {
    const amount = Number(row.amount)
    if (row.type === 'CASH') cash += amount
    else if (row.type === 'CARD') card += amount
    else if (row.type === 'FOREIGN') foreign += amount
  }
  return { cash, card, foreign, total: cash + card + foreign }
}

/** GET /api/tips/summary — totale TipEntry ristorante (mese + oggi), solo manager/admin */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getTipsSummaryQuerySchema.safeParse({
      month: emptyToUndefined(searchParams.get('month')),
      year: emptyToUndefined(searchParams.get('year')),
      restaurantId: emptyToUndefined(searchParams.get('restaurantId')),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, restaurantId: true, companyId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    if (!isManagerRole(user.role)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    let restaurantId = parsed.data.restaurantId ?? user.restaurantId ?? null
    if (!restaurantId) {
      const ids = await restaurantIdsForManager(user)
      restaurantId = ids[0] ?? null
    }

    if (!restaurantId) {
      return NextResponse.json(
        {
          error:
            'Ristorante non configurato per il tuo account. Contatta l\'amministratore.',
        },
        { status: 400 }
      )
    }

    if (!(await assertRestaurantAccess(session.user.id, restaurantId, true))) {
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

    const todayIso = toDateOnlyIso(now)
    const todayStart = dateFromIso(todayIso)
    const todayEnd = new Date(`${todayIso}T23:59:59.999`)

    const [monthRows, todayRows] = await Promise.all([
      prisma.tipEntry.findMany({
        where: {
          restaurantId,
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { date: true, amount: true, type: true },
      }),
      prisma.tipEntry.findMany({
        where: {
          restaurantId,
          date: { gte: todayStart, lte: todayEnd },
        },
        select: { amount: true, type: true },
      }),
    ])

    const monthBreakdown = sumByType(monthRows)
    const todayBreakdown = sumByType(todayRows)
    const monthDaysWithTips = new Set(monthRows.map((r) => toDateOnlyIso(r.date))).size

    return NextResponse.json({
      view: 'restaurant' as const,
      month,
      year,
      monthLabel,
      summary: {
        monthTotal: monthBreakdown.total,
        monthDaysWithTips,
        todayTotal: todayBreakdown.total,
        byType: {
          cash: monthBreakdown.cash,
          card: monthBreakdown.card,
          foreign: monthBreakdown.foreign,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/tips/summary error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
