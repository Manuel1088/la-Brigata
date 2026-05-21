import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  decodeCustomerNotes,
  encodeCustomerNotes,
  serializeCustomer,
} from '@/lib/bookings-db'
import { patchCustomerBodySchema } from '@/lib/validations/bookings'

/** PATCH /api/customers/[id] */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const parsed = patchCustomerBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(
      session.user.id,
      existing.restaurantId
    )
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const data = parsed.data
    const prev = decodeCustomerNotes(existing.notes)
    const notes = encodeCustomerNotes({
      allergies: data.allergies ?? prev.allergies,
      recurrences: data.recurrences ?? prev.recurrences,
      preferences: data.preferences ?? prev.preferences,
      notes: data.notes ?? prev.notes,
    })

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        notes,
      },
    })

    return NextResponse.json({
      success: true,
      customer: serializeCustomer(updated),
    })
  } catch (error) {
    console.error('PATCH /api/customers/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/customers/[id] */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await context.params
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(
      session.user.id,
      existing.restaurantId
    )
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/customers/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
