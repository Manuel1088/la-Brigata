/**
 * Round-trip logico colori turno (Commit 2): npx tsx scripts/shift-color-roundtrip.test.ts
 */
import {
  shiftPersistedColorFields,
  shiftsToGrid,
  type ShiftApiRecord,
} from '../src/lib/shifts'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

let passed = 0
let failed = 0

function run(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`✅ PASS — ${name}`)
  } catch (err) {
    failed++
    console.log(`❌ FAIL — ${name}`)
    console.log(`   ${err instanceof Error ? err.message : String(err)}`)
  }
}

run('shiftPersistedColorFields — lavoro con displayColor', () => {
  const out = shiftPersistedColorFields('12:00-15:00', 'display:12:00-15:00', {
    shiftTemplateId: 'tpl_pranzo',
    displayColor: '#F59E0B',
  })
  assert(out.displayColor === '#F59E0B', `displayColor: ${out.displayColor}`)
  assert(out.shiftTemplateId === 'tpl_pranzo', `shiftTemplateId: ${out.shiftTemplateId}`)
})

run('shiftPersistedColorFields — RIPOSO forza null', () => {
  const out = shiftPersistedColorFields('RIPOSO', 'rest', {
    shiftTemplateId: 'x',
    displayColor: '#F59E0B',
  })
  assert(out.shiftTemplateId === null, 'shiftTemplateId deve essere null')
  assert(out.displayColor === null, 'displayColor deve essere null')
})

run('shiftPersistedColorFields — FERIE forza null', () => {
  const out = shiftPersistedColorFields('FERIE', 'leave', {
    displayColor: '#F59E0B',
  })
  assert(out.displayColor === null, 'displayColor deve essere null')
})

run('shiftPersistedColorFields — MALATTIA forza null', () => {
  const out = shiftPersistedColorFields('MALATTIA', 'display:MALATTIA', {
    displayColor: '#F59E0B',
  })
  assert(out.displayColor === null, 'displayColor deve essere null')
})

run('shiftsToGrid — GET API record → cella con displayColor', () => {
  const weekDates = [new Date('2026-06-01T12:00:00')]
  const record: ShiftApiRecord = {
    id: 's1',
    userId: 'u1',
    userName: 'Mario',
    date: '2026-06-01',
    department: 'sala',
    time: '12:00-15:00',
    status: 'display:12:00-15:00',
    startTime: weekDates[0].toISOString(),
    endTime: weekDates[0].toISOString(),
    shiftTemplateId: 'tpl1',
    displayColor: '#F59E0B',
  }
  const grid = shiftsToGrid([record], weekDates, new Map([['u1', 'Mario']]))
  const cell = grid['Mario-0']
  assert(cell?.displayColor === '#F59E0B', `cell displayColor: ${cell?.displayColor}`)
  assert(cell?.shiftTemplateId === 'tpl1', `cell shiftTemplateId: ${cell?.shiftTemplateId}`)
})

console.log('')
console.log(`Totale: ${passed + failed} | Passati: ${passed} | Falliti: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
