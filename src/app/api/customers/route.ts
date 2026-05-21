import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  encodeCustomerNotes,
  serializeCustomer,
} from '@/lib/bookings-db'
import {
  getCustomersQuerySchema,
  postCustomerBodySchema,
} from '@/lib/validations/bookings'

/** GET /api/customers?restaurantId=&search= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getCustomersQuerySchema.safeParse({
      restaurantId: searchParams.get('restaurantId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
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

    const search = parsed.data.search?.trim()
    const rows = await prisma.customer.findMany({
      where: {
        restaurantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
    })

    const customers = rows.map(serializeCustomer)
    return NextResponse.json({ customers, meta: { count: customers.length } })
  } catch (error) {
    console.error('GET /api/customers error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/customers — crea o aggiorna (con id opzionale) */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postCustomerBodySchema.safeParse(body)
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

    const notes = encodeCustomerNotes({
      allergies: data.allergies,
      recurrences: data.recurrences,
      preferences: data.preferences,
      notes: data.notes,
    })

    if (data.id) {
      const updated = await prisma.customer.update({
        where: { id: data.id },
        data: {
          name: data.name,
          phone: data.phone ?? null,
          email: data.email ?? null,
          notes,
        },
      })
      return NextResponse.json({
        success: true,
        customer: serializeCustomer(updated),
      })
    }

    const created = await prisma.customer.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        notes,
      },
    })

    return NextResponse.json(
      { success: true, customer: serializeCustomer(created) },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/customers error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
