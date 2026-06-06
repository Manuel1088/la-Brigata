import type { LeaveType, Prisma } from '@prisma/client'
import { leaveTypeToShiftCell, type LeaveTypeId } from '@/lib/leave-types'
import {
  dateFromIso,
  decodeShiftTime,
  eachDayIsoInRange,
  parseTimeToBounds,
  toDateOnlyIso,
} from '@/lib/shifts'

/** Allineato a shiftCompletion.normalizeDepartmentForApi */
export function normalizeDepartmentForShift(
  department: string | null | undefined
): string {
  const raw = (department ?? 'sala').trim().toLowerCase()
  if (raw === 'direzione' || raw === 'dirigenti') return 'sala'
  if (raw === 'bar') return 'beverage'
  const allowed = [
    'cucina',
    'pasticceria',
    'sala',
    'beverage',
    'accoglienza',
    'direzione',
  ] as const
  if ((allowed as readonly string[]).includes(raw)) return raw
  return 'sala'
}

function dayDateBounds(dateIso: string): { gte: Date; lte: Date } {
  return {
    gte: dateFromIso(dateIso),
    lte: new Date(`${dateIso}T23:59:59.999`),
  }
}

/**
 * Scrive l'assenza approvata su Shift per ogni giorno del range.
 * deleteMany solo su { userId, restaurantId, date } — mai l'intero ristorante.
 * Sovrascrive turni esistenti del dipendente in quel giorno (ferie → malattia, lavoro → ferie, ecc.).
 */
export async function persistApprovedLeaveOnShifts(
  tx: Prisma.TransactionClient,
  params: {
    userId: string
    restaurantId: string
    department: string | null | undefined
    startDate: Date
    endDate: Date
    leaveType: LeaveType
  }
): Promise<{ daysWritten: number }> {
  const { userId, restaurantId, department, startDate, endDate, leaveType } =
    params

  const shiftCell = leaveTypeToShiftCell(leaveType as LeaveTypeId)
  const dept = normalizeDepartmentForShift(department)
  const dayIsos = eachDayIsoInRange(
    toDateOnlyIso(startDate),
    toDateOnlyIso(endDate)
  )

  for (const dateIso of dayIsos) {
    const { gte, lte } = dayDateBounds(dateIso)

    await tx.shift.deleteMany({
      where: {
        userId,
        restaurantId,
        date: { gte, lte },
      },
    })

    const { startTime, endTime, status } = parseTimeToBounds(shiftCell, dateIso)

    await tx.shift.create({
      data: {
        userId,
        restaurantId,
        date: dateFromIso(dateIso),
        startTime,
        endTime,
        department: dept,
        status,
        shiftTemplateId: null,
        displayColor: null,
      },
    })
  }

  return { daysWritten: dayIsos.length }
}

/**
 * Rimuove le celle assenza scritte da persistApprovedLeaveOnShifts (variante B).
 * Cancella solo se decodeShiftTime corrisponde a leaveTypeToShiftCell(leaveType).
 */
export async function removeApprovedLeaveFromShifts(
  tx: Prisma.TransactionClient,
  params: {
    userId: string
    restaurantId: string
    startDate: Date
    endDate: Date
    leaveType: LeaveType
  }
): Promise<{ daysRemoved: number }> {
  const { userId, restaurantId, startDate, endDate, leaveType } = params
  const expectedCell = leaveTypeToShiftCell(leaveType as LeaveTypeId)
  const dayIsos = eachDayIsoInRange(
    toDateOnlyIso(startDate),
    toDateOnlyIso(endDate)
  )

  let daysRemoved = 0

  for (const dateIso of dayIsos) {
    const { gte, lte } = dayDateBounds(dateIso)
    const rows = await tx.shift.findMany({
      where: {
        userId,
        restaurantId,
        date: { gte, lte },
      },
    })

    for (const row of rows) {
      const cellTime = decodeShiftTime(row.status, row.startTime, row.endTime)
      if (cellTime !== expectedCell) continue
      await tx.shift.delete({ where: { id: row.id } })
      daysRemoved++
    }
  }

  return { daysRemoved }
}
