'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { usePermissions } from '@/hooks/usePermissions'

interface SwapRequest {
  id: string
  requester: string
  targetEmployee: string
  targetDepartment: string
  dayIndex: number
  dateISO: string
  targetShiftTime: string
  offeredShiftTime: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  processedAt?: string
  processedBy?: string
}

export default function ShiftsSwaps() {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { canManageEmployees } = usePermissions()
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [swapVersion, setSwapVersion] = useState(0)

  // Carica richieste swap
  useEffect(() => {
    loadSwapRequests()
  }, [swapVersion])

  const loadSwapRequests = () => {
    try {
      const raw = localStorage.getItem('shift_swap_requests_v1')
      if (raw) {
        setSwapRequests(JSON.parse(raw))
      }
    } catch (error) {
      console.error('Errore nel caricamento richieste swap:', error)
    }
  }

  const saveSwapRequests = (requests: SwapRequest[]) => {
    try {
      localStorage.setItem('shift_swap_requests_v1', JSON.stringify(requests))
      setSwapRequests(requests)
    } catch (error) {
      console.error('Errore nel salvataggio richieste swap:', error)
    }
  }

  // Filtra richieste
  const filteredRequests = swapRequests.filter(request => {
    if (showPendingOnly && request.status !== 'pending') return false
    if (deptFilter !== 'all' && request.targetDepartment !== deptFilter) return false
    return true
  })

  // Gestione approvazione/rifiuto
  const handleApprove = (requestId: string) => {
    if (!canManageEmployees()) {
      notifyCustom('Non hai i permessi per approvare richieste', 'error')
      return
    }

    const updatedRequests = swapRequests.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: 'approved' as const,
          processedAt: new Date().toISOString(),
          processedBy: session?.user?.name || 'Manager'
        }
      }
      return req
    })

    saveSwapRequests(updatedRequests)
    notifyCustom('Richiesta approvata!', 'success')
    setSwapVersion(prev => prev + 1)
  }

  const handleReject = (requestId: string) => {
    if (!canManageEmployees()) {
      notifyCustom('Non hai i permessi per rifiutare richieste', 'error')
      return
    }

    const updatedRequests = swapRequests.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: 'rejected' as const,
          processedAt: new Date().toISOString(),
          processedBy: session?.user?.name || 'Manager'
        }
      }
      return req
    })

    saveSwapRequests(updatedRequests)
    notifyCustom('Richiesta rifiutata', 'info')
    setSwapVersion(prev => prev + 1)
  }

  // Statistiche
  const stats = {
    pending: swapRequests.filter(r => r.status === 'pending').length,
    approved: swapRequests.filter(r => r.status === 'approved').length,
    rejected: swapRequests.filter(r => r.status === 'rejected').length,
    total: swapRequests.length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'In Attesa'
      case 'approved': return 'Approvata'
      case 'rejected': return 'Rifiutata'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDayName = (dayIndex: number) => {
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    return days[dayIndex] || 'N/A'
  }

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔄 Scambi Turni</h2>
            <p className="text-gray-600 mt-1">Gestisci le richieste di cambio turno</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pendingOnly"
                checked={showPendingOnly}
                onChange={(e) => setShowPendingOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="pendingOnly" className="text-sm text-gray-700">
                Solo in attesa
              </label>
            </div>
            
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti i reparti</option>
              <option value="cucina">Cucina</option>
              <option value="sala">Sala</option>
              <option value="bar">Bar</option>
            </select>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-700">In Attesa</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-green-700">Approvate</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-red-700">Rifiutate</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
            <div className="text-sm text-gray-700">Totale</div>
          </div>
        </div>
      </div>

      {/* Lista richieste */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Richieste di Scambio ({filteredRequests.length})
          </h3>
        </div>
        
        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔄</div>
              <p className="text-gray-500">Nessuna richiesta di scambio trovata</p>
              <p className="text-sm text-gray-400 mt-1">
                {showPendingOnly ? 'Non ci sono richieste in attesa' : 'Non ci sono richieste con i filtri selezionati'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">{request.requester}</span>
                        <span className="text-gray-500">→</span>
                        <span className="font-medium text-gray-900">{request.targetEmployee}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Giorno:</span>
                          <span className="ml-2 font-medium">
                            {getDayName(request.dayIndex)} ({formatDate(request.dateISO)})
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reparto:</span>
                          <span className="ml-2 font-medium capitalize">{request.targetDepartment}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Richiesta:</span>
                          <span className="ml-2 text-sm">
                            {formatDate(request.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-sm text-red-700 font-medium">Turno da scambiare</div>
                          <div className="text-red-900">{request.targetShiftTime}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-sm text-green-700 font-medium">Turno offerto</div>
                          <div className="text-green-900">{request.offeredShiftTime}</div>
                        </div>
                      </div>
                      
                      {request.processedAt && (
                        <div className="mt-3 text-xs text-gray-500">
                          {request.status === 'approved' ? 'Approvata' : 'Rifiutata'} il {formatDate(request.processedAt)} 
                          {request.processedBy && ` da ${request.processedBy}`}
                        </div>
                      )}
                    </div>
                    
                    {canManageEmployees() && request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          ✅ Approva
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          ❌ Rifiuta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
