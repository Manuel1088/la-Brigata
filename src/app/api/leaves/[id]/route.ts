import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  applyApprovedLeaveToBalance,
  isLeaveApprover,
  serializeLeaveRequest,
} from '@/lib/leaves'
import { patchLeaveBodySchema } from '@/lib/validations/leaves'

async function loadRequest(id: string) {
  return prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, department: true, restaurantId: true },
      },
    },
  })
}

/** PATCH /api/leaves/[id] — approva o rifiuta (ADMIN / MANAGER) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, restaurantId: true },
    })

    if (!dbUser?.restaurantId || !isLeaveApprover(String(dbUser.role))) {
      return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
    }

    const { id } = await params
    const existing = await loadRequest(id)
    if (!existing) {
      return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
    }

    if (existing.user.restaurantId !== dbUser.restaurantId) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo le richieste in attesa possono essere approvate o rifiutate' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = patchLeaveBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { status, rejectionReason } = parsed.data

    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: 'Motivo del rifiuto richiesto' },
        { status: 400 }
      )
    }

    const now = new Date()
    const approverId = session.user.id

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.leaveRequest.update({
        where: { id },
        data:
          status === 'APPROVED'
            ? {
                status: 'APPROVED',
                approvedBy: approverId,
                approvedAt: now,
                rejectedBy: null,
                rejectedAt: null,
                rejectionReason: null,
              }
            : {
                status: 'REJECTED',
                rejectedBy: approverId,
                rejectedAt: now,
                rejectionReason: rejectionReason!.trim(),
                approvedBy: null,
                approvedAt: null,
              },
        include: {
          user: { select: { name: true, department: true } },
        },
      })

      await tx.leaveApproval.create({
        data: {
          id: crypto.randomUUID(),
          requestId: id,
          approverId,
          status,
          comment: rejectionReason?.trim() ?? null,
          approvedAt: status === 'APPROVED' ? now : null,
        },
      })

      return row
    })

    if (status === 'APPROVED') {
      await applyApprovedLeaveToBalance(
        prisma,
        updated.userId,
        updated.type,
        updated.startDate,
        updated.endDate
      )
    }

    return NextResponse.json({
      success: true,
      request: serializeLeaveRequest(updated),
    })
  } catch (error) {
    console.error('PATCH /api/leaves/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/leaves/[id] — cancella (solo autore, stato PENDING) */
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
    const existing = await loadRequest(id)
    if (!existing) {
      return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo le richieste in attesa possono essere annullate' },
        { status: 400 }
      )
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/leaves/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
