'use client'

import { useState } from 'react'
import { useEmployments } from '@/hooks/useEmployments'

interface Props {
  onUpdate: () => void
}

export default function ApprovalsCandidatures({ onUpdate }: Props) {
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')

  const {
    employments: requests,
    isLoading: loading,
    mutate: reloadRequests,
  } = useEmployments({
    status: filter === 'PENDING' ? 'PENDING' : undefined,
    enabled: true,
  })

  const notifyUpdated = () => {
    reloadRequests()
    onUpdate()
    window.dispatchEvent(new CustomEvent('employee_requests_updated'))
    window.dispatchEvent(new CustomEvent('approvals_updated'))
  }

  const handleApprove = async (id: string, userName: string) => {
    if (!confirm(`Vuoi approvare la richiesta di ${userName}?`)) return

    try {
      const res = await fetch(`/api/employments/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'DIPENDENTE',
          department: 'Sala',
          startDate: new Date().toISOString(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        alert(`✅ ${data.message}`)
        notifyUpdated()
      } else {
        alert(`❌ Errore: ${data.error}`)
      }
    } catch (error) {
      console.error('Errore approvazione:', error)
      alert("❌ Errore durante l'approvazione")
    }
  }

  const handleReject = async (id: string, userName: string) => {
    const reason = prompt(`Motivo del rifiuto per ${userName}:`)
    if (!reason) return

    try {
      const res = await fetch(`/api/employments/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      const data = await res.json()

      if (data.success) {
        alert(`✅ ${data.message}`)
        notifyUpdated()
      } else {
        alert(`❌ Errore: ${data.error}`)
      }
    } catch (error) {
      console.error('Errore rifiuto:', error)
      alert('❌ Errore durante il rifiuto')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            ⏳ In attesa
          </span>
        )
      case 'ACTIVE':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ✅ Attivo
          </span>
        )
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            ❌ Rifiutato
          </span>
        )
      case 'APPROVED':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            ✓ Approvato
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
            {status}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-700">Caricamento candidature...</p>
        </div>
      </div>
    )
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  return (
    <div>
      <div className="mb-6 flex gap-4">
        <button
          type="button"
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
            filter === 'PENDING'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In attesa ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
            filter === 'ALL'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tutte ({requests.length})
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-gray-600 mb-2">Nessuna candidatura trovata</p>
          <p className="text-sm text-gray-400">
            {filter === 'PENDING'
              ? 'Non ci sono richieste in attesa di approvazione'
              : 'Non ci sono candidature nel sistema'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-orange-300 transition p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="text-4xl shrink-0">
                    {request.user?.name?.slice(0, 1).toUpperCase() || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.user?.name || 'Utente'}
                      </h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>📧</span>
                        <span>{request.user?.email || ''}</span>
                      </div>
                      {request.user?.phone && (
                        <div className="flex items-center gap-2">
                          <span>📱</span>
                          <span>{request.user.phone}</span>
                        </div>
                      )}
                      {(request as { department?: string | null }).department && (
                        <div className="flex items-center gap-2">
                          <span>🏢</span>
                          <span>
                            Reparto:{' '}
                            {(request as { department?: string | null }).department}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span>👔</span>
                        <span>Ruolo: {request.role}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>📅</span>
                        <span>
                          Richiesto:{' '}
                          {new Date(request.createdAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {request.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleApprove(request.id, request.user?.name || 'Utente')
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleReject(request.id, request.user?.name || 'Utente')
                      }
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      Rifiuta
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <p className="font-medium text-blue-900 mb-1">Suggerimento</p>
            <p className="text-sm text-blue-700">
              Le candidature approvate diventano dipendenti attivi del ristorante.
              Puoi gestire i dettagli del contratto dalla pagina team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
