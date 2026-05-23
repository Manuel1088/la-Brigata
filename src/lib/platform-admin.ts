/** Super Admin piattaforma (ADMIN + hierarchy 11). */
export function isPlatformAdmin(
  role: unknown,
  level?: unknown
): boolean {
  const r = String(role ?? '').toUpperCase()
  if (r !== 'ADMIN') return false
  const lvl = Number(level)
  return Number.isFinite(lvl) && lvl === 11
}

/** Rotte che usano la sidebar contestuale admin (no sidebar personale). */
export function isPlatformAdminAreaPath(pathname: string): boolean {
  if (pathname === '/dashboard') return true
  if (pathname.startsWith('/admin')) return true
  if (pathname === '/permissions') return true
  return false
}
