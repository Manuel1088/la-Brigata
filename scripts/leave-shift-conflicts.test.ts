/**
 * Test eseguibile: npx tsx scripts/leave-shift-conflicts.test.ts
 */
import {
  findWorkShiftApprovedLeaveConflicts,
  formatLeaveShiftConflictError,
} from '../src/lib/leave-shift-conflicts'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

let passed = 0
let failed = 0

function runCase(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error(`    ${e instanceof Error ? e.message : e}`)
  }
}

const marioId = 'user-mario'
const approvedVacation = [
  {
    userId: marioId,
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    type: 'VACATION',
    user: { name: 'Mario Rossi' },
  },
]

console.log('leave-shift-conflicts (lavoro vs richieste APPROVED)\n')

runCase('lavoro su giorno-ferie → conflitto', () => {
  const conflicts = findWorkShiftApprovedLeaveConflicts(
    [{ userId: marioId, date: '2026-06-11', time: '06:00-14:00' }],
    approvedVacation
  )
  assert(conflicts.length === 1, `atteso 1 conflitto, ricevuto ${conflicts.length}`)
  assert(conflicts[0].leaveLabel === 'Ferie', `label attesa Ferie, ricevuto ${conflicts[0].leaveLabel}`)
  assert(conflicts[0].date === '2026-06-11', `data attesa 2026-06-11, ricevuto ${conflicts[0].date}`)
})

runCase('riposo su giorno-ferie → nessun conflitto', () => {
  const conflicts = findWorkShiftApprovedLeaveConflicts(
    [{ userId: marioId, date: '2026-06-11', time: 'RIPOSO' }],
    approvedVacation
  )
  assert(conflicts.length === 0, `atteso 0 conflitti, ricevuto ${conflicts.length}`)
})

runCase('lavoro su giorno libero → nessun conflitto', () => {
  const conflicts = findWorkShiftApprovedLeaveConflicts(
    [{ userId: marioId, date: '2026-06-15', time: '09:00-17:00' }],
    approvedVacation
  )
  assert(conflicts.length === 0, `atteso 0 conflitti, ricevuto ${conflicts.length}`)
})

runCase('lavoro appena fuori dal range ferie → nessun conflitto', () => {
  const before = findWorkShiftApprovedLeaveConflicts(
    [{ userId: marioId, date: '2026-06-09', time: '06:00-14:00' }],
    approvedVacation
  )
  const after = findWorkShiftApprovedLeaveConflicts(
    [{ userId: marioId, date: '2026-06-13', time: '06:00-14:00' }],
    approvedVacation
  )
  assert(before.length === 0, `prima del range: atteso 0, ricevuto ${before.length}`)
  assert(after.length === 0, `dopo il range: atteso 0, ricevuto ${after.length}`)
})

runCase('ROL approvato + lavoro stesso giorno → conflitto', () => {
  const conflicts = findWorkShiftApprovedLeaveConflicts(
    [{ userId: marioId, date: '2026-06-05', time: '14:00-22:00' }],
    [
      {
        userId: marioId,
        startDate: '2026-06-05',
        endDate: '2026-06-05',
        type: 'ROL',
        user: { name: 'Mario Rossi' },
      },
    ]
  )
  assert(conflicts.length === 1, `atteso 1 conflitto, ricevuto ${conflicts.length}`)
  assert(conflicts[0].leaveLabel === 'ROL', `label attesa ROL, ricevuto ${conflicts[0].leaveLabel}`)
})

runCase('formatLeaveShiftConflictError — messaggio azionabile', () => {
  const msg = formatLeaveShiftConflictError([
    {
      userId: marioId,
      userName: 'Mario Rossi',
      date: '2026-06-11',
      leaveType: 'VACATION',
      leaveLabel: 'Ferie',
      leaveStartDate: '2026-06-10',
      leaveEndDate: '2026-06-12',
    },
  ])
  assert(msg.includes('Mario Rossi'), 'manca nome dipendente')
  assert(msg.includes('Ferie'), 'manca tipo assenza')
  assert(msg.includes('Revoca'), 'manca invito a revocare')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
