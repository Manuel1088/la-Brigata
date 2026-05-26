/** Campi profilo personale modificabili dal dipendente (non contrattuali). */
export const PROFILE_PERSONAL_FIELDS = [
  'name',
  'phone',
  'secondaryEmail',
  'birthDate',
  'birthPlace',
  'maritalStatus',
  'childrenCount',
  'education',
  'languages',
  'hobbies',
  'sports',
  'emergencyContact',
  'emergencyPhone',
] as const

export type ProfilePersonalPayload = {
  id: string
  name?: string
  phone?: string | null
  secondaryEmail?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  maritalStatus?: string | null
  childrenCount?: number | null
  education?: string | null
  languages?: string | null
  hobbies?: string | null
  sports?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function joinFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
}

export function formatBirthDateForInput(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}
