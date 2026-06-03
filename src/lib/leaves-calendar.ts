/** Client: ferie approvate per calendario turni (GET /api/leaves). */

import { getLeaveTypeDefinition, leaveTypeToShiftCell } from '@/lib/leave-types'
import { dateFromIso, type ShiftGridCell } from '@/lib/shifts'

export type ApprovedLeaveRow = {
  userId: string
  startDate: string
  endDate: string
  status: string
  /** LeaveType da GET /api/leaves → serializeLeaveRequest */
  type: string
}

function shiftCellForApprovedLeave(leaveType: string): string {
  const def = getLeaveTypeDefinition(leaveType)
  if (!def) {
    console.warn(
      `[leaves-calendar] Tipo assenza sconosciuto "${leaveType}", overlay con FERIE`
    )
    return 'FERIE'
  }
  return leaveTypeToShiftCell(def.id)
}

export async function fetchApprovedLeavesForMonths(
  months: Array<{ year: number; month: number }>
): Promise<ApprovedLeaveRow[]> {
  const seen = new Set<string>()
  const rows: ApprovedLeaveRow[] = []

  for (const { year, month } of months) {
    const params = new URLSearchParams({
      status: 'APPROVED',
      year: String(year),
      month: String(month),
      includeBalances: 'false',
    })
    const res = await fetch(`/api/leaves?${params}`, { credentials: 'include' })
    if (!res.ok) continue
    const data = (await res.json()) as { requests?: ApprovedLeaveRow[] }
    for (const req of data.requests ?? []) {
      if (req.status !== 'APPROVED') continue
      const key = `${req.userId}:${req.startDate}:${req.endDate}:${req.type}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push(req)
    }
  }

  return rows
}

export function monthsInDateRange(start: Date, end: Date): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

/** Sovrappone assenze approvate sulla griglia (stessa cella di persistApprovedLeaveOnShifts). */
export function applyApprovedLeavesToShiftGrid(
  grid: Record<string, ShiftGridCell>,
  leaves: ApprovedLeaveRow[],
  weekDates: Date[],
  nameByUserId: Map<string, string>
): Record<string, ShiftGridCell> {
  const next = { ...grid }
  for (const leave of leaves) {
    const name = nameByUserId.get(leave.userId)
    if (!name) continue
    const cellTime = shiftCellForApprovedLeave(leave.type)
    const start = dateFromIso(leave.startDate)
    const end = dateFromIso(leave.endDate)
    weekDates.forEach((date, dayIndex) => {
      const day = new Date(date)
      day.setHours(12, 0, 0, 0)
      if (day < start || day > end) return
      const key = `${name}-${dayIndex}`
      next[key] = {
        employee: name,
        time: cellTime,
        department: next[key]?.department ?? 'sala',
        role: next[key]?.role,
      }
    })
  }
  return next
}
