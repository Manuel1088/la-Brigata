/** Stati swap normalizzati in maiuscolo. */
export type SwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ShiftSwapStatus = SwapStatus

export function normalizeSwapStatus(status: string | undefined | null): SwapStatus {
  const upper = (status ?? 'PENDING').toUpperCase()
  if (upper === 'APPROVED' || upper === 'REJECTED') return upper
  return 'PENDING'
}

export type StoredSwapRequest = {
  id: string
  dateISO: string
  dayIndex: number
  targetEmployeeName: string
  targetDepartment: string
  targetShiftTime: string
  requesterId: string
  requesterName: string
  requesterDepartment: string
  offeredShiftTime: string
  status: SwapStatus
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  reason?: string
}

export function normalizeSwapRequest(raw: Record<string, unknown>): StoredSwapRequest {
  const requesterName = String(raw.requesterName ?? raw.requester ?? '')
  const targetEmployeeName = String(raw.targetEmployeeName ?? raw.targetEmployee ?? '')
  return {
    id: String(raw.id ?? ''),
    dateISO: String(raw.dateISO ?? ''),
    dayIndex: Number(raw.dayIndex ?? 0),
    targetEmployeeName,
    targetDepartment: String(raw.targetDepartment ?? 'sala'),
    targetShiftTime: String(raw.targetShiftTime ?? ''),
    requesterId: String(raw.requesterId ?? ''),
    requesterName,
    requesterDepartment: String(raw.requesterDepartment ?? raw.targetDepartment ?? 'sala'),
    offeredShiftTime: String(raw.offeredShiftTime ?? ''),
    status: normalizeSwapStatus(typeof raw.status === 'string' ? raw.status : undefined),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    decidedBy: raw.decidedBy != null ? String(raw.decidedBy) : undefined,
    decidedAt: raw.decidedAt != null ? String(raw.decidedAt) : undefined,
    reason: raw.reason != null ? String(raw.reason) : undefined,
  }
}

export function loadSwapRequestsFromStorage(): StoredSwapRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('shift_swap_requests_v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) =>
      normalizeSwapRequest(
        typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}
      )
    )
  } catch {
    return []
  }
}

export function saveSwapRequestsToStorage(requests: StoredSwapRequest[]): void {
  if (typeof window === 'undefined') return
  const normalized = requests.map((r) => ({
    ...r,
    status: normalizeSwapStatus(r.status),
  }))
  localStorage.setItem('shift_swap_requests_v1', JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('shift_swaps_updated'))
}

export function countPendingSwapRequests(): number {
  return loadSwapRequestsFromStorage().filter((r) => r.status === 'PENDING').length
}
