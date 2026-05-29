import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import { dateFromIso } from '@/lib/shifts'
import { bookingTimeFromParts, formatBookingTime } from '@/lib/bookings-db'
import { patchWalkinBodySchema } from '@/lib/validations/walkins'

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

/** PATCH /api/walkins/[id] */
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
    const parsed = patchWalkinBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await prisma.walkin.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Passante non trovato' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(
      session.user.id,
      existing.restaurantId
    )
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const data = parsed.data
    const dateIso = data.date ?? existing.date.toISOString().split('T')[0]

    let time = existing.time
    if (data.time !== undefined) {
      time = data.time ? bookingTimeFromParts(dateIso, data.time) : null
    } else if (data.date && existing.time) {
      time = bookingTimeFromParts(dateIso, formatBookingTime(existing.time))
    }

    const updated = await prisma.walkin.update({
      where: { id },
      data: {
        ...(data.date ? { date: dateFromIso(data.date) } : {}),
        ...(data.time !== undefined || data.date ? { time } : {}),
        ...(data.covers !== undefined ? { covers: data.covers } : {}),
        ...(data.area !== undefined ? { area: data.area ?? null } : {}),
        ...(data.tableNumber !== undefined
          ? { tableNumber: data.tableNumber ?? null }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
      },
    })

    return NextResponse.json({ success: true, walkin: serializeWalkin(updated) })
  } catch (error) {
    console.error('PATCH /api/walkins/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/walkins/[id] */
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
    const existing = await prisma.walkin.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Passante non trovato' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(
      session.user.id,
      existing.restaurantId
    )
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    await prisma.walkin.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/walkins/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
