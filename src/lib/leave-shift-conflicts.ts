import { LEAVE_TYPE_LABELS } from '@/lib/leave-types'
import { isWorkShiftTime, toDateOnlyIso } from '@/lib/shifts'

export type WorkShiftAssignmentInput = {
  userId: string
  date: string
  time: string
}

export type ApprovedLeaveForConflict = {
  userId: string
  startDate: Date | string
  endDate: Date | string
  type: string
  user: { name: string }
}

export type LeaveShiftConflict = {
  userId: string
  userName: string
  date: string
  leaveType: string
  leaveLabel: string
  leaveStartDate: string
  leaveEndDate: string
}

function toIsoDate(value: Date | string): string {
  return typeof value === 'string' ? value.slice(0, 10) : toDateOnlyIso(value)
}

function dateInInclusiveRange(dateIso: string, start: Date | string, end: Date | string): boolean {
  const startIso = toIsoDate(start)
  const endIso = toIsoDate(end)
  return dateIso >= startIso && dateIso <= endIso
}

function leaveLabelFor(type: string): string {
  return LEAVE_TYPE_LABELS[type] ?? type
}

/**
 * Conflitti lavoro vs richieste APPROVED: solo assignment con isWorkShiftTime.
 * Assenze (RIPOSO, FERIE, RO, …) non generano conflitti.
 */
export function findWorkShiftApprovedLeaveConflicts(
  assignments: WorkShiftAssignmentInput[],
  approvedLeaves: ApprovedLeaveForConflict[]
): LeaveShiftConflict[] {
  const conflicts: LeaveShiftConflict[] = []
  const seen = new Set<string>()

  for (const assignment of assignments) {
    if (!isWorkShiftTime(assignment.time)) continue

    const matchingLeave = approvedLeaves.find(
      (leave) =>
        leave.userId === assignment.userId &&
        dateInInclusiveRange(assignment.date, leave.startDate, leave.endDate)
    )
    if (!matchingLeave) continue

    const dedupeKey = `${assignment.userId}:${assignment.date}:${matchingLeave.type}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    conflicts.push({
      userId: assignment.userId,
      userName: matchingLeave.user.name,
      date: assignment.date,
      leaveType: matchingLeave.type,
      leaveLabel: leaveLabelFor(matchingLeave.type),
      leaveStartDate: toIsoDate(matchingLeave.startDate),
      leaveEndDate: toIsoDate(matchingLeave.endDate),
    })
  }

  return conflicts
}

function formatItalianDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Messaggio 409 azionabile per il manager (primo conflitto + conteggio se multipli). */
export function formatLeaveShiftConflictError(conflicts: LeaveShiftConflict[]): string {
  if (conflicts.length === 0) {
    return 'Impossibile salvare: conflitto con richieste di assenza approvate.'
  }

  const c = conflicts[0]
  const range =
    c.leaveStartDate === c.leaveEndDate
      ? `il ${formatItalianDate(c.leaveStartDate)}`
      : `dal ${formatItalianDate(c.leaveStartDate)} al ${formatItalianDate(c.leaveEndDate)}`

  let message = `Impossibile salvare: ${c.userName} ha una richiesta di ${c.leaveLabel} approvata ${range}. Revoca la richiesta prima di assegnare un turno di lavoro.`

  if (conflicts.length > 1) {
    message += ` (${conflicts.length} conflitti totali)`
  }

  return message
}
