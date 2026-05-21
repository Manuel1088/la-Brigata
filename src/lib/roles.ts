/** Ruoli con privilegi manager (API, report, accesso ristorante, team). */
export const MANAGER_ROLE_LIST = [
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'RESTAURANT_MANAGER',
  'MANAGER',
  'ASSISTANT_MANAGER',
  'RESPONSABILE_SALA',
  'HEAD_CHEF',
  'CASSIERE',
] as const

export type ManagerRole = (typeof MANAGER_ROLE_LIST)[number]

export const MANAGER_ROLES = new Set<string>(MANAGER_ROLE_LIST)

/** Alias per compatibilità con report e accesso ristorante. */
export const REPORTS_MANAGER_ROLES = MANAGER_ROLES

export function normalizeRole(role: string | undefined | null): string {
  return String(role ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
}

export function isManagerRole(role: string | undefined | null): boolean {
  return MANAGER_ROLES.has(normalizeRole(role))
}

/** Ruoli che possono acquistare piani ristorante (Prenotazioni / Intelligence). */
export const BILLING_MANAGER_ROLE_LIST = [
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'VICE_DIRETTORE',
  'MANAGER',
  'RESTAURANT_MANAGER',
  'ASSISTANT_MANAGER',
] as const

export type BillingManagerRole = (typeof BILLING_MANAGER_ROLE_LIST)[number]

export const BILLING_MANAGER_ROLES = new Set<string>(BILLING_MANAGER_ROLE_LIST)

export function canManageBilling(role: string | undefined | null): boolean {
  return BILLING_MANAGER_ROLES.has(normalizeRole(role))
}
