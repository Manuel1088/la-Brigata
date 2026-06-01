import type { ShiftGridCell } from '@/lib/shifts'

export type ShiftCompletionGrid = Record<string, ShiftGridCell>

export type ShiftCompletionEmployee = {
  id: string
  name: string
  department: string
}

const NON_COMPLETABLE_TIMES = new Set(['FERIE', 'ROL', 'RO'])

/** Coerente con Calendar: turno di lavoro = time presente e non assenza. */
export function isWorkingShift(time: string | undefined): boolean {
  return !!time && time !== 'RIPOSO' && time !== 'FERIE'
}

function shiftCellKey(employeeName: string, dayIndex: number): string {
  return `${employeeName}-${dayIndex}`
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
      if (time !== undefined) out.push(time)
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
    if (time !== undefined) out.push(time)
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
 * Non persiste nulla: restituisce una nuova griglia lasciando intatti turni manuali e ferie.
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
