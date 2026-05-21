import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { PaymentType } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { logDelete, logUpdate } from '@/lib/audit'
import { recalculateDistributionsForDay } from '@/lib/tips'
import { userCanDeleteTips, userCanEditTips } from '@/lib/tipAccess'
import { patchTipEntrySchema } from '@/lib/validations/tips'
import { assertRestaurantAccess } from '@/lib/restaurantLocations'
import { toDateOnlyIso } from '@/lib/shifts'

function paymentTypeToUi(type: PaymentType): 'cash' | 'card' | 'foreign' {
  if (type === 'CASH') return 'cash'
  if (type === 'CARD') return 'card'
  return 'foreign'
}

async function getTipEntryOr404(id: string) {
  return prisma.tipEntry.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      date: true,
      location: true,
      locationId: true,
      type: true,
      amount: true,
      notes: true,
    },
  })
}

/** PATCH /api/tips/[id] — aggiorna importo TipEntry */
export async function PATCH(
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
    const parsed = patchTipEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const entry = await getTipEntryOr404(id)
    if (!entry) {
      return NextResponse.json({ error: 'Inserimento non trovato' }, { status: 404 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    const role = String(dbUser?.role ?? '')

    if (!(await assertRestaurantAccess(prisma, session.user.id, entry.restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    if (
      !(await userCanEditTips(prisma, session.user.id, role, entry.restaurantId))
    ) {
      return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
    }

    const previousAmount = Number(entry.amount)
    const dateIso = toDateOnlyIso(entry.date)

    const updated = await prisma.tipEntry.update({
      where: { id },
      data: {
        amount: parsed.data.amount,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        date: true,
        location: true,
        locationId: true,
        type: true,
        amount: true,
        notes: true,
      },
    })

    const distributionResult = await recalculateDistributionsForDay(
      prisma,
      entry.restaurantId,
      dateIso
    )

    await logUpdate(session.user.id, 'tips', id, {
      action: 'tip_entry_amount_updated',
      date: dateIso,
      location: entry.location,
      type: entry.type,
      previousAmount,
      newAmount: parsed.data.amount,
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: updated.id,
        date: dateIso,
        location: updated.location,
        locationId: updated.locationId,
        type: paymentTypeToUi(updated.type),
        amount: Number(updated.amount),
        notes: updated.notes,
      },
      totals: distributionResult.totals,
      distributions: distributionResult.distributions,
      warning: distributionResult.warning,
    })
  } catch (error) {
    console.error('PATCH /api/tips/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/tips/[id] — elimina TipEntry */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await params
    const entry = await getTipEntryOr404(id)
    if (!entry) {
      return NextResponse.json({ error: 'Inserimento non trovato' }, { status: 404 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    const role = String(dbUser?.role ?? '')

    if (!(await assertRestaurantAccess(prisma, session.user.id, entry.restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    if (
      !(await userCanDeleteTips(prisma, session.user.id, role, entry.restaurantId))
    ) {
      return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
    }

    const dateIso = toDateOnlyIso(entry.date)
    const snapshot = {
      date: dateIso,
      location: entry.location,
      locationId: entry.locationId,
      type: entry.type,
      amount: Number(entry.amount),
      notes: entry.notes,
    }

    await prisma.tipEntry.delete({ where: { id } })

    const distributionResult = await recalculateDistributionsForDay(
      prisma,
      entry.restaurantId,
      dateIso
    )

    await logDelete(session.user.id, 'tips', id, {
      action: 'tip_entry_deleted',
      ...snapshot,
    })

    return NextResponse.json({
      success: true,
      deletedId: id,
      date: dateIso,
      totals: distributionResult.totals,
      distributions: distributionResult.distributions,
      warning: distributionResult.warning,
    })
  } catch (error) {
    console.error('DELETE /api/tips/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
