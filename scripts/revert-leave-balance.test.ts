/**
 * Test eseguibile: npx tsx scripts/revert-leave-balance.test.ts
 * Simmetria approve/revert sul saldo (stessa balanceDeductionForApprovedLeave).
 */
import type { LeaveType } from '@prisma/client'
import { balanceDeductionForApprovedLeave } from '../src/lib/leaves'

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

function applyBalance(
  total: number,
  usedBefore: number,
  deduction: number | null
): { used: number; remaining: number } {
  if (deduction == null) {
    return { used: usedBefore, remaining: total - usedBefore }
  }
  const used = Math.min(total, usedBefore + deduction)
  return { used, remaining: Math.max(0, total - used) }
}

function revertBalance(
  total: number,
  usedBefore: number,
  credit: number | null
): { used: number; remaining: number } {
  if (credit == null) {
    return { used: usedBefore, remaining: total - usedBefore }
  }
  const used = Math.max(0, usedBefore - credit)
  return { used, remaining: Math.min(total, total - used) }
}

console.log('revert-leave-balance (simmetria approve ↔ revert)\n')

runCase('ferie 3gg: approve −3 → revert +3 (saldo identico)', () => {
  const total = 26
  const start = d('2026-06-10')
  const end = d('2026-06-12')
  const deduction = balanceDeductionForApprovedLeave('VACATION' as LeaveType, start, end, null)
  assert(deduction === 3, `deduction attesa 3, ricevuto ${deduction}`)

  const before = { used: 5, remaining: 21 }
  const afterApply = applyBalance(total, before.used, deduction)
  assert(afterApply.used === 8, `used dopo apply atteso 8, ricevuto ${afterApply.used}`)
  assert(afterApply.remaining === 18, `remaining atteso 18, ricevuto ${afterApply.remaining}`)

  const afterRevert = revertBalance(total, afterApply.used, deduction)
  assert(afterRevert.used === before.used, `used dopo revert atteso ${before.used}`)
  assert(afterRevert.remaining === before.remaining, `remaining atteso ${before.remaining}`)
})

runCase('ROL 4h: approve −4 → revert +4', () => {
  const total = 32
  const deduction = balanceDeductionForApprovedLeave(
    'ROL' as LeaveType,
    d('2026-06-05'),
    d('2026-06-05'),
    4
  )
  assert(deduction === 4, `deduction attesa 4, ricevuto ${deduction}`)

  const before = { used: 10, remaining: 22 }
  const afterApply = applyBalance(total, before.used, deduction)
  const afterRevert = revertBalance(total, afterApply.used, deduction)
  assert(afterRevert.used === before.used, 'used ripristinato')
  assert(afterRevert.remaining === before.remaining, 'remaining ripristinato')
})

runCase('credit null (ROL senza ore): apply e revert no-op', () => {
  const deduction = balanceDeductionForApprovedLeave(
    'ROL' as LeaveType,
    d('2026-06-10'),
    d('2026-06-10'),
    null
  )
  assert(deduction === null, 'atteso null')
  const before = { used: 2, remaining: 24 }
  const afterApply = applyBalance(26, before.used, deduction)
  const afterRevert = revertBalance(26, afterApply.used, deduction)
  assert(afterApply.used === before.used && afterRevert.used === before.used, 'invariato')
})

runCase('revert: used non scende sotto 0', () => {
  const credit = 5
  const afterRevert = revertBalance(26, 3, credit)
  assert(afterRevert.used === 0, `used atteso 0, ricevuto ${afterRevert.used}`)
  assert(afterRevert.remaining === 26, `remaining atteso 26, ricevuto ${afterRevert.remaining}`)
})

runCase('revert: remaining non supera total', () => {
  const afterRevert = revertBalance(26, 1, 10)
  assert(afterRevert.used === 0, `used atteso 0, ricevuto ${afterRevert.used}`)
  assert(afterRevert.remaining === 26, `remaining atteso 26, ricevuto ${afterRevert.remaining}`)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
