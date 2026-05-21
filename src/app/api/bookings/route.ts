import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import { dateFromIso } from '@/lib/shifts'
import {
  bookingTimeFromParts,
  resolveTableId,
  serializeBooking,
  upsertCustomerForBooking,
} from '@/lib/bookings-db'
import {
  getBookingsQuerySchema,
  postBookingBodySchema,
} from '@/lib/validations/bookings'

const bookingInclude = { customer: true, table: true } as const

/** GET /api/bookings?date=&restaurantId=&area= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getBookingsQuerySchema.safeParse({
      restaurantId: searchParams.get('restaurantId') ?? undefined,
      date: searchParams.get('date'),
      area: searchParams.get('area') ?? undefined,
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

    const dayStart = dateFromIso(parsed.data.date)
    const dayEnd = new Date(`${parsed.data.date}T23:59:59.999`)

    const rows = await prisma.booking.findMany({
      where: {
        restaurantId,
        date: { gte: dayStart, lte: dayEnd },
        ...(parsed.data.area ? { area: parsed.data.area } : {}),
      },
      include: bookingInclude,
      orderBy: [{ time: 'asc' }],
    })

    const bookings = rows.map(serializeBooking)
    return NextResponse.json({ bookings, meta: { count: bookings.length } })
  } catch (error) {
    console.error('GET /api/bookings error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/bookings */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postBookingBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const access = await resolveRestaurantAccess(session.user.id, data.restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const visitDate = bookingTimeFromParts(data.date, data.time)
    const customer = await upsertCustomerForBooking({
      restaurantId: data.restaurantId,
      name: data.customerName,
      phone: data.customerPhone,
      email: data.customerEmail,
      notes: data.notes,
      visitDate,
      partySize: data.partySize,
    })

    const tableId = await resolveTableId(
      data.restaurantId,
      data.tableNumber,
      data.tableId
    )

    const created = await prisma.booking.create({
      data: {
        restaurantId: data.restaurantId,
        customerId: customer.id,
        tableId,
        area: data.area ?? null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        date: dateFromIso(data.date),
        time: visitDate,
        partySize: data.partySize,
        tableNumber: data.tableNumber ?? null,
        status: data.status ?? 'confirmed',
        notes: data.notes ?? null,
      },
      include: bookingInclude,
    })

    return NextResponse.json(
      { success: true, booking: serializeBooking(created) },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
