import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveEmployeeForUser } from '@/lib/tips'
import { toDateOnlyIso } from '@/lib/shifts'

/**
 * GET /api/tips/my/export?from=YYYY-MM-DD&to=YYYY-MM-DD&type=cash|card|foreign|all
 *
 * Restituisce i dati di distribuzione mance del dipendente loggato
 * nel periodo specificato, pronti per la generazione PDF client-side.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = (searchParams.get('type') ?? 'all') as 'cash' | 'card' | 'foreign' | 'all'

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Parametri from e to obbligatori (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const fromDate = new Date(`${from}T00:00:00`)
    const toDate = new Date(`${to}T23:59:59.999`)

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
    }
    if (fromDate > toDate) {
      return NextResponse.json({ error: 'from deve essere <= to' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, firstName: true, lastName: true, restaurantId: true },
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: {
        name: true,
        company: { select: { name: true } },
      },
    })

    const employeeRecord = await resolveEmployeeForUser(prisma, user.id, user.restaurantId)
    if (!employeeRecord) {
      return NextResponse.json(
        { error: 'Nessun record Employee collegato a questo utente' },
        { status: 404 }
      )
    }

    const distributions = await prisma.tipDistributionV2.findMany({
      where: {
        employeeId: employeeRecord.id,
        date: { gte: fromDate, lte: toDate },
        isPresent: true,
      },
      orderBy: [{ date: 'asc' }, { locationId: 'asc' }],
      select: {
        id: true,
        date: true,
        locationId: true,
        amount: true,
        employeeScore: true,
        totalTips: true,
        totalPoints: true,
      },
    })

    const locationIds = [...new Set(distributions.map((d) => d.locationId))]
    const locations =
      locationIds.length > 0
        ? await prisma.restaurantLocation.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : []
    const locationNameById = new Map(locations.map((l) => [l.id, l.name]))

    // Recupera le entry per conoscere la suddivisione per tipo di pagamento
    const entries =
      locationIds.length > 0
        ? await prisma.tipEntry.findMany({
            where: {
              restaurantId: user.restaurantId,
              date: { gte: fromDate, lte: toDate },
              locationId: { in: locationIds },
            },
            select: { date: true, locationId: true, type: true, amount: true },
          })
        : []

    type Pool = { cash: number; card: number; foreign: number }
    const entryPools = new Map<string, Pool>()
    for (const e of entries) {
      const key = `${toDateOnlyIso(e.date)}:${e.locationId}`
      const b = entryPools.get(key) ?? { cash: 0, card: 0, foreign: 0 }
      const amt = Number(e.amount)
      if (e.type === 'CASH') b.cash += amt
      else if (e.type === 'CARD') b.card += amt
      else b.foreign += amt
      entryPools.set(key, b)
    }

    // Calcola le quote per tipo di pagamento proporzionalmente
    let totalCash = 0
    let totalCard = 0
    let totalForeign = 0

    const rows = distributions.map((d) => {
      const dateIso = toDateOnlyIso(d.date)
      const key = `${dateIso}:${d.locationId}`
      const pools = entryPools.get(key)
      const locTotal = Number(d.totalTips)
      const amount = Number(d.amount)

      let cashShare = 0
      let cardShare = 0
      let foreignShare = 0

      if (pools && locTotal > 0) {
        const ratio = amount / locTotal
        cashShare = pools.cash * ratio
        cardShare = pools.card * ratio
        foreignShare = pools.foreign * ratio
      }

      totalCash += cashShare
      totalCard += cardShare
      totalForeign += foreignShare

      return {
        date: dateIso,
        locationName: locationNameById.get(d.locationId) ?? d.locationId,
        amount,
        cashShare: Math.round(cashShare * 100) / 100,
        cardShare: Math.round(cardShare * 100) / 100,
        foreignShare: Math.round(foreignShare * 100) / 100,
        employeeScore: d.employeeScore,
        totalPoints: d.totalPoints,
      }
    })

    // Filtra per tipo se richiesto
    const filteredRows =
      type === 'all'
        ? rows
        : rows.filter((r) => {
            if (type === 'cash') return r.cashShare > 0
            if (type === 'card') return r.cardShare > 0
            if (type === 'foreign') return r.foreignShare > 0
            return true
          })

    const total = filteredRows.reduce((s, r) => s + r.amount, 0)

    const displayName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name

    const periodLabel = `${new Date(`${from}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })} – ${new Date(`${to}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`

    return NextResponse.json({
      employee: { name: displayName },
      restaurantName: restaurant?.company?.name ?? restaurant?.name ?? 'La Brigata',
      period: { from, to, label: periodLabel },
      typeFilter: type,
      rows: filteredRows,
      total: Math.round(total * 100) / 100,
      byType: {
        cash: Math.round(totalCash * 100) / 100,
        card: Math.round(totalCard * 100) / 100,
        foreign: Math.round(totalForeign * 100) / 100,
      },
    })
  } catch (error) {
    console.error('GET /api/tips/my/export error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
