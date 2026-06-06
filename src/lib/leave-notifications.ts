import type { LeaveType } from '@prisma/client'
import { LEAVE_TYPE_LABELS } from '@/lib/leave-types'
import { persistNotification } from '@/lib/notifications-db'

function formatLeaveDateIt(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function leaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPE_LABELS[type] ?? type
}

function isRolRequest(type: LeaveType): boolean {
  return type === 'ROL'
}

function buildManagerNewLeaveMessage(opts: {
  employeeName: string
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
}): string {
  const label = leaveTypeLabel(opts.type)
  if (isRolRequest(opts.type) && opts.requestedHours != null) {
    return `${opts.employeeName} ha richiesto ${opts.requestedHours} ore di ${label} il ${formatLeaveDateIt(opts.startDate)}`
  }
  const from = formatLeaveDateIt(opts.startDate)
  const to = formatLeaveDateIt(opts.endDate)
  return `${opts.employeeName} ha richiesto ${label} dal ${from} al ${to}`
}

function buildEmployeeApprovedMessage(opts: {
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
}): string {
  const label = leaveTypeLabel(opts.type)
  if (isRolRequest(opts.type) && opts.requestedHours != null) {
    return `La tua richiesta di ${opts.requestedHours} ore di ${label} il ${formatLeaveDateIt(opts.startDate)} è stata approvata`
  }
  const from = formatLeaveDateIt(opts.startDate)
  const to = formatLeaveDateIt(opts.endDate)
  return `La tua richiesta di ${label} dal ${from} al ${to} è stata approvata`
}

function buildEmployeeRejectedMessage(opts: {
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
  rejectionReason?: string | null
}): string {
  const label = leaveTypeLabel(opts.type)
  let base: string
  if (isRolRequest(opts.type) && opts.requestedHours != null) {
    base = `La tua richiesta di ${opts.requestedHours} ore di ${label} il ${formatLeaveDateIt(opts.startDate)} è stata rifiutata`
  } else {
    const from = formatLeaveDateIt(opts.startDate)
    const to = formatLeaveDateIt(opts.endDate)
    base = `La tua richiesta di ${label} dal ${from} al ${to} è stata rifiutata`
  }
  const reason = opts.rejectionReason?.trim()
  if (reason) return `${base}. Motivo: ${reason}`
  return base
}

/** Nuova richiesta → fan-out manager del ristorante (senza userId). */
export async function notifyManagersNewLeaveRequest(opts: {
  restaurantId: string
  leaveRequestId: string
  employeeName: string
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
}): Promise<void> {
  await persistNotification({
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Nuova richiesta di assenza',
    message: buildManagerNewLeaveMessage(opts),
    isUrgent: false,
    metadata: {
      leaveRequestId: opts.leaveRequestId,
      restaurantId: opts.restaurantId,
    },
  })
}

/** Approvazione → dipendente (userId esplicito). */
export async function notifyEmployeeLeaveApproved(opts: {
  userId: string
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
}): Promise<void> {
  await persistNotification({
    type: 'SUCCESS',
    category: 'LEAVES',
    title: 'Richiesta approvata',
    message: buildEmployeeApprovedMessage(opts),
    isUrgent: false,
    userId: opts.userId,
  })
}

/** Rifiuto → dipendente (userId esplicito). */
export async function notifyEmployeeLeaveRejected(opts: {
  userId: string
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
  rejectionReason?: string | null
}): Promise<void> {
  await persistNotification({
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Richiesta rifiutata',
    message: buildEmployeeRejectedMessage(opts),
    isUrgent: false,
    userId: opts.userId,
  })
}

function buildEmployeeRevokedMessage(opts: {
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
}): string {
  const label = leaveTypeLabel(opts.type)
  if (isRolRequest(opts.type) && opts.requestedHours != null) {
    return `La tua richiesta di ${opts.requestedHours} ore di ${label} il ${formatLeaveDateIt(opts.startDate)}, che era stata approvata, è stata revocata.`
  }
  const from = formatLeaveDateIt(opts.startDate)
  const to = formatLeaveDateIt(opts.endDate)
  return `La tua richiesta di ${label} dal ${from} al ${to}, che era stata approvata, è stata revocata.`
}

/** Revoca approvazione → dipendente (userId esplicito). */
export async function notifyEmployeeLeaveRevoked(opts: {
  userId: string
  type: LeaveType
  startDate: Date
  endDate: Date
  requestedHours: number | null
}): Promise<void> {
  await persistNotification({
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Richiesta revocata',
    message: buildEmployeeRevokedMessage(opts),
    isUrgent: false,
    userId: opts.userId,
  })
}
