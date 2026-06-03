/** Utilities for shift scheduling API and calendar grid mapping */

export type ShiftTimeLabel = string // e.g. "06:00-14:00", "RIPOSO", "FERIE"

export interface ShiftGridCell {
  employee: string
  time?: string
  department?: string
  role?: string
}

export interface ShiftApiRecord {
  id: string
  userId: string
  userName: string
  date: string
  department: string
  time: string
  status: string
  startTime: string
  endTime: string
}

const DISPLAY_PREFIX = 'display:'

/** Parse YYYY-MM-DD as local noon to avoid UTC day rollback (e.g. Italy UTC+2) */
export function dateFromIso(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

/** Encode calendar time label into DB status field */
export function encodeShiftStatus(time: ShiftTimeLabel): string {
  if (time === 'RIPOSO') return 'rest'
  if (time === 'FERIE') return 'leave'
  return `${DISPLAY_PREFIX}${time}`
}

/** Decode DB status back to calendar time label */
export function decodeShiftTime(status: string, startTime: Date, endTime: Date): ShiftTimeLabel {
  if (status === 'rest') return 'RIPOSO'
  if (status === 'leave') return 'FERIE'
  if (status.startsWith(DISPLAY_PREFIX)) return status.slice(DISPLAY_PREFIX.length)
  const fmt = (d: Date) =>
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fmt(startTime)}-${fmt(endTime)}`
}

/** Etichetta turno per hub /me e dashboard (stesso formato di /me). */
export function shiftHubLabel(shift: {
  time: string
  department: string
  status: string
} | null): { title: string; subtitle: string; tone: 'work' | 'rest' | 'leave' } {
  if (!shift) {
    return { title: 'Riposo', subtitle: 'Nessun turno assegnato', tone: 'rest' }
  }
  if (shift.time === 'RIPOSO' || shift.status === 'rest') {
    return { title: 'Riposo', subtitle: 'Giorno libero', tone: 'rest' }
  }
  if (shift.time === 'FERIE' || shift.status === 'leave') {
    return { title: 'Ferie', subtitle: 'Assenza programmata', tone: 'leave' }
  }
  const dept = shift.department || 'sala'
  return {
    title: shift.time,
    subtitle: dept.charAt(0).toUpperCase() + dept.slice(1),
    tone: 'work',
  }
}

export function isPresentShift(status: string, startTime: Date, endTime: Date): boolean {
  const time = decodeShiftTime(status, startTime, endTime)
  return time !== 'RIPOSO' && time !== 'FERIE'
}

/** Segmento orario turno lavorativo (es. "06:00-14:00", anche in turni spezzati). */
const SHIFT_TIME_SEGMENT_RE = /^(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})$/

/** True se l'etichetta decodificata è un turno con orario (non RIPOSO/FERIE/MALATTIA ecc.). */
export function isWorkShiftTime(time: string): boolean {
  if (!time) return false
  const segments = time.split('/').map((s) => s.trim())
  return segments.some((segment) => SHIFT_TIME_SEGMENT_RE.test(segment))
}

/** Durata in ore da etichetta turno (es. "17:00-01:00", anche oltre mezzanotte e spezzati) */
export function hoursFromShiftTimeLabel(time: string): number {
  if (time === 'RIPOSO' || time === 'FERIE') return 0

  const segments = time.split('/').map((s) => s.trim())
  let totalMinutes = 0

  for (const segment of segments) {
    const match = segment.match(SHIFT_TIME_SEGMENT_RE)
    if (!match) continue

    const sh = Number(match[1])
    const sm = Number(match[2])
    const eh = Number(match[3])
    const em = Number(match[4])
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) continue

    const startMinutes = sh * 60 + sm
    let endMinutes = eh * 60 + em
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }
    totalMinutes += endMinutes - startMinutes
  }

  return Math.round((totalMinutes / 60) * 10) / 10
}

/** Parse "HH:mm-HH:mm" (first segment if spezzato) into Date bounds on a given day */
export function parseTimeToBounds(
  time: ShiftTimeLabel,
  dateIso: string
): { startTime: Date; endTime: Date; status: string } {
  const base = dateFromIso(dateIso)
  if (time === 'RIPOSO') {
    return { startTime: base, endTime: base, status: 'rest' }
  }
  if (time === 'FERIE') {
    return { startTime: base, endTime: base, status: 'leave' }
  }

  const segment = time.split('/')[0].trim()
  const match = segment.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
  if (!match) {
    return {
      startTime: base,
      endTime: base,
      status: encodeShiftStatus(time),
    }
  }

  const [, startStr, endStr] = match
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  const startTime = new Date(base)
  startTime.setHours(sh, sm, 0, 0)
  const endTime = new Date(base)
  endTime.setHours(eh, em, 0, 0)
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1)
  }

  return {
    startTime,
    endTime,
    status: encodeShiftStatus(time),
  }
}

export function getMonday(date: Date): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

/** Match ShiftsCalendar getWeekDates range */
export function getDateRange(anchor: Date, numDays: number): { from: Date; to: Date; dates: Date[] } {
  const start = getMonday(anchor)

  if (numDays > 14) {
    const year = anchor.getFullYear()
    const month = anchor.getMonth()
    numDays = new Date(year, month + 1, 0).getDate()
    start.setFullYear(year, month, 1)
  }

  const dates: Date[] = []
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }

  const to = new Date(dates[dates.length - 1])
  to.setHours(23, 59, 59, 999)

  return { from: start, to, dates }
}

export function toDateOnlyIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type ShiftCalendarEmployee = { id: string; name: string }

export function shiftCellKey(employeeName: string, dayIndex: number): string {
  return `${employeeName}-${dayIndex}`
}

export function findShiftCalendarEmployee(
  employees: ShiftCalendarEmployee[],
  opts: { userId?: string; name?: string }
): ShiftCalendarEmployee | undefined {
  if (opts.userId) {
    const byId = employees.find((e) => e.id === opts.userId)
    if (byId) return byId
  }
  if (opts.name) {
    return employees.find((e) => e.name === opts.name)
  }
  return undefined
}

export function getShiftAtDay(
  grid: Record<string, ShiftGridCell>,
  employees: ShiftCalendarEmployee[],
  dayIndex: number,
  opts: { userId?: string; name?: string }
): ShiftGridCell | undefined {
  const emp = findShiftCalendarEmployee(employees, opts)
  if (!emp) return undefined
  return grid[shiftCellKey(emp.name, dayIndex)]
}

export function isShiftCalendarCurrentUser(
  row: ShiftCalendarEmployee,
  opts: { userId?: string; name?: string }
): boolean {
  if (opts.userId && row.id === opts.userId) return true
  if (opts.name && row.name === opts.name) return true
  return false
}

/** Build grid keys `${employeeName}-${dayIndex}` from API records */
export function shiftsToGrid(
  records: ShiftApiRecord[],
  weekDates: Date[],
  nameByUserId: Map<string, string>
): Record<string, ShiftGridCell> {
  const grid: Record<string, ShiftGridCell> = {}
  const dateToIndex = new Map(weekDates.map((d, i) => [toDateOnlyIso(d), i]))

  for (const s of records) {
    const dayIndex = dateToIndex.get(s.date)
    const name = s.userName || nameByUserId.get(s.userId)
    if (dayIndex === undefined || !name) continue
    grid[shiftCellKey(name, dayIndex)] = {
      employee: name,
      time: s.time,
      department: s.department,
    }
  }

  return grid
}
