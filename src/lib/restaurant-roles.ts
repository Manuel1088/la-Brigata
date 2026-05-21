import type { UserRole } from '@prisma/client'
import { CCNLLevel, type CCNLLevel as CcnlLevelType } from '@/lib/ccnl'

/** Reparti del form nuovo dipendente (allineati al settore ristorazione italiana). */
export type RestaurantDepartment =
  | 'cucina'
  | 'sala'
  | 'bar'
  | 'sommellerie'
  | 'accoglienza'
  | 'gestione'

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
  { value: 'bar', label: 'Bar', icon: '🍸' },
  { value: 'sommellerie', label: 'Sommellerie', icon: '🍷' },
  { value: 'accoglienza', label: 'Accoglienza', icon: '🛎️' },
  { value: 'gestione', label: 'Gestione', icon: '👔' },
]

/** Ruoli reali per reparto, con livello CCNL suggerito. */
export const RESTAURANT_ROLES: RestaurantRoleOption[] = [
  // CUCINA
  { value: 'EXECUTIVE_CHEF', label: 'Executive Chef', department: 'cucina', suggestedCcnl: CCNLLevel.QA },
  { value: 'SOUS_CHEF', label: 'Sous Chef', department: 'cucina', suggestedCcnl: CCNLLevel.QB },
  { value: 'CHEF_DE_PARTIE', label: 'Chef de Partie', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_4 },
  { value: 'CAPO_PARTITA', label: 'Capo Partita', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_4 },
  { value: 'CHEF', label: 'Cuoco', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'COMMIS_DE_CUISINE', label: 'Commis di Cucina', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_5 },
  { value: 'LAVAPIATTI', label: 'Lavapiatti', department: 'cucina', suggestedCcnl: CCNLLevel.LIVELLO_6 },

  // SALA
  { value: 'MAITRE', label: 'Maître', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_1 },
  { value: 'CAMERIERE_QUALIFICATO', label: 'Chef de Rang', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_2 },
  { value: 'CAMERIERE', label: 'Cameriere', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'COMMIS_DI_SALA', label: 'Commis di Sala', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_5 },
  { value: 'RUNNER', label: 'Runner', department: 'sala', suggestedCcnl: CCNLLevel.LIVELLO_6 },

  // BAR
  { value: 'HEAD_BARMAN', label: 'Head Barman', department: 'bar', suggestedCcnl: CCNLLevel.LIVELLO_2 },
  { value: 'BARMAN', label: 'Barman', department: 'bar', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'DIPENDENTE_BAR', label: 'Bartender', department: 'bar', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'DIPENDENTE_BAR', label: 'Commis Bar', department: 'bar', suggestedCcnl: CCNLLevel.LIVELLO_5 },

  // SOMMELLERIE
  { value: 'SOMMELIER', label: 'Sommelier', department: 'sommellerie', suggestedCcnl: CCNLLevel.LIVELLO_1 },
  { value: 'SOMMELIER', label: 'Commis Sommelier', department: 'sommellerie', suggestedCcnl: CCNLLevel.LIVELLO_3 },

  // ACCOGLIENZA
  { value: 'DIPENDENTE', label: 'Receptionist', department: 'accoglienza', suggestedCcnl: CCNLLevel.LIVELLO_3 },
  { value: 'DIPENDENTE', label: 'Hostess', department: 'accoglienza', suggestedCcnl: CCNLLevel.LIVELLO_3 },

  // GESTIONE
  { value: 'MANAGER', label: 'Manager', department: 'gestione', suggestedCcnl: CCNLLevel.QB },
  { value: 'DIRETTORE', label: 'Direttore', department: 'gestione', suggestedCcnl: CCNLLevel.QA },
  { value: 'RESPONSABILE_SALA', label: 'Responsabile Sala', department: 'gestione', suggestedCcnl: CCNLLevel.QB },
  { value: 'CASSIERE', label: 'Cassiere', department: 'gestione', suggestedCcnl: CCNLLevel.LIVELLO_3 },
]

/** Chiave univoca per opzioni con stesso UserRole (es. due SOMMELIER, due DIPENDENTE). */
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
  if (dept === 'bar') return 'beverage'
  if (dept === 'gestione') return 'dirigenti'
  if (dept === 'sommellerie') return 'beverage'
  return dept
}

/** Accetta reparto dal form o valori legacy già in DB. */
export function normalizeDepartmentInput(dept: string): string {
  const d = dept.toLowerCase().trim()
  if (
    d === 'cucina' ||
    d === 'sala' ||
    d === 'bar' ||
    d === 'sommellerie' ||
    d === 'accoglienza' ||
    d === 'gestione'
  ) {
    return departmentToStorage(d as RestaurantDepartment)
  }
  return d
}
