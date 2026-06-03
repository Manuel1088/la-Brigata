import {
  applyApprovedLeavesToShiftGrid,
  fetchApprovedLeavesForMonths,
  monthsInDateRange,
} from '@/lib/leaves-calendar'
import {
  getMonday,
  isWorkShiftTime,
  shiftCellKey,
  shiftsToGrid,
  toDateOnlyIso,
  type ShiftApiRecord,
  type ShiftGridCell,
} from '@/lib/shifts'
import type { ShiftAssignment } from '@/lib/validations/shifts'

export type ShiftCompletionGrid = Record<string, ShiftGridCell>

export type ShiftCompletionEmployee = {
  id: string
  name: string
  department: string
}

/**
 * La moda propone SOLO lavoro o RIPOSO (whitelist locale: isWorkShiftTime + RIPOSO).
 * In leave-types.ts tutte le assenze hanno countsInModaVotes: false — non votano nello storico.
 * FERIE, ROL, RO, malattia, congedi, permessi, … sono ignorati in collectEmployeeHistoricalTimes.
 */
export function isModaHistoricalVote(time: string): boolean {
  if (time === 'RIPOSO') return true
  return isWorkShiftTime(time)
}

/** Coerente con Calendar: turno di lavoro = time presente e non assenza. */
export function isWorkingShift(time: string | undefined): boolean {
  return !!time && time !== 'RIPOSO' && time !== 'FERIE'
}

function isCandidateForCompletion(cell: ShiftGridCell | undefined): boolean {
  const time = cell?.time
  if (isWorkingShift(time)) return false
  if (time === 'FERIE' || time === 'ROL' || time === 'RO') return false
  // Vuoto, RIPOSO esplicito, o cella assente → completabile
  return true
}

/** Conta frequenze; ignora valori undefined/assenti. */
function frequencyMap(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return counts
}

/** Moda singola; null se nessun voto o pareggio sul massimo. */
function modaFromCounts(counts: Map<string, number>): string | null {
  if (counts.size === 0) return null

  let bestTime: string | null = null
  let bestCount = 0
  let tied = false

  for (const [time, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestTime = time
      tied = false
    } else if (count === bestCount) {
      tied = true
    }
  }

  if (bestTime === null || tied) return null
  return bestTime
}

/** Tutti i time del dipendente nelle settimane storiche (chiavi name-0..6). */
function collectEmployeeHistoricalTimes(
  employeeName: string,
  historicalWeeks: ShiftCompletionGrid[]
): string[] {
  const out: string[] = []
  for (const week of historicalWeeks) {
    for (let day = 0; day < 7; day++) {
      const time = week[shiftCellKey(employeeName, day)]?.time
      if (time !== undefined && isModaHistoricalVote(time)) out.push(time)
    }
  }
  return out
}

/** Moda assoluta del dipendente su tutto lo storico; null se pareggio o assente. */
function absoluteModaForEmployee(
  employeeName: string,
  historicalWeeks: ShiftCompletionGrid[]
): string | null {
  return modaFromCounts(frequencyMap(collectEmployeeHistoricalTimes(employeeName, historicalWeeks)))
}

/** Time storici per lo stesso weekday (0=lun) nelle N settimane precedenti. */
function weekdayHistoricalTimes(
  employeeName: string,
  weekday: number,
  historicalWeeks: ShiftCompletionGrid[]
): string[] {
  const out: string[] = []
  for (const week of historicalWeeks) {
    const time = week[shiftCellKey(employeeName, weekday)]?.time
    if (time !== undefined && isModaHistoricalVote(time)) out.push(time)
  }
  return out
}

/** Cerca una cella storica con lo stesso time (per department/role). */
function findHistoricalCell(
  employeeName: string,
  time: string,
  historicalWeeks: ShiftCompletionGrid[]
): ShiftGridCell | undefined {
  for (const week of historicalWeeks) {
    for (let day = 0; day < 7; day++) {
      const cell = week[shiftCellKey(employeeName, day)]
      if (cell?.time === time) return cell
    }
  }
  return undefined
}

function resolveModaForWeekday(
  employeeName: string,
  weekday: number,
  historicalWeeks: ShiftCompletionGrid[]
): string | null {
  const weekdayTimes = weekdayHistoricalTimes(employeeName, weekday, historicalWeeks)
  if (weekdayTimes.length === 0) return null

  const weekdayModa = modaFromCounts(frequencyMap(weekdayTimes))
  if (weekdayModa !== null) return weekdayModa

  // Pareggio sul weekday → moda assoluta del dipendente
  return absoluteModaForEmployee(employeeName, historicalWeeks)
}

function buildCompletedCell(
  employee: ShiftCompletionEmployee,
  time: string,
  historicalWeeks: ShiftCompletionGrid[]
): ShiftGridCell {
  const fromHistory = findHistoricalCell(employee.name, time, historicalWeeks)
  return {
    employee: employee.name,
    time,
    department: fromHistory?.department ?? employee.department,
    role: fromHistory?.role,
  }
}

/**
 * Completa la griglia turni per moda sulle settimane storiche.
 * Voti storici: solo lavoro (isWorkShiftTime) e RIPOSO; assenze ignorate nel conteggio.
 * Non persiste nulla: lascia intatti turni manuali e assenze già in griglia.
 */
export function computeModaCompletion(params: {
  employees: ShiftCompletionEmployee[]
  historicalWeeks: ShiftCompletionGrid[]
  currentGrid: ShiftCompletionGrid
  daysToFill: number
}): ShiftCompletionGrid {
  const { employees, historicalWeeks, currentGrid, daysToFill } = params
  const result: ShiftCompletionGrid = { ...currentGrid }

  for (const employee of employees) {
    for (let dayIndex = 0; dayIndex < daysToFill; dayIndex++) {
      const key = shiftCellKey(employee.name, dayIndex)
      const existing = currentGrid[key]

      if (!isCandidateForCompletion(existing)) continue

      const weekday = dayIndex % 7
      const modaTime = resolveModaForWeekday(employee.name, weekday, historicalWeeks)
      if (modaTime === null) continue

      result[key] = buildCompletedCell(employee, modaTime, historicalWeeks)
    }
  }

  return result
}

// ── Orchestrazione client (fetch → moda → persist) ───────────────────────────

function weekDatesFromMonday(weekStartMonday: Date, numDays: number): Date[] {
  const start = getMonday(weekStartMonday)
  const dates: Date[] = []
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }
  return dates
}

function parseGridCellKey(key: string): { name: string; dayIndex: number } | null {
  const lastDash = key.lastIndexOf('-')
  if (lastDash === -1) return null
  const name = key.slice(0, lastDash)
  const dayIndex = parseInt(key.slice(lastDash + 1), 10)
  if (Number.isNaN(dayIndex)) return null
  return { name, dayIndex }
}

function filterGridToEmployeeNames(
  grid: ShiftCompletionGrid,
  names: Set<string>
): ShiftCompletionGrid {
  const out: ShiftCompletionGrid = {}
  for (const [key, cell] of Object.entries(grid)) {
    const parsed = parseGridCellKey(key)
    if (parsed && names.has(parsed.name)) {
      out[key] = cell
    }
  }
  return out
}

function normalizeDepartmentForApi(dept: string): ShiftAssignment['department'] {
  if (dept === 'direzione' || dept === 'dirigenti') return 'sala'
  if (dept === 'bar') return 'beverage'
  const allowed: ShiftAssignment['department'][] = [
    'cucina',
    'pasticceria',
    'sala',
    'beverage',
    'accoglienza',
    'direzione',
  ]
  if ((allowed as readonly string[]).includes(dept)) {
    return dept as ShiftAssignment['department']
  }
  return 'sala'
}

async function fetchRestaurantEmployees(
  restaurantId: string
): Promise<ShiftCompletionEmployee[]> {
  const params = new URLSearchParams({ restaurantId, active: 'true' })
  const res = await fetch(`/api/employees?${params}`, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Caricamento dipendenti fallito')
  }
  const data = (await res.json()) as {
    employees?: Array<{ id: string; name: string; department?: string }>
  }
  return (data.employees ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department ?? 'sala',
  }))
}

async function fetchWeekGrid(
  restaurantId: string,
  weekStartMonday: Date,
  numDays: number,
  nameByUserId: Map<string, string>
): Promise<ShiftCompletionGrid> {
  const weekDates = weekDatesFromMonday(weekStartMonday, numDays)
  const params = new URLSearchParams({
    restaurantId,
    date: toDateOnlyIso(weekDates[0]),
    days: String(numDays),
  })
  const res = await fetch(`/api/shifts?${params}`, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Caricamento turni fallito')
  }
  const data = (await res.json()) as { shifts?: ShiftApiRecord[] }
  return shiftsToGrid(data.shifts ?? [], weekDates, nameByUserId)
}

function gridToAssignments(
  grid: ShiftCompletionGrid,
  weekDates: Date[],
  byName: Map<string, ShiftCompletionEmployee>
): ShiftAssignment[] {
  const assignments: ShiftAssignment[] = []

  for (const [key, cell] of Object.entries(grid)) {
    if (!cell.time) continue
    const parsed = parseGridCellKey(key)
    if (!parsed) continue
    const emp = byName.get(parsed.name)
    const date = weekDates[parsed.dayIndex]
    if (!emp || !date) continue

    assignments.push({
      userId: emp.id,
      date: toDateOnlyIso(date),
      department: normalizeDepartmentForApi(cell.department || emp.department),
      time: cell.time,
    })
  }

  return assignments
}

/**
 * POST /api/shifts fa deleteMany su TUTTO il ristorante nel range date, poi createMany
 * solo dagli assignments inviati. Per non cancellare altri reparti, la griglia passata
 * deve contenere anche i turni già presenti degli altri reparti (merge prima del POST).
 */
async function persistShiftRange(params: {
  restaurantId: string
  weekDates: Date[]
  grid: ShiftCompletionGrid
  byName: Map<string, ShiftCompletionEmployee>
}): Promise<void> {
  const { restaurantId, weekDates, grid, byName } = params
  const assignments = gridToAssignments(grid, weekDates, byName)

  const res = await fetch('/api/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      restaurantId,
      rangeFrom: toDateOnlyIso(weekDates[0]),
      rangeTo: toDateOnlyIso(weekDates[weekDates.length - 1]),
      assignments,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Salvataggio turni fallito')
  }
}

/**
 * Completamento moda end-to-end: carica storico, applica moda al reparto selezionato,
 * salva in modo sicuro (preservando gli altri reparti nel range).
 */
export async function runModaCompletion(params: {
  restaurantId: string
  weekStart: Date
  department: string
  employees: ShiftCompletionEmployee[]
  weeksToFill?: number
}): Promise<{
  success: boolean
  schedule: Record<string, ShiftGridCell> | null
  error: Error | null
}> {
  const { restaurantId, employees } = params

  try {
    const monday = getMonday(params.weekStart)
    const weeksToFill = params.weeksToFill ?? 1
    const daysToFill = weeksToFill * 7
    const fillWeekDates = weekDatesFromMonday(monday, daysToFill)

    const allEmployees = await fetchRestaurantEmployees(restaurantId)
    const allByName = new Map(allEmployees.map((e) => [e.name, e]))
    const allNameByUserId = new Map(allEmployees.map((e) => [e.id, e.name]))
    const departmentEmployeeNames = new Set(employees.map((e) => e.name))

    const historicalWeeks: ShiftCompletionGrid[] = []
    for (const daysBack of [7, 14, 21]) {
      const histMonday = new Date(monday)
      histMonday.setDate(monday.getDate() - daysBack)
      const grid = await fetchWeekGrid(restaurantId, histMonday, 7, allNameByUserId)
      historicalWeeks.push(filterGridToEmployeeNames(grid, departmentEmployeeNames))
    }

    let currentGrid = await fetchWeekGrid(
      restaurantId,
      monday,
      daysToFill,
      allNameByUserId
    )

    const months = monthsInDateRange(
      fillWeekDates[0],
      fillWeekDates[fillWeekDates.length - 1]
    )
    const approvedLeaves = await fetchApprovedLeavesForMonths(months)
    currentGrid = applyApprovedLeavesToShiftGrid(
      currentGrid,
      approvedLeaves,
      fillWeekDates,
      allNameByUserId
    )

    const completedGrid = computeModaCompletion({
      employees,
      historicalWeeks,
      currentGrid,
      daysToFill,
    })

    await persistShiftRange({
      restaurantId,
      weekDates: fillWeekDates,
      grid: completedGrid,
      byName: allByName,
    })

    return { success: true, schedule: completedGrid, error: null }
  } catch (error) {
    return {
      success: false,
      schedule: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
