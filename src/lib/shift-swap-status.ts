/** Stati richiesta cambio turno (allineati a Prisma ShiftSwapStatus). */
export const SHIFT_SWAP_STATUSES = [
  'PEER_PENDING',
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const

export type ShiftSwapStatus = (typeof SHIFT_SWAP_STATUSES)[number]

/** Richieste ancora in corso (bloccano nuove richieste sugli stessi turni). */
export const ACTIVE_SWAP_STATUSES: ShiftSwapStatus[] = [
  'PEER_PENDING',
  'PENDING',
]

export function normalizeSwapStatus(
  status: string | undefined | null
): ShiftSwapStatus {
  const upper = (status ?? 'PENDING').toUpperCase()
  if ((SHIFT_SWAP_STATUSES as readonly string[]).includes(upper)) {
    return upper as ShiftSwapStatus
  }
  return 'PENDING'
}

export function formatSwapDayIt(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
