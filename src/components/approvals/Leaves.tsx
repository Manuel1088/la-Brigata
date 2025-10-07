'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'
import { 
  getLeaveRequests, 
  updateLeaveRequestStatus,
  proposeLeaveDates,
  acceptLeaveProposal,
  rejectLeaveProposal 
} from '@/lib/leaveSystem'

interface LeaveRequest {
  id: string
  userId: string
  employeeName: string
  type: string
  startDate: string
  endDate: string
  reason?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROPOSED'
  createdAt: string
  isUrgent: boolean
  attachment?: string
  proposedStartDate?: string
  proposedEndDate?: string
  proposedBy?: string
  proposedAt?: string
  proposalComment?: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
}

interface Props {
  onUpdate: () => void
}

export default function ApprovalsLeaves({ onUpdate }: Props) {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterUrgent, setFilterUrgent] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<'createdAt' | 'startDate' | 'employeeName'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadRequests()
    
    // Listener per aggiornamenti
    const handleUpdate = () => loadRequests()
    window.addEventListener('leave_system_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('leave_system_updated', handleUpdate)
    }
  }, [])

  const loadRequests = () => {
    try {
      const allRequests = getLeaveRequests()
      setRequests(allRequests)
    } catch (error) {
      console.error('Errore nel caricamento richieste ferie:', error)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      const result = updateLeaveRequestStatus(requestId, 'APPROVED', session?.user?.id || '')
      if (result.success) {
        notifyCustom('✅ Richiesta ferie approvata', 'success')
        loadRequests()
        onUpdate()
        logReadAction('leave_approved', { requestId })
      } else {
        notifyCustom(result.error || 'Errore nell\'approvazione', 'error')
      }
    } catch (error) {
      notifyCustom('Errore nell\'approvazione della richiesta', 'error')
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('Motivo del rifiuto:')
    if (!reason) return
    
    try {
      const result = updateLeaveRequestStatus(requestId, 'REJECTED', session?.user?.id || '', reason)
      if (result.success) {
        notifyCustom('❌ Richiesta ferie rifiutata', 'warning')
        loadRequests()
        onUpdate()
        logReadAction('leave_rejected', { requestId, reason })
      } else {
        notifyCustom(result.error || 'Errore nel rifiuto', 'error')
      }
    } catch (error) {
      notifyCustom('Errore nel rifiuto della richiesta', 'error')
    }
  }

  const handleCounterPropose = async (requestId: string) => {
    const newStartDate = prompt('Nuova data inizio (YYYY-MM-DD):')
    const newEndDate = prompt('Nuova data fine (YYYY-MM-DD):')
    const comment = prompt('Commento (opzionale):')
    
    if (!newStartDate || !newEndDate) return
    
    try {
      const result = proposeLeaveDates(
        requestId, 
        session?.user?.id || '',
        new Date(newStartDate),
        new Date(newEndDate),
        comment
      )
      
      if (result.success) {
        notifyCustom('🔄 Date alternative proposte', 'info')
        loadRequests()
        onUpdate()
        logReadAction('leave_counter_proposed', { requestId, newStartDate, newEndDate })
      } else {
        notifyCustom(result.error || 'Errore nella controproposta', 'error')
      }
    } catch (error) {
      notifyCustom('Errore nella controproposta', 'error')
    }
  }

  const handleAcceptProposal = async (requestId: string) => {
    try {
      const result = acceptLeaveProposal(requestId)
      if (result.success) {
        notifyCustom('✅ Proposta accettata', 'success')
        loadRequests()
        onUpdate()
      }
    } catch (error) {
      notifyCustom('Errore nell\'accettazione della proposta', 'error')
    }
  }

  const handleRejectProposal = async (requestId: string) => {
    try {
      const result = rejectLeaveProposal(requestId, 'Proposta non accettata')
      if (result.success) {
        notifyCustom('❌ Proposta rifiutata', 'warning')
        loadRequests()
        onUpdate()
      }
    } catch (error) {
      notifyCustom('Errore nel rifiuto della proposta', 'error')
    }
  }

  // Filtra e ordina richieste
  const filteredRequests = requests
    .filter(req => {
      if (filterStatus !== 'all' && req.status !== filterStatus) return false
      if (filterType !== 'all' && req.type !== filterType) return false
      if (filterUrgent && !req.isUrgent) return false
      return true
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'startDate':
          aValue = new Date(a.startDate)
          bValue = new Date(b.startDate)
          break
        case 'employeeName':
          aValue = a.employeeName
          bValue = b.employeeName
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
      case 'PROPOSED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'In Attesa'
      case 'APPROVED': return 'Approvata'
      case 'REJECTED': return 'Rifiutata'
      case 'PROPOSED': return 'Proposta'
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VACATION': return '🏖️'
      case 'SICK': return '🤒'
      case 'PERSONAL': return '👤'
      case 'EMERGENCY': return '🚨'
      case 'ROL': return '⏰'
      default: return '📅'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return `${formatDate(start)} - ${formatDate(end)} (${days} giorni)`
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
    urgent: requests.filter(r => r.isUrgent).length
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="text-sm text-green-700">Approvate</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-red-700">Rifiutate</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.urgent}</div>
          <div className="text-sm text-orange-700">Urgenti</div>
        </div>
      </div>

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
              <option value="APPROVED">Approvate</option>
              <option value="REJECTED">Rifiutate</option>
              <option value="PROPOSED">Proposte</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="VACATION">Ferie</option>
              <option value="SICK">Malattia</option>
              <option value="PERSONAL">Personali</option>
              <option value="EMERGENCY">Emergenza</option>
              <option value="ROL">ROL</option>
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
              <option value="startDate">Data inizio</option>
              <option value="employeeName">Dipendente</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filterUrgent}
                onChange={(e) => setFilterUrgent(e.target.checked)}
                className="mr-2"
              />
              Solo urgenti
            </label>
            
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
            <div className="text-4xl mb-2">🏖️</div>
            <p className="text-gray-500">Nessuna richiesta trovata</p>
            <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
          </div>
        ) : (
          filteredRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{getTypeIcon(request.type)}</span>
                    <h4 className="font-medium text-gray-900">{request.employeeName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                    {request.isUrgent && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        🚨 Urgente
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Periodo:</span>
                      <div className="font-medium">{formatDateRange(request.startDate, request.endDate)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Tipo:</span>
                      <div className="font-medium capitalize">{request.type.toLowerCase()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Richiesta:</span>
                      <div className="font-medium">{formatDate(request.createdAt)}</div>
                    </div>
                  </div>
                  
                  {request.reason && (
                    <div className="mb-3">
                      <span className="text-sm text-gray-600">Motivo:</span>
                      <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                    </div>
                  )}
                  
                  {request.status === 'REJECTED' && request.rejectionReason && (
                    <div className="mb-3 p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 font-medium">Motivo rifiuto:</span>
                      <p className="text-sm text-red-600 mt-1">{request.rejectionReason}</p>
                    </div>
                  )}
                  
                  {request.status === 'PROPOSED' && request.proposedStartDate && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700 font-medium">Date proposte:</span>
                      <div className="text-sm text-blue-600 mt-1">
                        {formatDateRange(request.proposedStartDate, request.proposedEndDate || request.proposedStartDate)}
                      </div>
                      {request.proposalComment && (
                        <p className="text-sm text-blue-600 mt-1">{request.proposalComment}</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Azioni */}
                <div className="flex gap-2 ml-4">
                  {request.status === 'PENDING' && (
                    <>
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
                      <button
                        onClick={() => handleCounterPropose(request.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                      >
                        🔄 Controproposta
                      </button>
                    </>
                  )}
                  
                  {request.status === 'PROPOSED' && (
                    <>
                      <button
                        onClick={() => handleAcceptProposal(request.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                      >
                        ✅ Accetta
                      </button>
                      <button
                        onClick={() => handleRejectProposal(request.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                      >
                        ❌ Rifiuta
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
