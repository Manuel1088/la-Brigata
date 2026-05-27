import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { updateLocationSchema } from '@/lib/validations/locations'
import {
  requireManageCompanySession,
  requireRestaurantManageAccess,
  serializeLocation,
} from '@/lib/restaurant-location-api'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const auth = await requireManageCompanySession()
    if (!auth.ok) return auth.response

    const { id: restaurantId, locationId } = await params
    if (!restaurantId || !locationId) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const allowed = await requireRestaurantManageAccess(auth.session.user!.id!, restaurantId)
    if (!allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const existing = await prisma.restaurantLocation.findFirst({
      where: { id: locationId, restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Sala non trovata' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateLocationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data: Prisma.RestaurantLocationUpdateInput = {}
    const input = parsed.data

    if (input.name !== undefined) data.name = input.name.trim()
    if (input.outletName !== undefined) data.outletName = input.outletName.trim()
    if (input.type !== undefined) data.type = input.type
    if (input.capacity !== undefined) data.capacity = input.capacity
    if (input.tables !== undefined) data.tables = input.tables
    if (input.icon !== undefined) data.icon = input.icon?.trim() || '🍽️'
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
    if (input.address !== undefined) data.address = input.address?.trim() || null
    if (input.openingHours !== undefined) {
      data.openingHours = input.openingHours as Prisma.InputJsonValue
    }

    const updated = await prisma.restaurantLocation.update({
      where: { id: locationId },
      data,
    })

    return NextResponse.json({
      success: true,
      location: serializeLocation(updated),
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
    console.error('PATCH /api/restaurants/[id]/locations/[locationId] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const auth = await requireManageCompanySession()
    if (!auth.ok) return auth.response

    const { id: restaurantId, locationId } = await params
    if (!restaurantId || !locationId) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const allowed = await requireRestaurantManageAccess(auth.session.user!.id!, restaurantId)
    if (!allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const existing = await prisma.restaurantLocation.findFirst({
      where: { id: locationId, restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Sala non trovata' }, { status: 404 })
    }

    const tipCount = await prisma.tipEntry.count({
      where: { locationId },
    })

    if (tipCount > 0) {
      const updated = await prisma.restaurantLocation.update({
        where: { id: locationId },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        softDeleted: true,
        message:
          'La sala ha storico mance: è stata disattivata invece di essere eliminata.',
        location: serializeLocation(updated),
      })
    }

    await prisma.restaurantLocation.delete({
      where: { id: locationId },
    })

    return NextResponse.json({
      success: true,
      deleted: true,
      id: locationId,
    })
  } catch (error) {
    console.error('DELETE /api/restaurants/[id]/locations/[locationId] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
