import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  requireActiveRestaurantPlan,
  subscriptionErrorResponse,
} from '@/lib/subscription-guard'
import { dateFromIso } from '@/lib/shifts'
import { bookingTimeFromParts, formatBookingTime } from '@/lib/bookings-db'
import {
  getWalkinsQuerySchema,
  postWalkinBodySchema,
} from '@/lib/validations/walkins'

type WalkinRow = {
  id: string
  restaurantId: string
  date: Date
  time: Date | null
  covers: number
  area: string | null
  tableNumber: number | null
  notes: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

function serializeWalkin(row: WalkinRow) {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    date: row.date.toISOString().split('T')[0],
    time: row.time ? formatBookingTime(row.time) : null,
    covers: row.covers,
    area: row.area,
    areaId: row.area,
    tableNumber: row.tableNumber,
    notes: row.notes ?? '',
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** GET /api/walkins?date=YYYY-MM-DD&area=&restaurantId= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getWalkinsQuerySchema.safeParse({
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

    const rows = await prisma.walkin.findMany({
      where: {
        restaurantId,
        date: { gte: dayStart, lte: dayEnd },
        ...(parsed.data.area ? { area: parsed.data.area } : {}),
      },
      orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
    })

    const walkins = rows.map(serializeWalkin)
    return NextResponse.json({ walkins, meta: { count: walkins.length } })
  } catch (error) {
    console.error('GET /api/walkins error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/walkins */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postWalkinBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true },
    })

    const restaurantId = data.restaurantId ?? dbUser?.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId richiesto' }, { status: 400 })
    }

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    await requireActiveRestaurantPlan(restaurantId)

    const created = await prisma.walkin.create({
      data: {
        restaurantId,
        date: dateFromIso(data.date),
        time: data.time ? bookingTimeFromParts(data.date, data.time) : null,
        covers: data.covers,
        area: data.area ?? null,
        tableNumber: data.tableNumber ?? null,
        notes: data.notes ?? null,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(
      { success: true, walkin: serializeWalkin(created) },
      { status: 201 }
    )
  } catch (error) {
    const subErr = subscriptionErrorResponse(error)
    if (subErr) return subErr
    console.error('POST /api/walkins error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
