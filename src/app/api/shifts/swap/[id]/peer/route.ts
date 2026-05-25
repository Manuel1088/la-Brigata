import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import { serializeShiftSwapRequest } from '@/lib/shift-swaps'
import {
  notifySwapAcceptedByPeer,
  notifySwapRejectedByPeer,
} from '@/lib/shift-swap-notifications'
import { peerShiftSwapBodySchema } from '@/lib/validations/shift-swap'

const swapInclude = {
  requester: { select: { id: true, name: true, department: true } },
  target: { select: { id: true, name: true, department: true } },
} as const

/** PATCH /api/shifts/swap/[id]/peer — il collega accetta o rifiuta (PEER_PENDING → PENDING | REJECTED) */
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
    const parsed = peerShiftSwapBodySchema.safeParse(body)

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

    if (swap.targetUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo il collega destinatario può rispondere a questa richiesta' },
        { status: 403 }
      )
    }

    const access = await resolveRestaurantAccess(session.user.id, swap.restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    if (swap.status !== 'PEER_PENDING') {
      return NextResponse.json(
        { error: 'La richiesta non è in attesa della tua risposta' },
        { status: 409 }
      )
    }

    const dateIso = swap.targetDate.toISOString().split('T')[0]

    if (parsed.data.action === 'reject') {
      const updated = await prisma.shiftSwapRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: parsed.data.notes ?? swap.notes,
        },
        include: swapInclude,
      })

      try {
        await notifySwapRejectedByPeer({
          requesterUserId: swap.requesterUserId,
          targetName: swap.target.name,
          dateIso,
          swapId: swap.id,
        })
      } catch (notifyErr) {
        console.error('Notifica rifiuto peer:', notifyErr)
      }

      const serialized = await serializeShiftSwapRequest(updated)
      return NextResponse.json({ success: true, swap: serialized })
    }

    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: {
        status: 'PENDING',
        notes: parsed.data.notes ?? swap.notes,
      },
      include: swapInclude,
    })

    try {
      await notifySwapAcceptedByPeer({
        requesterUserId: swap.requesterUserId,
        targetName: swap.target.name,
        dateIso,
      })
    } catch (notifyErr) {
      console.error('Notifica accettazione peer:', notifyErr)
    }

    const serialized = await serializeShiftSwapRequest(updated)
    return NextResponse.json({ success: true, swap: serialized })
  } catch (error) {
    console.error('PATCH /api/shifts/swap/[id]/peer error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
