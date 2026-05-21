import { CCNLLevel } from '@/lib/ccnl'

/** Orario di lavoro (full-time / part-time / stage / apprendistato). */
export type WorkSchedule = 'full-time' | 'part-time' | 'stage' | 'apprendistato'

/** Durata contratto per dipendenti full-time o part-time. */
export type ContractDuration = 'indeterminato' | 'determinato'

export const WORK_SCHEDULE_OPTIONS: { value: WorkSchedule; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'stage', label: 'Stage / Tirocinio' },
  { value: 'apprendistato', label: 'Apprendistato' },
]

export const CONTRACT_DURATION_OPTIONS: { value: ContractDuration; label: string }[] = [
  { value: 'indeterminato', label: 'Indeterminato' },
  { value: 'determinato', label: 'Determinato' },
]

export function showsContractDuration(workSchedule: WorkSchedule): boolean {
  return workSchedule === 'full-time' || workSchedule === 'part-time'
}

export function requiresContractEndDate(
  workSchedule: WorkSchedule,
  contractDuration: ContractDuration
): boolean {
  if (workSchedule === 'stage' || workSchedule === 'apprendistato') return true
  if (showsContractDuration(workSchedule) && contractDuration === 'determinato') {
    return true
  }
  return false
}

export function showsExpenseAllowance(workSchedule: WorkSchedule): boolean {
  return workSchedule === 'stage'
}

export function showsHourlyRate(workSchedule: WorkSchedule): boolean {
  return workSchedule !== 'stage'
}

export function isCcnlLocked(workSchedule: WorkSchedule): boolean {
  return workSchedule === 'apprendistato'
}

export function lockedCcnlLevel(): string {
  return CCNLLevel.LIVELLO_6
}

export function contractEndDateLabel(
  workSchedule: WorkSchedule,
  contractDuration: ContractDuration
): string {
  if (workSchedule === 'apprendistato') return 'Data fine prevista formazione *'
  if (workSchedule === 'stage') return 'Data fine stage *'
  if (contractDuration === 'determinato') return 'Data fine contratto *'
  return 'Data fine contratto'
}

export function mapToContractTypeEnum(
  workSchedule: WorkSchedule,
  contractDuration: ContractDuration
): 'INDETERMINATO' | 'DETERMINATO' | null {
  if (!showsContractDuration(workSchedule)) return null
  return contractDuration === 'determinato' ? 'DETERMINATO' : 'INDETERMINATO'
}
