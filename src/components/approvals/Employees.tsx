'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'
import { formatEuro } from '@/lib/utils'

interface EmployeeRequest {
  id: string
  type: 'new_employee' | 'role_change' | 'salary_change' | 'termination' | 'activation'
  employeeName: string
  employeeId: string
  department: string
  currentRole?: string
  newRole?: string
  currentSalary?: number
  newSalary?: number
  reason: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  metadata?: {
    source?: 'api_employments' | 'local'
    restaurantId?: string
  }
}

interface Props {
  onUpdate: () => void
}

export default function ApprovalsEmployees({ onUpdate }: Props) {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [requests, setRequests] = useState<EmployeeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy] = useState<'createdAt' | 'employeeName' | 'type'>('createdAt')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadRequests()
    
    // Listener per aggiornamenti
    const handleUpdate = () => loadRequests()
    window.addEventListener('employee_requests_updated', handleUpdate)
    window.addEventListener('approvals_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('employee_requests_updated', handleUpdate)
      window.removeEventListener('approvals_updated', handleUpdate)
    }
  }, [session?.user?.restaurantId])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: 'PENDING' })
      const restaurantId = session?.user?.restaurantId
      if (restaurantId) params.set('restaurantId', restaurantId)

      const res = await fetch(`/api/employments?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Caricamento fallito')

      const json = await res.json()
      const emps = (json.employments || json.data || []) as Array<Record<string, unknown>>
      const mapped: EmployeeRequest[] = emps
        .filter((e) => String((e as { status?: string }).status || '').toUpperCase() === 'PENDING')
        .map((e) => {
          const user = (e as { user?: { id?: string; name?: string; email?: string } }).user
          return {
            id: String((e as { id?: string }).id || ''),
            type: 'new_employee',
            employeeName: user?.name || String((e as { userId?: string }).userId || ''),
            employeeId: user?.id || String((e as { userId?: string }).userId || ''),
            department: String((e as { department?: string }).department || '').toLowerCase(),
            newRole: String((e as { role?: string }).role || ''),
            reason: 'Nuova richiesta di assunzione',
            requestedBy: user?.email || 'Sistema',
            status: 'PENDING',
            createdAt: String((e as { createdAt?: string }).createdAt || new Date().toISOString()),
            metadata: {
              source: 'api_employments',
              restaurantId: String((e as { restaurantId?: string }).restaurantId || ''),
            },
          }
        })
      setRequests(mapped)
    } catch (error) {
      console.error('Errore nel caricamento richieste dipendenti:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      // Prova a confermare via API employments
      await fetch('/api/employments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: 'APPROVED', reviewedBy: session?.user?.id })
      })
      await loadRequests()
      notifyCustom('SUCCESS', 'PERSONNEL', 'Richiesta dipendente', 'Richiesta dipendente approvata')
      onUpdate()
      logReadAction('employee_request_approved')
    } catch (error) {
      notifyCustom('ERROR', 'PERSONNEL', 'Richiesta dipendente', 'Errore nell\'approvazione della richiesta')
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('Motivo del rifiuto:')
    if (!reason) return
    
    try {
      await fetch('/api/employments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: 'REJECTED', reviewedBy: session?.user?.id })
      })
      await loadRequests()
      notifyCustom('WARNING', 'PERSONNEL', 'Richiesta dipendente', 'Richiesta dipendente rifiutata')
      onUpdate()
      logReadAction('employee_request_rejected')
    } catch (error) {
      notifyCustom('ERROR', 'PERSONNEL', 'Richiesta dipendente', 'Errore nel rifiuto della richiesta')
    }
  }

  const sortedRequests = [...requests].sort((a, b) => {
      let aValue: string | Date, bValue: string | Date
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'employeeName':
          aValue = a.employeeName
          bValue = b.employeeName
          break
        case 'type':
          aValue = a.type
          bValue = b.type
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
      case 'APPROVED': return 'Approvata'
      case 'REJECTED': return 'Rifiutata'
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_employee': return '👤'
      case 'role_change': return '⬆️'
      case 'salary_change': return '💰'
      case 'termination': return '🚪'
      case 'activation': return '✅'
      default: return '📝'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'new_employee': return 'Nuovo Dipendente'
      case 'role_change': return 'Cambio Ruolo'
      case 'salary_change': return 'Cambio Stipendio'
      case 'termination': return 'Licenziamento'
      case 'activation': return 'Attivazione'
      default: return type
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Caricamento richieste...</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {sortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-600">Nessuna richiesta dipendente in attesa</p>
          </div>
        ) : (
          sortedRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{getTypeIcon(request.type)}</span>
                    <h4 className="font-medium text-gray-900">{request.employeeName}</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTypeLabel(request.type)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Reparto:</span>
                      <div className="font-medium flex items-center gap-1">
                        {getDepartmentIcon(request.department)} {request.department}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Richiesta da:</span>
                      <div className="font-medium">{request.requestedBy}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <div className="font-medium">{formatDate(request.createdAt)}</div>
                    </div>
                  </div>
                  
                  {/* Dettagli specifici per tipo */}
                  {request.type === 'new_employee' && (
                    <div className="bg-green-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Nuovo Ruolo:</span>
                          <div className="font-medium">{request.newRole}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Stipendio:</span>
                          <div className="font-medium">{formatEuro(request.newSalary || 0)}/ora</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {request.type === 'role_change' && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Da:</span>
                          <div className="font-medium">{request.currentRole}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">A:</span>
                          <div className="font-medium">{request.newRole}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {request.type === 'salary_change' && (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Da:</span>
                          <div className="font-medium">{formatEuro(request.currentSalary || 0)}/ora</div>
                        </div>
                        <div>
                          <span className="text-gray-600">A:</span>
                          <div className="font-medium">{formatEuro(request.newSalary || 0)}/ora</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">Motivo:</span>
                    <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                  </div>
                  
                  {request.status === 'REJECTED' && request.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 font-medium">Motivo rifiuto:</span>
                      <p className="text-sm text-red-600 mt-1">{request.rejectionReason}</p>
                    </div>
                  )}
                  
                  {request.status === 'APPROVED' && request.approvedAt && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">Approvata il:</span>
                      <div className="text-sm text-green-600">
                        {formatDate(request.approvedAt)}
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
