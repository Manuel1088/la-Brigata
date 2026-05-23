/** Super Admin piattaforma (ADMIN + hierarchy 11). Unica fonte di verità. */
export function isPlatformAdmin(role: unknown, level?: unknown): boolean {
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
  if (isPlatformAdmin(role, level)) return true
  const r = String(role ?? '').toUpperCase()
  return r === 'ADMIN' && (restaurantId == null || restaurantId === '')
}

/** Rotte che usano la sidebar contestuale admin (no sidebar personale). */
export function isPlatformAdminAreaPath(pathname: string): boolean {
  if (pathname === '/dashboard') return true
  if (pathname.startsWith('/admin')) return true
  if (pathname === '/permissions') return true
  return false
}
