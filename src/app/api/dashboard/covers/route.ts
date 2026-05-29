import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import { dateFromIso, toDateOnlyIso } from '@/lib/shifts'

const CANCELLED_STATUSES = ['cancelled', 'canceled', 'annullata']

type CoversBreakdown = {
  date: string
  bookings: number
  events: number
  walkins: number
  total: number
}

async function computeCovers(
  restaurantId: string,
  iso: string
): Promise<CoversBreakdown> {
  const dayStart = new Date(`${iso}T00:00:00.000`)
  const dayEnd = new Date(`${iso}T23:59:59.999`)
  const range = { gte: dayStart, lte: dayEnd }

  const [bookingsAgg, eventsAgg, walkinsAgg] = await Promise.all([
    prisma.booking.aggregate({
      _sum: { partySize: true },
      where: {
        restaurantId,
        date: range,
        status: { notIn: CANCELLED_STATUSES },
      },
    }),
    prisma.restaurantEvent.aggregate({
      _sum: { expectedGuests: true },
      where: { restaurantId, date: range },
    }),
    prisma.walkin.aggregate({
      _sum: { covers: true },
      where: { restaurantId, date: range },
    }),
  ])

  const bookings = bookingsAgg._sum.partySize ?? 0
  const events = eventsAgg._sum.expectedGuests ?? 0
  const walkins = walkinsAgg._sum.covers ?? 0

  return {
    date: iso,
    bookings,
    events,
    walkins,
    total: bookings + events + walkins,
  }
}

/** GET /api/dashboard/covers?date=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const iso =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : toDateOnlyIso(new Date())

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true },
    })
    const restaurantId = dbUser?.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    // Stesso giorno della settimana ~1 anno fa: 52 settimane indietro = 364 giorni
    const base = dateFromIso(iso)
    const prior = new Date(base)
    prior.setDate(prior.getDate() - 364)
    const priorIso = toDateOnlyIso(prior)

    const [current, previous] = await Promise.all([
      computeCovers(restaurantId, iso),
      computeCovers(restaurantId, priorIso),
    ])

    const hasPrevious = previous.total > 0
    const changePercent = hasPrevious
      ? Math.round(((current.total - previous.total) / previous.total) * 100)
      : null

    return NextResponse.json({
      current,
      previous: { ...previous, hasData: hasPrevious },
      changePercent,
    })
  } catch (error) {
    console.error('GET /api/dashboard/covers error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
