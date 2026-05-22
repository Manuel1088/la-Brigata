import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { CCNLLevel } from '@/lib/ccnl'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  executeApprovedSwap,
  normalizeSwapStatus,
  serializeShiftSwapRequest,
} from '@/lib/shift-swaps'
import { patchShiftSwapBodySchema } from '@/lib/validations/shift-swap'

const swapInclude = {
  requester: { select: { id: true, name: true, department: true } },
  target: { select: { id: true, name: true, department: true } },
} as const

/** PATCH /api/shifts/swap/[id] — approva o rifiuta (CCNL >= LIVELLO_2) */
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
    const parsed = patchShiftSwapBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: swapInclude,
    })

    if (!swap) {
      return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
    }

    const access = await resolveRestaurantAccess(session.user.id, swap.restaurantId)
    const approver = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ccnlLevel: true, role: true },
    })
    const canApprove =
      access.allowed &&
      approver &&
      (String(approver.role).toUpperCase() === 'ADMIN' ||
        ccnlMeetsMinimum(approver.ccnlLevel, CCNLLevel.LIVELLO_2))
    if (!canApprove) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    if (normalizeSwapStatus(swap.status) !== 'PENDING') {
      return NextResponse.json(
        { error: 'La richiesta non è più in attesa' },
        { status: 409 }
      )
    }

    if (parsed.data.status === 'REJECTED') {
      const updated = await prisma.shiftSwapRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: parsed.data.notes ?? swap.notes,
        },
        include: swapInclude,
      })
      const serialized = await serializeShiftSwapRequest(updated)
      return NextResponse.json({ success: true, swap: serialized })
    }

    await prisma.$transaction(async (tx) => {
      await executeApprovedSwap(tx, {
        id: swap.id,
        requesterShiftId: swap.requesterShiftId,
        targetShiftId: swap.targetShiftId,
        requesterUserId: swap.requesterUserId,
        targetUserId: swap.targetUserId,
      })
    })

    const updated = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: swapInclude,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
    }

    const serialized = await serializeShiftSwapRequest(updated)
    return NextResponse.json({ success: true, swap: serialized })
  } catch (error) {
    console.error('PATCH /api/shifts/swap/[id] error:', error)
    const message =
      error instanceof Error ? error.message : 'Errore interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
