'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'
import {
  normalizeSwapStatus,
  type ShiftSwapStatus,
} from '@/lib/shift-swap-status'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { CCNLLevel } from '@/lib/ccnl'

export type SwapRequestUi = {
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
  status: ShiftSwapStatus
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  reason?: string
}

interface Props {
  onUpdate: () => void
}

const STATUS_ORDER: Record<ShiftSwapStatus, number> = {
  PENDING: 0,
  PEER_PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
}

function peerAccepted(status: ShiftSwapStatus): boolean {
  return status === 'PENDING' || status === 'APPROVED'
}

export default function ApprovalsSwaps({ onUpdate }: Props) {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [swapRequests, setSwapRequests] = useState<SwapRequestUi[]>([])
  const [loading, setLoading] = useState(true)

  const restaurantId = session?.user?.restaurantId as string | undefined
  const userCcnl = session?.user?.ccnlLevel ?? null
  const userRole = (session?.user?.role ?? '').toString().toUpperCase()
  const canApproveSwaps =
    userRole === 'ADMIN' || ccnlMeetsMinimum(userCcnl, CCNLLevel.LIVELLO_2)

  const loadSwapRequests = useCallback(async () => {
    if (!restaurantId) {
      setSwapRequests([])
      setLoading(false)
      return
    }

    try {
      const res = await fetch(
        `/api/shifts/swap?restaurantId=${encodeURIComponent(restaurantId)}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Caricamento fallito')
      const data = await res.json()
      const rows = (data.swaps ?? []) as Array<Record<string, unknown>>
      setSwapRequests(
        rows.map((r) => ({
          id: String(r.id),
          dateISO: String(r.dateISO ?? r.targetDate ?? ''),
          dayIndex: Number(r.dayIndex ?? 0),
          targetEmployeeName: String(r.targetEmployeeName ?? ''),
          targetDepartment: String(r.targetDepartment ?? 'sala'),
          targetShiftTime: String(r.targetShiftTime ?? ''),
          requesterId: String(r.requesterId ?? r.requesterUserId ?? ''),
          requesterName: String(r.requesterName ?? ''),
          requesterDepartment: String(r.requesterDepartment ?? 'sala'),
          offeredShiftTime: String(r.offeredShiftTime ?? ''),
          status: normalizeSwapStatus(String(r.status)),
          createdAt: String(r.createdAt ?? new Date().toISOString()),
          reason: r.notes != null ? String(r.notes) : undefined,
        }))
      )
    } catch (error) {
      console.error('Errore nel caricamento richieste swap:', error)
      setSwapRequests([])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    loadSwapRequests()
    const handleUpdate = () => loadSwapRequests()
    window.addEventListener('shift_swaps_updated', handleUpdate)
    window.addEventListener('approvals_updated', handleUpdate)
    return () => {
      window.removeEventListener('shift_swaps_updated', handleUpdate)
      window.removeEventListener('approvals_updated', handleUpdate)
    }
  }, [loadSwapRequests])

  const patchSwap = async (
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ) => {
    const res = await fetch(`/api/shifts/swap/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, notes }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      autoRejected?: boolean
      message?: string
    }
    if (!res.ok) {
      throw new Error(data.error || 'Operazione fallita')
    }
    await loadSwapRequests()
    window.dispatchEvent(new CustomEvent('approvals_updated'))
    window.dispatchEvent(new CustomEvent('shift_swaps_updated'))
    return data
  }

  const handleApprove = async (requestId: string) => {
    try {
      const data = await patchSwap(requestId, 'APPROVED')
      if (data.autoRejected) {
        notifyCustom(
          'WARNING',
          'SHIFTS',
          'Cambio turno',
          data.message ??
            'I turni non esistono più. La richiesta è stata chiusa automaticamente.'
        )
      } else {
        notifyCustom(
          'SUCCESS',
          'SHIFTS',
          'Cambio turno',
          'Cambio turno approvato e turni aggiornati'
        )
      }
      onUpdate()
      logReadAction('shift_swap_approved')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore nell'approvazione del cambio turno"
      notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', msg)
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('Motivo del rifiuto:')
    if (!reason) return

    try {
      await patchSwap(requestId, 'REJECTED', reason)
      notifyCustom('WARNING', 'SHIFTS', 'Cambio turno', 'Cambio turno rifiutato')
      onUpdate()
      logReadAction('shift_swap_rejected')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Errore nel rifiuto del cambio turno'
      notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', msg)
    }
  }

  const sortedRequests = [...swapRequests].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const getStatusColor = (status: ShiftSwapStatus) => {
    switch (status) {
      case 'PEER_PENDING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: ShiftSwapStatus) => {
    switch (status) {
      case 'PEER_PENDING':
        return 'In attesa collega'
      case 'PENDING':
        return 'In attesa manager'
      case 'APPROVED':
        return 'Approvato'
      case 'REJECTED':
        return 'Rifiutato'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Caricamento richieste...</div>
    )
  }

  if (sortedRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🔄</div>
        <p className="text-gray-500">Nessuna richiesta di cambio turno</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedRequests.map((request) => (
        <div
          key={request.id}
          className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
        >
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p className="text-sm font-medium text-gray-900 capitalize">
                {formatDate(request.dateISO)}
              </p>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
              >
                {getStatusLabel(request.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 text-xs uppercase tracking-wide text-gray-500 mb-2">
              <span>Richiedente</span>
              <span>Collega</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-x-4 flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{request.requesterName}</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
                    <span>{request.targetEmployeeName}</span>
                    {request.status === 'PEER_PENDING' && (
                      <span className="text-base" title="In attesa risposta del collega">
                        ⏳
                      </span>
                    )}
                    {peerAccepted(request.status) && (
                      <span className="text-base" title="Il collega ha accettato">
                        ✅
                      </span>
                    )}
                  </p>
                </div>

                {request.status === 'PENDING' && canApproveSwaps && (
                  <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(request.id)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(request.id)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      Rifiuta
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 text-sm text-gray-600">
                <p>{request.offeredShiftTime || '—'}</p>
                <p>{request.targetShiftTime || '—'}</p>
              </div>
            </div>

            {request.status === 'REJECTED' && request.reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-700 font-medium">Motivo</p>
                <p className="text-sm text-red-600 mt-1">{request.reason}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
