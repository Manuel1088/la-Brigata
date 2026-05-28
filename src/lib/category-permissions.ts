/**
 * Permessi centralizzati per categoria (user_permissions).
 * Non include i flag mance su Employee (canInsertTips, ecc.).
 */
import { isPlatformAdmin } from '@/lib/platform-admin'
import { CCNLLevel, type CCNLLevel as CcnlLevelType } from '@/lib/ccnl'
import {
  ccnlRank,
  getEffectivePermissionIds,
  hasPermission,
  normalizeCcnlLevel,
} from '@/lib/permissions'

function normalizeRole(role: string): string {
  return (role || '').toString().toUpperCase()
}

export const PERMISSION_CATEGORIES = [
  'mance',
  'turni',
  'ferie',
  'staff',
  'report',
  'task',
  'delega',
] as const

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number]

/** ID record in tabella `permissions` / righe `user_permissions`. */
export const CATEGORY_DB_IDS: Record<PermissionCategory, string> = {
  mance: 'category_mance',
  turni: 'category_turni',
  ferie: 'category_ferie',
  staff: 'category_staff',
  report: 'category_report',
  task: 'category_task',
  delega: 'category_delega',
}

export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  mance: 'Mance',
  turni: 'Turni',
  ferie: 'Ferie',
  staff: 'Staff',
  report: 'Report',
  task: 'Task',
  delega: 'Delega',
}

/** Permessi granulari attivati da ogni categoria (override CCNL). */
export const CATEGORY_EXPANDED_PERMISSIONS: Record<PermissionCategory, string[]> = {
  mance: [
    'mance_manage',
    'mance_calculate',
    'mance_approve',
    'mance_history',
    'mance_export',
  ],
  turni: [
    'gestione_turni',
    'turni_manage',
    'turni_assign',
    'turni_approve',
    'turni_export',
  ],
  ferie: [
    'ferie_approve',
    'ferie_view_all',
    'ferie_manage',
    'ferie_export',
    'ferie_calendar',
    'ferie_balance',
  ],
  staff: [
    'personale_create',
    'personale_edit',
    'personale_activate',
    'personale_export',
    'personale_salary',
    'personale_skills',
  ],
  report: [
    'report_basic',
    'report_advanced',
    'report_financial',
    'report_export',
    'report_schedule',
    'bookings_view',
    'bookings_manage',
    'customers_view',
    'customers_manage',
  ],
  task: [
    'task_view',
    'task_complete',
    'task_create',
    'task_manage',
    'task_assign_role',
  ],
  delega: ['perm_delega_manage'],
}

export type CategoryGrants = Record<PermissionCategory, boolean>

export const EMPTY_CATEGORY_GRANTS: CategoryGrants = {
  mance: false,
  turni: false,
  ferie: false,
  staff: false,
  report: false,
  task: false,
  delega: false,
}

export type PermissionActor = {
  id: string
  role: string
  level?: number
  ccnlLevel?: string | null
  department?: string | null
  restaurantId?: string | null
  categoryGrants?: CategoryGrants
}

export type PermissionTarget = {
  id: string
  ccnlLevel?: string | null
  department?: string | null
  restaurantId?: string | null
}

const MANAGEABLE_CCNL: CcnlLevelType[] = [
  CCNLLevel.QA,
  CCNLLevel.QB,
  CCNLLevel.LIVELLO_1,
  CCNLLevel.LIVELLO_2,
  CCNLLevel.LIVELLO_3,
  CCNLLevel.LIVELLO_4,
]

export function isSuperAdmin(actor: PermissionActor): boolean {
  return isPlatformAdmin(actor.role, actor.level)
}

export function isQaOrQbCcnl(ccnlLevel?: string | null): boolean {
  const l = normalizeCcnlLevel(ccnlLevel)
  return l === CCNLLevel.QA || l === CCNLLevel.QB
}

export function grantsFromPermissionNames(names: string[]): CategoryGrants {
  const grants = { ...EMPTY_CATEGORY_GRANTS }
  for (const cat of PERMISSION_CATEGORIES) {
    if (names.includes(CATEGORY_DB_IDS[cat])) {
      grants[cat] = true
    }
  }
  return grants
}

export function expandCategoryGrants(grants: CategoryGrants): string[] {
  const ids: string[] = []
  for (const cat of PERMISSION_CATEGORIES) {
    if (grants[cat]) {
      ids.push(...CATEGORY_EXPANDED_PERMISSIONS[cat])
    }
  }
  return [...new Set(ids)]
}

export function actorEffectiveCategoryGrants(actor: PermissionActor): CategoryGrants {
  if (isSuperAdmin(actor)) {
    return Object.fromEntries(
      PERMISSION_CATEGORIES.map((c) => [c, true])
    ) as CategoryGrants
  }

  const fromSession = actor.categoryGrants ?? EMPTY_CATEGORY_GRANTS
  const ccnlIds = getEffectivePermissionIds(actor.role, actor.ccnlLevel)
  const implied: CategoryGrants = { ...EMPTY_CATEGORY_GRANTS }

  if (isQaOrQbCcnl(actor.ccnlLevel)) {
    for (const cat of PERMISSION_CATEGORIES) {
      implied[cat] = true
    }
    return implied
  }

  for (const cat of PERMISSION_CATEGORIES) {
    if (fromSession[cat]) {
      implied[cat] = true
      continue
    }
    const expanded = CATEGORY_EXPANDED_PERMISSIONS[cat]
    if (expanded.some((pid) => ccnlIds.includes(pid))) {
      implied[cat] = true
    }
  }

  if (
    hasPermission(actor.role, 'perm_delega_manage', actor.ccnlLevel) ||
    fromSession.delega
  ) {
    implied.delega = true
  }

  return implied
}

export function actorHasCategory(
  actor: PermissionActor,
  category: PermissionCategory
): boolean {
  return actorEffectiveCategoryGrants(actor)[category]
}

/** Può aprire la pagina gestione permessi. */
export function canAccessPermissionManagementPage(actor: PermissionActor): boolean {
  if (isSuperAdmin(actor)) return true
  if (isQaOrQbCcnl(actor.ccnlLevel)) return true
  return actorHasCategory(actor, 'delega')
}

/** Può modificare i permessi di un altro utente. */
export function canManageTargetUser(
  actor: PermissionActor,
  target: PermissionTarget
): boolean {
  const targetLevel = normalizeCcnlLevel(target.ccnlLevel)
  if (!targetLevel || !MANAGEABLE_CCNL.includes(targetLevel)) {
    return false
  }

  if (targetLevel === CCNLLevel.LIVELLO_5 || targetLevel === CCNLLevel.LIVELLO_6) {
    return false
  }

  if (isSuperAdmin(actor)) {
    return MANAGEABLE_CCNL.includes(targetLevel)
  }

  // ADMIN piattaforma senza ristorante (allineato a /api/employees/scores)
  if (
    normalizeRole(actor.role) === 'ADMIN' &&
    !actor.restaurantId
  ) {
    return MANAGEABLE_CCNL.includes(targetLevel)
  }

  if (!isSuperAdmin(actor) && actor.restaurantId && target.restaurantId) {
    if (actor.restaurantId !== target.restaurantId) return false
  }

  // QA/QB gestiscono i permessi di tutto il ristorante (non solo il reparto anagrafico, es. dirigenti)
  if (
    !isQaOrQbCcnl(actor.ccnlLevel) &&
    !isSuperAdmin(actor) &&
    actor.department &&
    target.department
  ) {
    const a = actor.department.trim().toLowerCase()
    const t = target.department.trim().toLowerCase()
    if (a && t && a !== t) return false
  }

  const actorLevel = normalizeCcnlLevel(actor.ccnlLevel)

  if (isQaOrQbCcnl(actor.ccnlLevel)) {
    return (
      targetLevel === CCNLLevel.LIVELLO_2 ||
      targetLevel === CCNLLevel.LIVELLO_3 ||
      targetLevel === CCNLLevel.LIVELLO_4
    )
  }

  if (
    actorLevel === CCNLLevel.LIVELLO_2 ||
    actorLevel === CCNLLevel.LIVELLO_3
  ) {
    if (!actorHasCategory(actor, 'delega')) return false
    return targetLevel === CCNLLevel.LIVELLO_4
  }

  return false
}

/** Solo ADMIN / QA / QB possono assegnare la categoria "delega". */
export function canGrantDelegaCategory(actor: PermissionActor): boolean {
  if (isSuperAdmin(actor)) return true
  return isQaOrQbCcnl(actor.ccnlLevel)
}

export function canGrantCategoryToTarget(
  actor: PermissionActor,
  target: PermissionTarget,
  category: PermissionCategory,
  enabled: boolean
): { ok: boolean; error?: string } {
  if (!canManageTargetUser(actor, target)) {
    return { ok: false, error: 'Non puoi gestire i permessi di questo utente' }
  }

  if (category === 'delega' && enabled && !canGrantDelegaCategory(actor)) {
    return { ok: false, error: 'Solo ADMIN, QA o QB possono assegnare la delega' }
  }

  if (enabled && !isSuperAdmin(actor) && !actorHasCategory(actor, category)) {
    return {
      ok: false,
      error: 'Non puoi assegnare un permesso che non possiedi tu stesso',
    }
  }

  if (actor.id === target.id && enabled) {
    const actorGrants = actorEffectiveCategoryGrants(actor)
    if (!isSuperAdmin(actor) && !actorGrants[category]) {
      return {
        ok: false,
        error: 'Non puoi elevare i tuoi permessi oltre quelli attuali',
      }
    }
  }

  return { ok: true }
}

export type EmployeePermissionGroup =
  | 'qa_qb'
  | 'l2_l3'
  | 'l4'

export function groupForCcnl(ccnlLevel?: string | null): EmployeePermissionGroup | null {
  const l = normalizeCcnlLevel(ccnlLevel)
  if (!l) return null
  if (l === CCNLLevel.QA || l === CCNLLevel.QB) return 'qa_qb'
  if (
    l === CCNLLevel.LIVELLO_1 ||
    l === CCNLLevel.LIVELLO_2 ||
    l === CCNLLevel.LIVELLO_3
  ) {
    return 'l2_l3'
  }
  if (l === CCNLLevel.LIVELLO_4) return 'l4'
  return null
}

export const GROUP_LABELS: Record<EmployeePermissionGroup, string> = {
  qa_qb: 'QA / QB',
  l2_l3: 'Livello 2 / 3',
  l4: 'Livello 4',
}

export function compareUsersForPermissionTable(
  a: { name: string; ccnlLevel?: string | null },
  b: { name: string; ccnlLevel?: string | null }
): number {
  const ra = ccnlRank(normalizeCcnlLevel(a.ccnlLevel) ?? CCNLLevel.LIVELLO_6)
  const rb = ccnlRank(normalizeCcnlLevel(b.ccnlLevel) ?? CCNLLevel.LIVELLO_6)
  if (ra !== rb) return ra - rb
  return a.name.localeCompare(b.name, 'it')
}
