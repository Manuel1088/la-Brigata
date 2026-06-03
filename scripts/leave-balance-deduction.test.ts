/**
 * Test eseguibile: npx tsx scripts/leave-balance-deduction.test.ts
 */
import type { LeaveType } from '@prisma/client'
import {
  balanceDeductionForApprovedLeave,
  countInclusiveDays,
} from '../src/lib/leaves'

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

const d = (iso: string) => new Date(`${iso}T12:00:00`)

console.log('leave-balance-deduction (ROL ore vs giorni)\n')

runCase('VACATION: 3 giorni inclusivi', () => {
  const n = balanceDeductionForApprovedLeave(
    'VACATION' as LeaveType,
    d('2026-06-10'),
    d('2026-06-12'),
    null
  )
  assert(n === 3, `atteso 3, ricevuto ${n}`)
  assert(
    countInclusiveDays(d('2026-06-10'), d('2026-06-12')) === 3,
    'countInclusiveDays coerente'
  )
})

runCase('ROL: usa requestedHours, ignora range', () => {
  const n = balanceDeductionForApprovedLeave(
    'ROL' as LeaveType,
    d('2026-06-10'),
    d('2026-06-12'),
    4
  )
  assert(n === 4, `atteso 4 ore, ricevuto ${n}`)
})

runCase('ROL: 3.5 ore decimali', () => {
  const n = balanceDeductionForApprovedLeave(
    'ROL' as LeaveType,
    d('2026-06-10'),
    d('2026-06-10'),
    3.5
  )
  assert(n === 3.5, `atteso 3.5, ricevuto ${n}`)
})

runCase('ROL: senza ore → null (non scalare)', () => {
  const n = balanceDeductionForApprovedLeave(
    'ROL' as LeaveType,
    d('2026-06-10'),
    d('2026-06-10'),
    null
  )
  assert(n === null, `atteso null, ricevuto ${n}`)
})

runCase('ROL: ore <= 0 → null', () => {
  assert(
    balanceDeductionForApprovedLeave(
      'ROL' as LeaveType,
      d('2026-06-10'),
      d('2026-06-10'),
      0
    ) === null,
    'zero ore'
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
