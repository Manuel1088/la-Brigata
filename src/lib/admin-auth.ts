/** Super Admin piattaforma (ADMIN + hierarchy 11). */
export function isSystemAdmin(role: unknown, level?: unknown): boolean {
  const r = String(role ?? '').toUpperCase()
  if (r !== 'ADMIN') return false
  const lvl = Number(level)
  return Number.isFinite(lvl) && lvl === 11
}

/**
 * Vista piattaforma intera (come GET /api/employees/scores):
 * Super Admin oppure ADMIN senza ristorante assegnato.
 */
export function isPlatformAdminScope(
  role: unknown,
  level?: unknown,
  restaurantId?: string | null
): boolean {
  if (isSystemAdmin(role, level)) return true
  const r = String(role ?? '').toUpperCase()
  return r === 'ADMIN' && (restaurantId == null || restaurantId === '')
}
