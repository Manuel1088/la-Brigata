import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { dateFromIso } from '@/lib/shifts'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  bookingTimeFromParts,
  resolveTableId,
  serializeBooking,
  upsertCustomerForBooking,
} from '@/lib/bookings-db'
import { patchBookingBodySchema } from '@/lib/validations/bookings'

const bookingInclude = { customer: true, table: true } as const

/** PATCH /api/bookings/[id] */
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
    const parsed = patchBookingBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await prisma.booking.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(
      session.user.id,
      existing.restaurantId
    )
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const data = parsed.data
    const dateIso =
      data.date ?? existing.date.toISOString().split('T')[0]
    const timeStr = data.time ?? existing.time.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    let customerId = existing.customerId
    if (data.customerName || data.customerPhone) {
      const customer = await upsertCustomerForBooking({
        restaurantId: existing.restaurantId,
        name: data.customerName ?? existing.customerName,
        phone: data.customerPhone ?? existing.customerPhone ?? '',
        email: data.customerEmail,
        notes: data.notes,
        visitDate: bookingTimeFromParts(dateIso, timeStr),
        partySize: data.partySize ?? existing.partySize,
      })
      customerId = customer.id
    }

    const tableId =
      data.tableId !== undefined || data.tableNumber !== undefined
        ? await resolveTableId(
            existing.restaurantId,
            data.tableNumber ?? existing.tableNumber,
            data.tableId ?? existing.tableId
          )
        : existing.tableId

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(data.customerName ? { customerName: data.customerName } : {}),
        ...(data.customerPhone !== undefined
          ? { customerPhone: data.customerPhone }
          : {}),
        customerId,
        ...(data.date ? { date: dateFromIso(data.date) } : {}),
        ...(data.time ? { time: bookingTimeFromParts(dateIso, data.time) } : {}),
        ...(data.partySize !== undefined ? { partySize: data.partySize } : {}),
        ...(data.tableNumber !== undefined ? { tableNumber: data.tableNumber } : {}),
        tableId,
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: bookingInclude,
    })

    return NextResponse.json({
      success: true,
      booking: serializeBooking(updated),
    })
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/bookings/[id] */
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
    const existing = await prisma.booking.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(
      session.user.id,
      existing.restaurantId
    )
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    await prisma.booking.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
