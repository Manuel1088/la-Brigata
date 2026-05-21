import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  getTablesQuerySchema,
  postTableBodySchema,
} from '@/lib/validations/bookings'

function serializeTable(row: {
  id: string
  restaurantId: string
  tableNumber: number
  seats: number
  status: string
  lastUpdated: Date
}) {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableNumber: row.tableNumber,
    seats: row.seats,
    status: row.status,
    lastUpdated: row.lastUpdated.toISOString(),
  }
}

/** GET /api/tables?restaurantId= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getTablesQuerySchema.safeParse({
      restaurantId: searchParams.get('restaurantId') ?? undefined,
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

    const rows = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: 'asc' },
    })

    const tables = rows.map(serializeTable)
    return NextResponse.json({ tables, meta: { count: tables.length } })
  } catch (error) {
    console.error('GET /api/tables error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/tables */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postTableBodySchema.safeParse(body)
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

    const created = await prisma.table.upsert({
      where: {
        restaurantId_tableNumber: {
          restaurantId: data.restaurantId,
          tableNumber: data.tableNumber,
        },
      },
      create: {
        restaurantId: data.restaurantId,
        tableNumber: data.tableNumber,
        seats: data.seats,
        status: data.status ?? 'available',
      },
      update: {
        seats: data.seats,
        status: data.status ?? 'available',
        lastUpdated: new Date(),
      },
    })

    return NextResponse.json(
      { success: true, table: serializeTable(created) },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/tables error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
