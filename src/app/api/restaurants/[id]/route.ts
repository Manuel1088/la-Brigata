import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'
import { assertRestaurantAccess } from '@/lib/restaurant-access'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, phone } = body

    if (!id) {
      return NextResponse.json({ error: 'ID ristorante richiesto' }, { status: 400 })
    }

    const allowed = await assertRestaurantAccess(session.user.id, id, true)
    if (!allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone })
      }
    })

    return NextResponse.json({
      success: true,
      restaurant: updatedRestaurant,
      message: 'Ristorante aggiornato con successo'
    })
  } catch (error) {
    console.error('PUT /api/restaurants/[id] error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }
}

