'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatSwapDayIt, normalizeSwapStatus } from '@/lib/shift-swap-status'

type PeerSwapRow = {
  id: string
  requesterName: string
  dateISO: string
  targetShiftTime: string
  offeredShiftTime: string
  status: string
}

export default function PeerSwapRequests() {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const restaurantId = session?.user?.restaurantId as string | undefined
  const [requests, setRequests] = useState<PeerSwapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!restaurantId) {
      setRequests([])
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({
        restaurantId,
        status: 'PEER_PENDING',
        peerInbox: 'true',
      })
      const res = await fetch(`/api/shifts/swap?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Caricamento fallito')
      const data = await res.json()
      const rows = (data.swaps ?? []) as Array<Record<string, unknown>>
      setRequests(
        rows.map((r) => ({
          id: String(r.id),
          requesterName: String(r.requesterName ?? ''),
          dateISO: String(r.dateISO ?? r.targetDate ?? ''),
          targetShiftTime: String(r.targetShiftTime ?? ''),
          offeredShiftTime: String(r.offeredShiftTime ?? ''),
          status: normalizeSwapStatus(String(r.status)),
        }))
      )
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    load()
    const onUpdate = () => load()
    window.addEventListener('shift_swaps_updated', onUpdate)
    window.addEventListener('approvals_updated', onUpdate)
    return () => {
      window.removeEventListener('shift_swaps_updated', onUpdate)
      window.removeEventListener('approvals_updated', onUpdate)
    }
  }, [load])

  const respond = async (id: string, action: 'accept' | 'reject') => {
    if (action === 'reject') {
      const ok = window.confirm('Rifiutare questa richiesta di cambio turno?')
      if (!ok) return
    }

    setActingId(id)
    try {
      const res = await fetch(`/api/shifts/swap/${id}/peer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Operazione fallita')
      }
      if (action === 'accept') {
        notifyCustom(
          'SUCCESS',
          'SHIFTS',
          'Cambio turno',
          'Hai accettato. La richiesta è ora in approvazione al manager.'
        )
      } else {
        notifyCustom('INFO', 'SHIFTS', 'Cambio turno', 'Richiesta rifiutata.')
      }
      window.dispatchEvent(new CustomEvent('shift_swaps_updated'))
      window.dispatchEvent(new CustomEvent('approvals_updated'))
      await load()
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Errore durante la risposta'
      notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', msg)
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <section className="bg-white rounded-2xl shadow-md p-5 border border-blue-100">
        <p className="text-sm text-gray-500">Caricamento richieste cambio turno...</p>
      </section>
    )
  }

  if (requests.length === 0) {
    return null
  }

  return (
    <section className="bg-white rounded-2xl shadow-md p-5 mb-4 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Cambi turno</h2>
        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {requests.length} in attesa
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Un collega vuole scambiare il turno con te. Accetta o rifiuta prima che la richiesta
        vada al manager.
      </p>
      <div className="space-y-4">
        {requests.map((req) => (
          <div
            key={req.id}
            className="rounded-xl border border-gray-200 p-4 bg-gray-50"
          >
            <p className="font-medium text-gray-900">{req.requesterName}</p>
            <p className="text-sm text-gray-600 mt-1">{formatSwapDayIt(req.dateISO)}</p>
            <p className="text-sm mt-2">
              <span className="text-gray-500">Il tuo turno:</span>{' '}
              <span className="font-medium">{req.targetShiftTime}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Il suo turno:</span>{' '}
              <span className="font-medium">{req.offeredShiftTime}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                disabled={actingId === req.id}
                onClick={() => void respond(req.id, 'accept')}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Accetta
              </button>
              <button
                type="button"
                disabled={actingId === req.id}
                onClick={() => void respond(req.id, 'reject')}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
