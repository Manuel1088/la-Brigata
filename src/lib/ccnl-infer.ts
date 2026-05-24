import { CCNLLevel } from '@/lib/ccnl'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { RESTAURANT_ROLES } from '@/lib/restaurant-roles'

function normalizeRoleKey(role: string): string {
  return (role || '').toString().trim().toUpperCase().replace(/\s+/g, '_')
}

/** Prima occorrenza per valore ruolo Prisma (dropdown reparto). */
const PRISMA_ROLE_CCNL = (() => {
  const map = new Map<string, string>()
  for (const opt of RESTAURANT_ROLES) {
    if (!map.has(opt.value)) map.set(opt.value, opt.suggestedCcnl)
  }
  return map
})()

/** Ruoli tabella `employees` (seed legacy) e alias non in enum UserRole. */
const LEGACY_EMPLOYEE_ROLE_CCNL: Record<string, string> = {
  OWNER: CCNLLevel.QA,
  MANAGER: CCNLLevel.LIVELLO_1,
  CHEF: CCNLLevel.LIVELLO_3,
  SOUS_CHEF: CCNLLevel.QB,
  COOK: CCNLLevel.LIVELLO_4,
  WAITER: CCNLLevel.LIVELLO_3,
  HOST: CCNLLevel.LIVELLO_5,
  CASHIER: CCNLLevel.LIVELLO_4,
  BARTENDER: CCNLLevel.LIVELLO_3,
  DISHWASHER: CCNLLevel.LIVELLO_6,
  CUOCO_QUALIFICATO: CCNLLevel.LIVELLO_4,
  AIUTO_CUOCO: CCNLLevel.LIVELLO_5,
  PIZZAIOLO_SPECIALIZZATO: CCNLLevel.LIVELLO_4,
  PIZZAIOLO: CCNLLevel.LIVELLO_5,
  DIPENDENTE_SALA: CCNLLevel.LIVELLO_3,
  DIPENDENTE_BAR: CCNLLevel.LIVELLO_3,
}

/** Livello CCNL dal form registrazione (es. "4", "QA", "6S"). */
export function registrationLevelToCcnl(level?: string | null): string | null {
  if (!level?.trim()) return null
  const v = level.trim().toUpperCase()
  if (v === 'QA' || v === 'A1') return CCNLLevel.QA
  if (v === 'QB' || v === 'B2') return CCNLLevel.QB
  if (v === '6S') return CCNLLevel.LIVELLO_6
  const n = parseInt(v, 10)
  if (n >= 1 && n <= 6) {
    return `LIVELLO_${n}` as (typeof CCNLLevel)[keyof typeof CCNLLevel]
  }
  if (isCcnlLevelString(v)) return v
  return null
}

function isCcnlLevelString(v: string): boolean {
  return Object.values(CCNLLevel).includes(v as (typeof CCNLLevel)[keyof typeof CCNLLevel])
}

/** CCNL da ruolo Employee (COOK, WAITER, …). */
export function inferCcnlFromEmployeeRole(role: string): string | null {
  const r = normalizeRoleKey(role)
  return LEGACY_EMPLOYEE_ROLE_CCNL[r] ?? PRISMA_ROLE_CCNL.get(r) ?? null
}

/** CCNL in sessione: DB se presente; null per admin piattaforma; altrimenti inferenza. */
export function resolveSessionCcnlLevel(
  role: string,
  hierarchyLevel: number | null | undefined,
  ccnlLevel: string | null | undefined,
  opts?: {
    employeeRole?: string | null
    registrationLevel?: string | null
  }
): string | null {
  if (ccnlLevel != null && String(ccnlLevel).trim() !== '') return String(ccnlLevel)
  if (isPlatformAdmin(role, hierarchyLevel)) return null
  const fromReg = registrationLevelToCcnl(opts?.registrationLevel)
  if (fromReg) return fromReg
  if (opts?.employeeRole) {
    const fromEmp = inferCcnlFromEmployeeRole(opts.employeeRole)
    if (fromEmp) return fromEmp
  }
  return inferCcnlFromRole(role)
}

/** Inferisce il livello CCNL dal ruolo utente (allineato al login NextAuth). */
export function inferCcnlFromRole(role: string): string {
  const r = normalizeRoleKey(role)

  const legacy = LEGACY_EMPLOYEE_ROLE_CCNL[r]
  if (legacy) return legacy

  const fromPrisma = PRISMA_ROLE_CCNL.get(r)
  if (fromPrisma) return fromPrisma

  if (
    ['ADMIN', 'PROPRIETARIO', 'DIRETTORE_GENERALE', 'FB_MANAGER', 'EXECUTIVE_CHEF'].includes(
      r
    )
  ) {
    return CCNLLevel.QA
  }
  if (['DIRETTORE', 'CAPO_PASTICCERE'].includes(r)) {
    return CCNLLevel.QB
  }
  if (
    [
      'ASSISTANT_MANAGER',
      'VICE_DIRETTORE',
      'HEAD_CHEF',
      'HEAD_BARMAN',
      'HEAD_SOMMELIER',
      'RESPONSABILE_SALA',
      'CHEF_DE_PARTIE',
      'RESTAURANT_MANAGER',
    ].includes(r)
  ) {
    return CCNLLevel.LIVELLO_1
  }
  if (r === 'SECONDO_PASTICCERE') {
    return CCNLLevel.LIVELLO_2
  }
  if (
    [
      'MAITRE',
      'SOMMELIER',
      'CAMERIERE',
      'BARMAN',
      'CAMERIERE_QUALIFICATO',
      'RECEPTIONIST',
      'EVENT_COORDINATOR',
      'CAPO_PARTITA',
    ].includes(r)
  ) {
    return CCNLLevel.LIVELLO_3
  }
  if (['CASSIERE', 'BARTENDER'].includes(r)) {
    return CCNLLevel.LIVELLO_4
  }
  if (
    [
      'COMMIS_DI_SALA',
      'COMMIS_DE_CUISINE',
      'COMMIS_BAR',
      'COMMIS_SOMMELIER',
      'HOSTESS',
      'RUNNER',
    ].includes(r)
  ) {
    return CCNLLevel.LIVELLO_5
  }
  if (['LAVAPIATTI', 'DIPENDENTE'].includes(r)) {
    return CCNLLevel.LIVELLO_6
  }
  return CCNLLevel.LIVELLO_6
}
