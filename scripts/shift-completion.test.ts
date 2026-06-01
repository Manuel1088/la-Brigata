/**
 * Test eseguibile: npx tsx scripts/shift-completion.test.ts
 */
import { computeModaCompletion } from '../src/lib/shiftCompletion'

type Cell = { employee: string; time?: string; department?: string; role?: string }

function cell(name: string, time: string, department = 'sala'): Cell {
  return { employee: name, time, department }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  assert(actual === expected, `${label}: atteso ${JSON.stringify(expected)}, ricevuto ${JSON.stringify(actual)}`)
}

function assertCellTime(
  grid: Record<string, Cell>,
  key: string,
  expectedTime: string | undefined,
  label: string
): void {
  const actual = grid[key]?.time
  assertEqual(actual, expectedTime, label)
}

function assertKeyAbsent(grid: Record<string, Cell>, key: string, label: string): void {
  assert(!(key in grid), `${label}: atteso chiave assente "${key}", presente con ${JSON.stringify(grid[key])}`)
}

let passed = 0
let failed = 0

function runCase(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`✅ PASS — ${name}`)
  } catch (err) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`❌ FAIL — ${name}`)
    console.log(`   ${msg}`)
  }
}

const dept = 'sala'
const emp = (name: string) => ({ id: name.toLowerCase(), name, department: dept })

runCase('CASO 1 — moda chiara (Mario lunedì → 06:00-14:00)', () => {
  const historicalWeeks = [
    { 'Mario-0': cell('Mario', '06:00-14:00') },
    { 'Mario-0': cell('Mario', '06:00-14:00') },
    { 'Mario-0': cell('Mario', 'RIPOSO') },
  ]
  const result = computeModaCompletion({
    employees: [emp('Mario')],
    historicalWeeks,
    currentGrid: {},
    daysToFill: 7,
  })
  assertCellTime(result, 'Mario-0', '06:00-14:00', 'Mario-0')
})

runCase('CASO 2 — pareggio weekday → moda assoluta (Lucia → 06:00-14:00)', () => {
  const fillWeek = (name: string, dayOverrides: Record<number, string>) => {
    const week: Record<string, Cell> = {}
    for (let d = 0; d < 7; d++) {
      week[`${name}-${d}`] = cell(name, dayOverrides[d] ?? '06:00-14:00')
    }
    return week
  }
  const historicalWeeks = [
    fillWeek('Lucia', { 1: '06:00-14:00' }),
    fillWeek('Lucia', { 1: '14:00-22:00' }),
    fillWeek('Lucia', { 1: 'RIPOSO' }),
  ]
  const result = computeModaCompletion({
    employees: [emp('Lucia')],
    historicalWeeks,
    currentGrid: {},
    daysToFill: 7,
  })
  assertCellTime(result, 'Lucia-1', '06:00-14:00', 'Lucia-1 (martedì)')
})

runCase('CASO 3 — turno manuale protetto (09:00-17:00)', () => {
  const historicalWeeks = [
    { 'Mario-0': cell('Mario', '06:00-14:00') },
    { 'Mario-0': cell('Mario', '06:00-14:00') },
    { 'Mario-0': cell('Mario', '06:00-14:00') },
  ]
  const currentGrid = { 'Mario-0': cell('Mario', '09:00-17:00') }
  const result = computeModaCompletion({
    employees: [emp('Mario')],
    historicalWeeks,
    currentGrid,
    daysToFill: 7,
  })
  assertCellTime(result, 'Mario-0', '09:00-17:00', 'Mario-0')
})

runCase('CASO 4 — ferie protette (FERIE)', () => {
  const historicalWeeks = [
    { 'Mario-0': cell('Mario', '06:00-14:00') },
    { 'Mario-0': cell('Mario', '06:00-14:00') },
    { 'Mario-0': cell('Mario', '06:00-14:00') },
  ]
  const currentGrid = { 'Mario-0': cell('Mario', 'FERIE') }
  const result = computeModaCompletion({
    employees: [emp('Mario')],
    historicalWeeks,
    currentGrid,
    daysToFill: 7,
  })
  assertCellTime(result, 'Mario-0', 'FERIE', 'Mario-0')
})

runCase('CASO 5 — nessun dato storico (Giovanni → cella vuota)', () => {
  const historicalWeeks: Record<string, Cell>[] = [{}, {}, {}]
  const result = computeModaCompletion({
    employees: [emp('Giovanni')],
    historicalWeeks,
    currentGrid: {},
    daysToFill: 7,
  })
  assertKeyAbsent(result, 'Giovanni-0', 'Giovanni-0')
})

runCase('CASO 6 — riposo come moda (martedì → RIPOSO)', () => {
  const historicalWeeks = [
    { 'Mario-1': cell('Mario', 'RIPOSO') },
    { 'Mario-1': cell('Mario', 'RIPOSO') },
    { 'Mario-1': cell('Mario', 'RIPOSO') },
  ]
  const result = computeModaCompletion({
    employees: [emp('Mario')],
    historicalWeeks,
    currentGrid: {},
    daysToFill: 7,
  })
  assertCellTime(result, 'Mario-1', 'RIPOSO', 'Mario-1')
})

console.log('')
console.log(`Totale: ${passed + failed} | Passati: ${passed} | Falliti: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
