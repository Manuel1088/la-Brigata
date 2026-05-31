/** Pagine pubbliche senza sidebar/topbar (landing, login, register). */
export function isAuthPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const base = pathname.split('?')[0].replace(/\/$/, '') || '/'
  // /onboarding è uno step bloccante a tutto schermo: niente sidebar/nav (nessuna via d'uscita)
  return base === '/' || base === '/login' || base === '/register' || base === '/onboarding'
}

/**
 * Formatta un importo in euro: arrotondamento sempre verso il basso, senza decimali (€63,33 → €63).
 */
export function formatEuro(amount: number | string | undefined | null): string {
  if (amount == null || amount === '') return '€0'

  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n)) return '€0'

  const floored = Math.floor(n)
  return `€${floored.toLocaleString('it-IT', {
    maximumFractionDigits: 0,
  })}`
}
