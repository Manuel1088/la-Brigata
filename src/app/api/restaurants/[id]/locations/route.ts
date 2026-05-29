import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { createLocationSchema } from '@/lib/validations/locations'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  buildLocationCreateData,
  nextSortOrder,
  requireManageCompanySession,
  requireRestaurantManageAccess,
  serializeLocation,
} from '@/lib/restaurant-location-api'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params
    if (!restaurantId) {
      return NextResponse.json({ error: 'ID ristorante richiesto' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Lettura consentita a chiunque abbia accesso al ristorante (es. staff con
    // bookings_view), non solo ai manager azienda. La scrittura (POST) resta gestita.
    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      const auth = await requireManageCompanySession()
      if (!auth.ok) return auth.response
      const allowed = await requireRestaurantManageAccess(
        auth.session.user!.id!,
        restaurantId
      )
      if (!allowed) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
      }
    }

    const rows = await prisma.restaurantLocation.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { outletName: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      locations: rows.map(serializeLocation),
    })
  } catch (error) {
    console.error('GET /api/restaurants/[id]/locations error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManageCompanySession()
    if (!auth.ok) return auth.response

    const { id: restaurantId } = await params
    if (!restaurantId) {
      return NextResponse.json({ error: 'ID ristorante richiesto' }, { status: 400 })
    }

    const allowed = await requireRestaurantManageAccess(auth.session.user!.id!, restaurantId)
    if (!allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createLocationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 })
    }

    const sortOrder =
      parsed.data.sortOrder ?? (await nextSortOrder(restaurantId))

    const created = await prisma.restaurantLocation.create({
      data: buildLocationCreateData(restaurantId, parsed.data, sortOrder),
    })

    return NextResponse.json({
      success: true,
      location: serializeLocation(created),
    })
  } catch (error) {
    const prismaCode =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : null
    if (prismaCode === 'P2002') {
      return NextResponse.json(
        { error: 'Esiste già una sala con questo nome per il ristorante' },
        { status: 409 }
      )
    }
    console.error('POST /api/restaurants/[id]/locations error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
