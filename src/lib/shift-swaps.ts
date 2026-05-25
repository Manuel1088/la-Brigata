import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { dateFromIso, decodeShiftTime } from '@/lib/shifts'
import {
  normalizeSwapStatus,
  type ShiftSwapStatus,
} from '@/lib/shift-swap-status'

export type { ShiftSwapStatus }
export { normalizeSwapStatus }

type DbClient = PrismaClient | Prisma.TransactionClient

export async function findShiftByUserDateAndTime(
  db: DbClient,
  restaurantId: string,
  userId: string,
  dateIso: string,
  timeLabel: string
) {
  const dayStart = dateFromIso(dateIso)
  const dayEnd = new Date(`${dateIso}T23:59:59.999`)
  const rows = await db.shift.findMany({
    where: {
      restaurantId,
      userId,
      date: { gte: dayStart, lte: dayEnd },
    },
  })
  return (
    rows.find(
      (r) => decodeShiftTime(r.status, r.startTime, r.endTime) === timeLabel
    ) ?? null
  )
}

const swapInclude = {
  requester: { select: { id: true, name: true, department: true } },
  target: { select: { id: true, name: true, department: true } },
} satisfies Prisma.ShiftSwapRequestInclude

type SwapRow = Prisma.ShiftSwapRequestGetPayload<{ include: typeof swapInclude }>

async function shiftTimeLabel(
  db: DbClient,
  shiftId: string | null | undefined
): Promise<string> {
  if (!shiftId) return '—'
  const shift = await db.shift.findUnique({ where: { id: shiftId } })
  if (!shift) return '—'
  return decodeShiftTime(shift.status, shift.startTime, shift.endTime)
}

export async function serializeShiftSwapRequest(
  row: SwapRow,
  db: DbClient = prisma
) {
  const [targetShiftTime, offeredShiftTime] = await Promise.all([
    shiftTimeLabel(db, row.targetShiftId),
    shiftTimeLabel(db, row.requesterShiftId),
  ])

  const targetDateIso = row.targetDate.toISOString().split('T')[0]
  const requesterDateIso = row.requesterDate.toISOString().split('T')[0]

  return {
    id: row.id,
    restaurantId: row.restaurantId,
    requesterId: row.requesterUserId,
    requesterName: row.requester.name,
    requesterDepartment: row.requester.department ?? 'sala',
    targetUserId: row.targetUserId,
    targetEmployeeName: row.target.name,
    targetDepartment: row.target.department ?? 'sala',
    requesterShiftId: row.requesterShiftId,
    targetShiftId: row.targetShiftId,
    dateISO: targetDateIso,
    requesterDate: requesterDateIso,
    targetDate: targetDateIso,
    dayIndex: 0,
    targetShiftTime,
    offeredShiftTime,
    status: normalizeSwapStatus(row.status),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function executeApprovedSwap(
  tx: Prisma.TransactionClient,
  swap: {
    id: string
    requesterShiftId: string | null
    targetShiftId: string | null
    requesterUserId: string
    targetUserId: string
  }
) {
  if (!swap.requesterShiftId || !swap.targetShiftId) {
    throw new Error('Turni non collegati alla richiesta di cambio')
  }

  const [requesterShift, targetShift] = await Promise.all([
    tx.shift.findUnique({ where: { id: swap.requesterShiftId } }),
    tx.shift.findUnique({ where: { id: swap.targetShiftId } }),
  ])

  if (!requesterShift || !targetShift) {
    throw new Error('Turni non trovati')
  }

  await tx.shift.update({
    where: { id: requesterShift.id },
    data: { userId: swap.targetUserId },
  })
  await tx.shift.update({
    where: { id: targetShift.id },
    data: { userId: swap.requesterUserId },
  })

  await tx.shiftSwapRequest.update({
    where: { id: swap.id },
    data: { status: 'APPROVED' },
  })
}
