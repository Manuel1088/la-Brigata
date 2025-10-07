'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

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
  metadata: Record<string, any>
}

interface Props {
  onUpdate: () => void
}

export default function ApprovalsEmployees({ onUpdate }: Props) {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [requests, setRequests] = useState<EmployeeRequest[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'employeeName' | 'type'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadRequests()
    
    // Listener per aggiornamenti
    const handleUpdate = () => loadRequests()
    window.addEventListener('employee_requests_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('employee_requests_updated', handleUpdate)
    }
  }, [])

  const loadRequests = () => {
    try {
      const raw = localStorage.getItem('employee_requests')
      if (raw) {
        setRequests(JSON.parse(raw))
      } else {
        // Dati di esempio per demo
        const mockRequests: EmployeeRequest[] = [
          {
            id: 'emp_req_1',
            type: 'new_employee',
            employeeName: 'Mario Rossi',
            employeeId: 'emp_123',
            department: 'cucina',
            newRole: 'CHEF_DE_PARTIE',
            newSalary: 18.00,
            reason: 'Nuovo dipendente assunto come Chef de Partie',
            requestedBy: 'Giuseppe Verdi',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            metadata: {
              skills: ['Cucina Italiana', 'Grill'],
              experience: '3 anni',
              contractType: 'full-time'
            }
          },
          {
            id: 'emp_req_2',
            type: 'salary_change',
            employeeName: 'Anna Bianchi',
            employeeId: 'emp_456',
            department: 'sala',
            currentRole: 'DIPENDENTE_SALA',
            newRole: 'DIPENDENTE_SALA',
            currentSalary: 12.00,
            newSalary: 14.00,
            reason: 'Aumento stipendio per performance eccellenti',
            requestedBy: 'Marco Neri',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            metadata: {
              performanceScore: 9.5,
              monthsWorked: 24,
              lastReview: '2024-01-15'
            }
          },
          {
            id: 'emp_req_3',
            type: 'role_change',
            employeeName: 'Luigi Verde',
            employeeId: 'emp_789',
            department: 'bar',
            currentRole: 'DIPENDENTE_BAR',
            newRole: 'RESPONSABILE_BAR',
            currentSalary: 13.00,
            newSalary: 16.00,
            reason: 'Promozione a Responsabile Bar',
            requestedBy: 'Sofia Blu',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            metadata: {
              certifications: ['Bartender License'],
              leadership: true,
              teamSize: 3
            }
          }
        ]
        
        setRequests(mockRequests)
        localStorage.setItem('employee_requests', JSON.stringify(mockRequests))
      }
    } catch (error) {
      console.error('Errore nel caricamento richieste dipendenti:', error)
    }
  }

  const saveRequests = (updatedRequests: EmployeeRequest[]) => {
    try {
      localStorage.setItem('employee_requests', JSON.stringify(updatedRequests))
      setRequests(updatedRequests)
      window.dispatchEvent(new CustomEvent('employee_requests_updated'))
    } catch (error) {
      console.error('Errore nel salvataggio richieste dipendenti:', error)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      const updatedRequests = requests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'APPROVED' as const,
            approvedBy: session?.user?.id || '',
            approvedAt: new Date().toISOString()
          }
        }
        return req
      })
      
      saveRequests(updatedRequests)
      notifyCustom('✅ Richiesta dipendente approvata', 'success')
      onUpdate()
      logReadAction('employee_request_approved', { requestId })
    } catch (error) {
      notifyCustom('Errore nell\'approvazione della richiesta', 'error')
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('Motivo del rifiuto:')
    if (!reason) return
    
    try {
      const updatedRequests = requests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'REJECTED' as const,
            rejectedBy: session?.user?.id || '',
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason
          }
        }
        return req
      })
      
      saveRequests(updatedRequests)
      notifyCustom('❌ Richiesta dipendente rifiutata', 'warning')
      onUpdate()
      logReadAction('employee_request_rejected', { requestId, reason })
    } catch (error) {
      notifyCustom('Errore nel rifiuto della richiesta', 'error')
    }
  }

  // Filtra e ordina richieste
  const filteredRequests = requests
    .filter(req => {
      if (filterStatus !== 'all' && req.status !== filterStatus) return false
      if (filterType !== 'all' && req.type !== filterType) return false
      if (filterDepartment !== 'all' && req.department !== filterDepartment) return false
      return true
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length
  }

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
          <div className="text-sm text-green-700">Approvate</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-red-700">Rifiutate</div>
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
              <option value="new_employee">Nuovo Dipendente</option>
              <option value="role_change">Cambio Ruolo</option>
              <option value="salary_change">Cambio Stipendio</option>
              <option value="termination">Licenziamento</option>
              <option value="activation">Attivazione</option>
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
              <option value="employeeName">Dipendente</option>
              <option value="type">Tipo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Richieste */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👥</div>
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
                          <div className="font-medium">{formatCurrency(request.newSalary || 0)}/ora</div>
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
                          <div className="font-medium">{formatCurrency(request.currentSalary || 0)}/ora</div>
                        </div>
                        <div>
                          <span className="text-gray-600">A:</span>
                          <div className="font-medium">{formatCurrency(request.newSalary || 0)}/ora</div>
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
