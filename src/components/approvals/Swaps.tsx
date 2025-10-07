'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

interface SwapRequest {
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  reason?: string
}

interface Props {
  onUpdate: () => void
}

export default function ApprovalsSwaps({ onUpdate }: Props) {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'dateISO' | 'requesterName'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadSwapRequests()
    
    // Listener per aggiornamenti
    const handleUpdate = () => loadSwapRequests()
    window.addEventListener('shift_swaps_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('shift_swaps_updated', handleUpdate)
    }
  }, [])

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
      window.dispatchEvent(new CustomEvent('shift_swaps_updated'))
    } catch (error) {
      console.error('Errore nel salvataggio richieste swap:', error)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      const updatedRequests = swapRequests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'APPROVED' as const,
            decidedBy: session?.user?.id || '',
            decidedAt: new Date().toISOString()
          }
        }
        return req
      })
      
      saveSwapRequests(updatedRequests)
      notifyCustom('✅ Cambio turno approvato', 'success')
      onUpdate()
      logReadAction('shift_swap_approved', { requestId })
    } catch (error) {
      notifyCustom('Errore nell\'approvazione del cambio turno', 'error')
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('Motivo del rifiuto:')
    if (!reason) return
    
    try {
      const updatedRequests = swapRequests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'REJECTED' as const,
            decidedBy: session?.user?.id || '',
            decidedAt: new Date().toISOString(),
            reason
          }
        }
        return req
      })
      
      saveSwapRequests(updatedRequests)
      notifyCustom('❌ Cambio turno rifiutato', 'warning')
      onUpdate()
      logReadAction('shift_swap_rejected', { requestId, reason })
    } catch (error) {
      notifyCustom('Errore nel rifiuto del cambio turno', 'error')
    }
  }

  const handleBulkApprove = async (requestIds: string[]) => {
    try {
      const updatedRequests = swapRequests.map(req => {
        if (requestIds.includes(req.id)) {
          return {
            ...req,
            status: 'APPROVED' as const,
            decidedBy: session?.user?.id || '',
            decidedAt: new Date().toISOString()
          }
        }
        return req
      })
      
      saveSwapRequests(updatedRequests)
      notifyCustom(`✅ ${requestIds.length} cambi turno approvati`, 'success')
      onUpdate()
      logReadAction('shift_swaps_bulk_approved', { count: requestIds.length })
    } catch (error) {
      notifyCustom('Errore nell\'approvazione multipla', 'error')
    }
  }

  // Filtra e ordina richieste
  const filteredRequests = swapRequests
    .filter(req => {
      if (filterStatus !== 'all' && req.status !== filterStatus) return false
      if (filterDepartment !== 'all' && req.requesterDepartment !== filterDepartment) return false
      return true
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'dateISO':
          aValue = new Date(a.dateISO)
          bValue = new Date(b.dateISO)
          break
        case 'requesterName':
          aValue = a.requesterName
          bValue = b.requesterName
          break
        default:
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
      }
      
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'In Attesa'
      case 'APPROVED': return 'Approvato'
      case 'REJECTED': return 'Rifiutato'
      default: return status
    }
  }

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'cucina': return '🔥'
      case 'sala': return '🍽️'
      case 'bar': return '🍹'
      default: return '🏢'
    }
  }

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'cucina': return 'bg-red-50 text-red-700 border-red-200'
      case 'sala': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'bar': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.replace(/(\d{2}):(\d{2})/, '$1:$2')
  }

  const stats = {
    total: swapRequests.length,
    pending: swapRequests.filter(r => r.status === 'PENDING').length,
    approved: swapRequests.filter(r => r.status === 'APPROVED').length,
    rejected: swapRequests.filter(r => r.status === 'REJECTED').length
  }

  const pendingRequests = filteredRequests.filter(r => r.status === 'PENDING')

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-700">Totali</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-yellow-700">In Attesa</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-green-700">Approvati</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-red-700">Rifiutati</div>
        </div>
      </div>

      {/* Azioni Rapide */}
      {pendingRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">Azioni Rapide</h3>
              <p className="text-sm text-blue-700">
                {pendingRequests.length} richieste in attesa di approvazione
              </p>
            </div>
            <button
              onClick={() => handleBulkApprove(pendingRequests.map(r => r.id))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ✅ Approva Tutti
            </button>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="PENDING">In Attesa</option>
              <option value="APPROVED">Approvati</option>
              <option value="REJECTED">Rifiutati</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reparto</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="cucina">Cucina</option>
              <option value="sala">Sala</option>
              <option value="bar">Bar</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ordina per</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Data richiesta</option>
              <option value="dateISO">Data turno</option>
              <option value="requesterName">Richiedente</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista Richieste */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔄</div>
            <p className="text-gray-500">Nessuna richiesta trovata</p>
            <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
          </div>
        ) : (
          filteredRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">🔄</span>
                    <h4 className="font-medium text-gray-900">
                      Cambio turno per {request.targetEmployeeName}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Richiedente:</span>
                      <div className="font-medium flex items-center gap-2">
                        {request.requesterName}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(request.requesterDepartment)}`}>
                          {getDepartmentIcon(request.requesterDepartment)} {request.requesterDepartment}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <div className="font-medium">{formatDate(request.dateISO)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <span className="text-gray-600 text-xs">TURNO OFFERTO</span>
                      <div className="font-medium">{formatTime(request.offeredShiftTime)}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <span className="text-gray-600 text-xs">TURNO RICHIESTO</span>
                      <div className="font-medium">{formatTime(request.targetShiftTime)}</div>
                    </div>
                  </div>
                  
                  {request.status === 'REJECTED' && request.reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 font-medium">Motivo rifiuto:</span>
                      <p className="text-sm text-red-600 mt-1">{request.reason}</p>
                    </div>
                  )}
                  
                  {request.status === 'APPROVED' && request.decidedAt && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">Approvato il:</span>
                      <div className="text-sm text-green-600">
                        {new Date(request.decidedAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Azioni */}
                {request.status === 'PENDING' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                    >
                      ✅ Approva
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                    >
                      ❌ Rifiuta
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
