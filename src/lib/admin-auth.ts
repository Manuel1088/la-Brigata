/** Super Admin piattaforma (ADMIN + hierarchy 11). */
export function isSystemAdmin(role: unknown, level?: unknown): boolean {
  const r = String(role ?? '').toUpperCase()
  if (r !== 'ADMIN') return false
  const lvl = Number(level)
  return Number.isFinite(lvl) && lvl === 11
}
