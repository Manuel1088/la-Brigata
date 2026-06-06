import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { removeApprovedLeaveFromShifts } from '@/lib/apply-approved-leave-to-shifts'
import { prisma } from '@/lib/db'
import { notifyEmployeeLeaveRevoked } from '@/lib/leave-notifications'
import {
  isLeaveApprover,
  revertApprovedLeaveFromBalance,
  serializeLeaveRequest,
} from '@/lib/leaves'
import { dateFromIso, eachDayIsoInRange, toDateOnlyIso } from '@/lib/shifts'
import { recalculateDistributionsForDay } from '@/lib/tips'
import { revokeLeaveBodySchema } from '@/lib/validations/leaves'

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

/** POST /api/leaves/[id]/revoke — revoca richiesta APPROVED (manager) */
export async function POST(
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

    if (existing.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Solo le richieste approvate possono essere revocate' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = revokeLeaveBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const now = new Date()
    const revokerId = session.user.id
    const restaurantId = existing.user.restaurantId!

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedBy: revokerId,
          revokedAt: now,
        },
        include: {
          user: { select: { name: true, department: true } },
        },
      })

      await tx.leaveApproval.create({
        data: {
          id: crypto.randomUUID(),
          requestId: id,
          approverId: revokerId,
          status: 'REVOKED',
          comment: parsed.data.reason?.trim() ?? null,
          approvedAt: null,
        },
      })

      await revertApprovedLeaveFromBalance(
        tx,
        row.userId,
        row.type,
        row.startDate,
        row.endDate,
        row.requestedHours != null ? Number(row.requestedHours) : null
      )

      await removeApprovedLeaveFromShifts(tx, {
        userId: row.userId,
        restaurantId,
        startDate: row.startDate,
        endDate: row.endDate,
        leaveType: row.type,
      })

      return row
    })

    const rangeFrom = toDateOnlyIso(updated.startDate)
    const rangeTo = toDateOnlyIso(updated.endDate)
    const rangeStart = dateFromIso(rangeFrom)
    const rangeEnd = new Date(`${rangeTo}T23:59:59.999`)

    const tipEntriesInRange = await prisma.tipEntry.findMany({
      where: {
        restaurantId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true },
    })
    const daysWithTips = new Set(
      tipEntriesInRange.map((e) => toDateOnlyIso(e.date))
    )

    for (const dateIso of eachDayIsoInRange(rangeFrom, rangeTo)) {
      if (!daysWithTips.has(dateIso)) continue
      try {
        await recalculateDistributionsForDay(prisma, restaurantId, dateIso)
      } catch (recalcErr) {
        console.error(
          `Ricalcolo mance fallito ${restaurantId} ${dateIso} (revoke ${id}):`,
          recalcErr
        )
      }
    }

    try {
      await notifyEmployeeLeaveRevoked({
        userId: existing.user.id,
        type: updated.type,
        startDate: updated.startDate,
        endDate: updated.endDate,
        requestedHours:
          updated.requestedHours != null ? Number(updated.requestedHours) : null,
      })
    } catch (notifErr) {
      console.error(`[leaves] Notifica revoca fallita per richiesta ${id}:`, notifErr)
    }

    return NextResponse.json({
      success: true,
      request: serializeLeaveRequest(updated),
    })
  } catch (error) {
    console.error('POST /api/leaves/[id]/revoke error:', error)
    const message =
      error instanceof Error ? error.message : 'Errore interno del server'
    return NextResponse.json(
      { error: `Operazione non completata: ${message}` },
      { status: 500 }
    )
  }
}
