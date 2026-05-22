import type { UserRole } from '@prisma/client'
import { CCNLLevel, type CCNLLevel as CcnlLevelType } from '@/lib/ccnl'

/** Reparti del form dipendente (valori = campo department su User). */
export type RestaurantDepartment =
  | 'cucina'
  | 'sala'
  | 'beverage'
  | 'accoglienza'
  | 'dirigenti'

export type RestaurantRoleOption = {
  /** Valore inviato al backend (UserRole Prisma). */
  value: UserRole
  /** Etichetta italiana nel dropdown. */
  label: string
  department: RestaurantDepartment
  suggestedCcnl: CcnlLevelType
}

export const RESTAURANT_DEPARTMENTS: {
  value: RestaurantDepartment
  label: string
  icon: string
}[] = [
  { value: 'cucina', label: 'Cucina', icon: '🍳' },
  { value: 'sala', label: 'Sala', icon: '🍽️' },
  { value: 'beverage', label: 'Beverage', icon: '🍸' },
  { value: 'accoglienza', label: 'Accoglienza', icon: '🛎️' },
  { value: 'dirigenti', label: 'Dirigenti', icon: '👔' },
]

/** Ruoli reali per reparto, con livello CCNL suggerito. */
export const RESTAURANT_ROLES: RestaurantRoleOption[] = [
  // Cucina
  { value: 'EXECUTIVE_CHEF', label: 'Executive Chef', department: 'cucina', suggestedCcnl: CCNLLevel.QA },
  { value: 'SOUS_CHEF', label: 'Sous Chef', department: 'cucina', suggestedCcnl: CCNLLevel.QB },
  { value: 'CHEF_DE_PARTIE', label: 'Chef de Partie', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_4 },
  { value: 'CHEF', label: 'Cuoco', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'COMMIS_DE_CUISINE', label: 'Commis di Cucina', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_5 },
  { value: 'LAVAPIATTI', label: 'Lavapiatti', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_6 },

  // Sala
  { value: 'MAITRE', label: 'Maitre', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_1 },
  { value: 'CAMERIERE_QUALIFICATO', label: 'Chef de Rang', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_2 },
  { value: 'CAMERIERE', label: 'Cameriere', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'COMMIS_DI_SALA', label: 'Commis di Sala', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_5 },
  { value: 'RUNNER', label: 'Runner', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_6 },

  // Beverage
  { value: 'HEAD_BARMAN', label: 'Head Barman', department: 'beverage', suggestedCcnl: CCNLLevel.LIVELLO_2 },
  { value: 'BARMAN', label: 'Barman', department: 'beverage', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'DIPENDENTE_BAR', label: 'Bartender', department: 'beverage', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'SOMMELIER', label: 'Sommelier', department: 'beverage', suggestedCcnl: CCNLLevel.LIVELLO_1 },
  { value: 'DIPENDENTE_BAR', label: 'Commis Bar', department: 'beverage', suggestedCcnl: CCNLLevel.LIVELLO_5 },
  { value: 'SOMMELIER', label: 'Commis Sommelier', department: 'beverage', suggestedCcnl: CCNLLevel.LIVELLO_3 },

  // Accoglienza
  { value: 'DIPENDENTE', label: 'Receptionist', department: 'accoglienza', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'DIPENDENTE', label: 'Hostess', department: 'accoglienza', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'CASSIERE', label: 'Cassiere', department: 'accoglienza', suggestedCcnl: CCNLLevel.LIVELLO_3 },

  // Dirigenti
  { value: 'MANAGER', label: 'Manager', department: 'dirigenti', suggestedCcnl: CCNLLevel.QB },
  { value: 'DIRETTORE', label: 'Direttore', department: 'dirigenti', suggestedCcnl: CCNLLevel.QA },
  { value: 'VICE_DIRETTORE', label: 'Vice Direttore', department: 'dirigenti', suggestedCcnl: CCNLLevel.QB },
  { value: 'ASSISTANT_MANAGER', label: 'Assistant Manager', department: 'dirigenti', suggestedCcnl: CCNLLevel.QB },
  { value: 'PROPRIETARIO', label: 'Proprietario', department: 'dirigenti', suggestedCcnl: CCNLLevel.QA },
]

/** Chiave univoca per opzioni con stesso UserRole (es. due DIPENDENTE_BAR). */
export function roleOptionKey(option: RestaurantRoleOption): string {
  return `${option.department}:${option.label}`
}

export function getRolesForDepartment(
  department: RestaurantDepartment
): RestaurantRoleOption[] {
  return RESTAURANT_ROLES.filter((r) => r.department === department)
}

export function getDefaultRoleForDepartment(
  department: RestaurantDepartment
): RestaurantRoleOption {
  const roles = getRolesForDepartment(department)
  return roles[0] ?? RESTAURANT_ROLES[0]
}

export function findRoleOption(
  department: RestaurantDepartment,
  roleKey: string
): RestaurantRoleOption | undefined {
  return getRolesForDepartment(department).find(
    (r) => roleOptionKey(r) === roleKey || r.value === roleKey
  )
}

export function suggestedCcnlForRole(
  department: RestaurantDepartment,
  roleKey: string
): CcnlLevelType {
  return findRoleOption(department, roleKey)?.suggestedCcnl ?? CCNLLevel.LIVELLO_3
}

/** Mappa reparto form → campo department salvato su User/Employment. */
export function departmentToStorage(dept: RestaurantDepartment): string {
  return dept
}

/** DB / legacy → reparto form. */
export function departmentFromStorage(dept: string): RestaurantDepartment {
  const d = dept.toLowerCase().trim()
  if (d === 'bar' || d === 'sommellerie' || d === 'beverage') return 'beverage'
  if (d === 'gestione' || d === 'dirigenti') return 'dirigenti'
  if (d === 'cucina' || d === 'sala' || d === 'accoglienza') return d
  return 'sala'
}

/** Accetta reparto dal form o valori legacy già in DB. */
export function normalizeDepartmentInput(dept: string): string {
  const d = dept.toLowerCase().trim()
  if (d === 'bar' || d === 'sommellerie') return 'beverage'
  if (d === 'gestione') return 'dirigenti'
  if (
    d === 'cucina' ||
    d === 'sala' ||
    d === 'beverage' ||
    d === 'accoglienza' ||
    d === 'dirigenti'
  ) {
    return d
  }
  return d
}
