import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, address, phone } = body

    if (!id) {
      return NextResponse.json({ error: 'ID ristorante richiesto' }, { status: 400 })
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

