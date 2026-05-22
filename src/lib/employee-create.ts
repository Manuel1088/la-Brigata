import type { EmployeeRole, UserRole } from '@prisma/client'

export const DEFAULT_EMPLOYEE_PASSWORD = 'Brigata2026!'

import { isManagerRole, normalizeRole } from '@/lib/roles'

/** @deprecated Usa MANAGER_ROLE_LIST da @/lib/roles */
export const RESTAURANT_STAFF_MANAGER_ROLES = [
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'MANAGER',
  'RESTAURANT_MANAGER',
] as const

export function normalizeStaffRole(role: string | undefined | null): string {
  return normalizeRole(role)
}

export function canManageRestaurantStaff(role: string | undefined | null): boolean {
  return isManagerRole(role)
}

const USER_ROLE_VALUES = new Set<string>([
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'VICE_DIRETTORE',
  'MANAGER',
  'RESTAURANT_MANAGER',
  'ASSISTANT_MANAGER',
  'RESPONSABILE_SALA',
  'MAITRE',
  'CASSIERE',
  'EXECUTIVE_CHEF',
  'HEAD_CHEF',
  'SOUS_CHEF',
  'EXEC_SOUS_CHEF',
  'CHEF_DE_CUISINE',
  'CHEF_DE_PARTIE',
  'DEMI_CHEF_DE_PARTIE',
  'CHEF',
  'CAPO_PARTITA',
  'PIZZAIOLO_SPECIALIZZATO',
  'CUOCO_QUALIFICATO',
  'COMMIS_DE_CUISINE',
  'COMMIS_DE_CUISINE_SENIOR',
  'AIUTO_CUOCO',
  'HEAD_SOMMELIER',
  'SOMMELIER',
  'HEAD_BARMAN',
  'BARMAN_SENIOR',
  'BARMAN',
  'CAMERIERE_SENIOR',
  'CAMERIERE_QUALIFICATO',
  'CAMERIERE',
  'COMMIS_DI_SALA',
  'RUNNER',
  'DIPENDENTE_SALA',
  'DIPENDENTE_BAR',
  'DIPENDENTE',
  'LAVAPIATTI',
])

export function hierarchyLevelForUserRole(role: UserRole): number {
  if (
    role === 'ADMIN' ||
    role === 'PROPRIETARIO' ||
    role === 'DIRETTORE' ||
    role === 'DIRETTORE_GENERALE'
  ) {
    return 10
  }
  if (
    role === 'VICE_DIRETTORE' ||
    role === 'ASSISTANT_MANAGER' ||
    role === 'MANAGER' ||
    role === 'RESTAURANT_MANAGER' ||
    role === 'EXECUTIVE_CHEF'
  ) {
    return 8
  }
  if (
    role === 'RESPONSABILE_SALA' ||
    role === 'HEAD_CHEF' ||
    role === 'SOUS_CHEF' ||
    role === 'MAITRE' ||
    role === 'HEAD_BARMAN' ||
    role === 'HEAD_SOMMELIER'
  ) {
    return 7
  }
  if (role === 'CASSIERE' || role === 'CHEF_DE_PARTIE' || role === 'CAPO_PARTITA') return 6
  return 5
}

export function toUserRole(role: string): UserRole {
  const candidate = role.toUpperCase().trim()
  if (USER_ROLE_VALUES.has(candidate)) {
    return candidate as UserRole
  }
  return 'DIPENDENTE'
}

export function toEmployeeRole(userRole: UserRole, department: string): EmployeeRole {
  if (
    userRole === 'MANAGER' ||
    userRole === 'RESTAURANT_MANAGER' ||
    userRole === 'DIRETTORE' ||
    userRole === 'DIRETTORE_GENERALE' ||
    userRole === 'VICE_DIRETTORE' ||
    userRole === 'ASSISTANT_MANAGER' ||
    userRole === 'PROPRIETARIO' ||
    userRole === 'PROPRIETARIO_OPERATIVO'
  ) {
    return 'MANAGER'
  }
  if (userRole === 'CASSIERE') return 'CASHIER'
  if (userRole === 'LAVAPIATTI') return 'DISHWASHER'
  if (userRole === 'RUNNER' || userRole === 'COMMIS_DI_SALA') return 'WAITER'

  const dept = department.toLowerCase()
  if (dept === 'cucina' || dept === 'pasticceria') {
    if (userRole === 'EXECUTIVE_CHEF' || userRole === 'SOUS_CHEF' || userRole === 'HEAD_CHEF') {
      return 'SOUS_CHEF'
    }
    if (
      userRole === 'CHEF_DE_PARTIE' ||
      userRole === 'CAPO_PARTITA' ||
      userRole === 'CHEF' ||
      userRole === 'CUOCO_QUALIFICATO'
    ) {
      return 'CHEF'
    }
    if (userRole === 'COMMIS_DE_CUISINE' || userRole === 'AIUTO_CUOCO') return 'COOK'
    return 'COOK'
  }
  if (dept === 'beverage' || dept === 'bar') {
    if (userRole === 'SOMMELIER' || userRole === 'HEAD_SOMMELIER') return 'BARTENDER'
    return 'BARTENDER'
  }
  if (dept === 'accoglienza') return 'HOST'
  if (
    userRole === 'MAITRE' ||
    userRole === 'RESPONSABILE_SALA' ||
    userRole === 'CAMERIERE' ||
    userRole === 'CAMERIERE_QUALIFICATO' ||
    userRole === 'CAMERIERE_SENIOR' ||
    userRole === 'DIPENDENTE_SALA'
  ) {
    return 'WAITER'
  }
  return 'WAITER'
}

export function buildEmployeeId(fullName: string): string {
  const slug = fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = Date.now().toString(36).slice(-6)
  return `emp-${slug || 'dipendente'}-${suffix}`
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
