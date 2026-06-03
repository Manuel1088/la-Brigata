/**
 * Test eseguibile: npx tsx scripts/tips-presence.test.ts
 */
import { decodeShiftTime, parseTimeToBounds } from '../src/lib/shifts'
import { isIncludedInTipsDistribution } from '../src/lib/tips'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function assertIncluded(time: string, expected: boolean, label: string): void {
  const { status, startTime, endTime } = parseTimeToBounds(time, '2026-06-01')
  const decoded = decodeShiftTime(status, startTime, endTime)
  const actual = isIncludedInTipsDistribution(decoded)
  assert(
    actual === expected,
    `${label}: time=${time} decoded=${decoded} atteso ${expected}, ricevuto ${actual}`
  )
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

console.log('tips-presence (statuto Mirabelle whitelist ibrida)\n')

runCase('turno lavoro semplice → incluso', () => {
  assertIncluded('06:00-14:00', true, 'lavoro')
})

runCase('turno spezzato → incluso', () => {
  assertIncluded('09:00-15:00 / 18:00-24:00', true, 'spezzato')
})

runCase('FERIE → incluso', () => {
  assertIncluded('FERIE', true, 'FERIE')
})

runCase('ROL → incluso', () => {
  assertIncluded('ROL', true, 'ROL')
})

runCase('RO (Recupero Ore) → incluso', () => {
  assertIncluded('RO', true, 'RO')
})

runCase('RIPOSO → escluso', () => {
  assertIncluded('RIPOSO', false, 'RIPOSO')
})

runCase('MALATTIA → escluso', () => {
  assertIncluded('MALATTIA', false, 'MALATTIA')
})

runCase('RECUPERO_RIPOSO → escluso (non RO)', () => {
  assertIncluded('RECUPERO_RIPOSO', false, 'RECUPERO_RIPOSO')
})

runCase('tipo inventato XYZ → escluso', () => {
  assertIncluded('XYZ', false, 'XYZ')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
