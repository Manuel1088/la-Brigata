/** Reparti visibili nel calendario turni team. */
export type ShiftCalendarDepartment =
  | 'direzione'
  | 'cucina'
  | 'pasticceria'
  | 'sala'
  | 'beverage'
  | 'accoglienza'

export const ALL_SHIFT_DEPARTMENTS: ShiftCalendarDepartment[] = [
  'direzione',
  'cucina',
  'pasticceria',
  'sala',
  'beverage',
  'accoglienza',
]

export const SHIFT_DEPARTMENT_LABELS: Record<
  ShiftCalendarDepartment,
  { label: string; icon: string }
> = {
  direzione: { label: 'Dirigenti', icon: '👔' },
  cucina: { label: 'Cucina', icon: '🍳' },
  pasticceria: { label: 'Pasticceria', icon: '🍰' },
  sala: { label: 'Sala', icon: '🍽️' },
  beverage: { label: 'Beverage', icon: '🍷' },
  accoglienza: { label: 'Accoglienza', icon: '🛎️' },
}

const FRONT_OF_HOUSE: ShiftCalendarDepartment[] = ['sala', 'beverage', 'accoglienza']
const KITCHEN: ShiftCalendarDepartment[] = ['cucina', 'pasticceria']

function normalizeRole(role: string | null | undefined): string {
  return (role || '').toString().trim().toUpperCase()
}

/**
 * Reparti visibili in base al ruolo.
 * `null` = tutti i reparti (incluso direzione).
 */
export function getShiftDepartmentsForRole(
  role: string | null | undefined
): ShiftCalendarDepartment[] | null {
  const r = normalizeRole(role)

  if (
    [
      'MANAGER',
      'FB_MANAGER',
      'DIRETTORE',
      'DIRETTORE_GENERALE',
      'VICE_DIRETTORE',
      'PROPRIETARIO_OPERATIVO',
      'PROPRIETARIO',
      'ADMIN',
    ].includes(r)
  ) {
    return null
  }

  if (['MAITRE', 'RESTAURANT_MANAGER'].includes(r)) {
    return [...FRONT_OF_HOUSE]
  }

  if (
    [
      'HEAD_CHEF',
      'EXECUTIVE_CHEF',
      'CAPO_PASTICCERE',
      'SOUS_CHEF',
      'CHEF_DE_CUISINE',
      'EXEC_SOUS_CHEF',
    ].includes(r)
  ) {
    return [...KITCHEN]
  }

  return null
}

export function resolveVisibleShiftDepartments(
  role: string | null | undefined,
  override?: ShiftCalendarDepartment[] | null
): ShiftCalendarDepartment[] {
  if (override !== undefined && override !== null) {
    return ALL_SHIFT_DEPARTMENTS.filter((d) => override.includes(d))
  }
  const fromRole = getShiftDepartmentsForRole(role)
  if (fromRole === null) return [...ALL_SHIFT_DEPARTMENTS]
  return ALL_SHIFT_DEPARTMENTS.filter((d) => fromRole.includes(d))
}
