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

export function hierarchyLevelForUserRole(role: UserRole): number {
  if (role === 'MANAGER' || role === 'RESTAURANT_MANAGER') return 8
  if (role === 'RESPONSABILE_SALA' || role === 'EXECUTIVE_CHEF' || role === 'HEAD_CHEF') {
    return 7
  }
  if (role === 'CASSIERE') return 6
  return 5
}

export function toUserRole(role: string): UserRole {
  const candidate = role.toUpperCase()
  const values = [
    'ADMIN',
    'PROPRIETARIO',
    'MANAGER',
    'RESPONSABILE_SALA',
    'EXECUTIVE_CHEF',
    'SOUS_CHEF',
    'CHEF_DE_PARTIE',
    'CHEF',
    'CAPO_PARTITA',
    'DIPENDENTE_SALA',
    'DIPENDENTE_BAR',
    'CASSIERE',
    'DIPENDENTE',
  ] as const
  if ((values as readonly string[]).includes(candidate)) {
    return candidate as UserRole
  }
  return 'DIPENDENTE'
}

export function toEmployeeRole(userRole: UserRole, department: string): EmployeeRole {
  if (userRole === 'MANAGER' || userRole === 'RESTAURANT_MANAGER') return 'MANAGER'
  if (userRole === 'CASSIERE') return 'CASHIER'
  const dept = department.toLowerCase()
  if (dept === 'cucina') {
    if (userRole.includes('SOUS') || userRole === 'EXECUTIVE_CHEF') return 'SOUS_CHEF'
    return 'CHEF'
  }
  if (dept === 'beverage') return 'BARTENDER'
  if (dept === 'accoglienza') return 'HOST'
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
