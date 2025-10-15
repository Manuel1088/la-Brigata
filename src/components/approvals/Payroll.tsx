'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

interface PayrollRequest {
  id: string
  type: 'salary_adjustment' | 'bonus' | 'deduction' | 'overtime' | 'expense_reimbursement'
  employeeName: string
  employeeId: string
  department: string
  amount: number
  description: string
  reason: string
  period: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  metadata: Record<string, unknown>
}

interface Props {
  onUpdate: () => void
}

export default function ApprovalsPayroll({ onUpdate }: Props) {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [requests, setRequests] = useState<PayrollRequest[]>([])
  const [filterStatus, setFilterStatus] = useState<'all'|'PENDING'|'APPROVED'|'REJECTED'>('PENDING')
  const [filterType, setFilterType] = useState<'all'|'salary_adjustment'|'bonus'|'deduction'|'overtime'|'expense_reimbursement'>('all')
  const [filterDepartment, setFilterDepartment] = useState<'all'|'cucina'|'sala'|'beverage'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'employeeName'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadRequests()
    
    // Listener per aggiornamenti
    const handleUpdate = () => loadRequests()
    window.addEventListener('payroll_requests_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('payroll_requests_updated', handleUpdate)
    }
  }, [])

  const loadRequests = () => {
    try {
      const raw = localStorage.getItem('payroll_requests')
      if (raw) {
        setRequests(JSON.parse(raw))
      } else {
        // Dati di esempio per demo
        const mockRequests: PayrollRequest[] = [
          {
            id: 'pay_req_1',
            type: 'bonus',
            employeeName: 'Giuseppe Rossi',
            employeeId: 'emp_123',
            department: 'cucina',
            amount: 500.00,
            description: 'Bonus performance Q4 2024',
            reason: 'Performance eccellente nel quarto trimestre',
            period: '2024-Q4',
            requestedBy: 'Marco Verdi',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            metadata: {
              performanceScore: 9.8,
              targetAchieved: 120,
              category: 'performance'
            }
          },
          {
            id: 'pay_req_2',
            type: 'overtime',
            employeeName: 'Anna Bianchi',
            employeeId: 'emp_456',
            department: 'sala',
            amount: 180.00,
            description: 'Ore straordinarie Dicembre 2024',
            reason: 'Ore extra per eventi natalizi',
            period: '2024-12',
            requestedBy: 'Luigi Neri',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            metadata: {
              hoursWorked: 12,
              hourlyRate: 15.00,
              dates: ['2024-12-20', '2024-12-21', '2024-12-22']
            }
          },
          {
            id: 'pay_req_3',
            type: 'expense_reimbursement',
            employeeName: 'Mario Blu',
            employeeId: 'emp_789',
            department: 'bar',
            amount: 85.50,
            description: 'Rimborso spese formazione',
            reason: 'Corso di mixologia avanzata',
            period: '2024-12',
            requestedBy: 'Sofia Verde',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            metadata: {
              receiptUrl: 'receipt_123.pdf',
              category: 'training',
              certification: 'Advanced Mixology'
            }
          },
          {
            id: 'pay_req_4',
            type: 'salary_adjustment',
            employeeName: 'Elena Rosa',
            employeeId: 'emp_101',
            department: 'sala',
            amount: 320.00,
            description: 'Aumento stipendio mensile',
            reason: 'Promozione a Responsabile Sala',
            period: '2025-01',
            requestedBy: 'Paolo Giallo',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            metadata: {
              oldSalary: 2200.00,
              newSalary: 2520.00,
              effectiveDate: '2025-01-01'
            }
          }
        ]
        
        setRequests(mockRequests)
        localStorage.setItem('payroll_requests', JSON.stringify(mockRequests))
      }
    } catch (error) {
      console.error('Errore nel caricamento richieste payroll:', error)
    }
  }

  const saveRequests = (updatedRequests: PayrollRequest[]) => {
    try {
      localStorage.setItem('payroll_requests', JSON.stringify(updatedRequests))
      setRequests(updatedRequests)
      window.dispatchEvent(new CustomEvent('payroll_requests_updated'))
    } catch (error) {
      console.error('Errore nel salvataggio richieste payroll:', error)
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
      notifyCustom('SUCCESS','PERSONNEL','Richiesta payroll','✅ Richiesta approvata')
      onUpdate()
      logReadAction('payroll_request_approved')
    } catch (error) {
      notifyCustom('ERROR','PERSONNEL','Errore','Errore nell\'approvazione della richiesta')
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
      notifyCustom('WARNING','PERSONNEL','Richiesta payroll','❌ Richiesta rifiutata')
      onUpdate()
      logReadAction('payroll_request_rejected')
    } catch (error) {
      notifyCustom('ERROR','PERSONNEL','Errore','Errore nel rifiuto della richiesta')
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
      let aValue: number|string|Date
      let bValue: number|string|Date
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
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
      case 'salary_adjustment': return '💰'
      case 'bonus': return '🎁'
      case 'deduction': return '📉'
      case 'overtime': return '⏰'
      case 'expense_reimbursement': return '🧾'
      default: return '💳'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'salary_adjustment': return 'Aggiustamento Stipendio'
      case 'bonus': return 'Bonus'
      case 'deduction': return 'Detrazione'
      case 'overtime': return 'Ore Straordinarie'
      case 'expense_reimbursement': return 'Rimborso Spese'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'salary_adjustment': return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'bonus': return 'bg-green-50 text-green-800 border-green-200'
      case 'deduction': return 'bg-red-50 text-red-800 border-red-200'
      case 'overtime': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'expense_reimbursement': return 'bg-purple-50 text-purple-800 border-purple-200'
      default: return 'bg-gray-50 text-gray-800 border-gray-200'
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
    if (isNaN(amount)) return '€0,00'
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
    totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
    pendingAmount: requests.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.amount, 0)
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-purple-600">{formatCurrency(stats.totalAmount)}</div>
          <div className="text-sm text-purple-700">Totale</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</div>
          <div className="text-sm text-orange-700">In Attesa</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all'|'PENDING'|'APPROVED'|'REJECTED')}
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
              onChange={(e) => setFilterType(e.target.value as 'all'|'salary_adjustment'|'bonus'|'deduction'|'overtime'|'expense_reimbursement')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="salary_adjustment">Aggiustamento Stipendio</option>
              <option value="bonus">Bonus</option>
              <option value="deduction">Detrazione</option>
              <option value="overtime">Ore Straordinarie</option>
              <option value="expense_reimbursement">Rimborso Spese</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reparto</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value as 'all'|'cucina'|'sala'|'beverage')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="cucina">Cucina</option>
              <option value="sala">Sala</option>
              <option value="beverage">Beverage</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ordina per</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'createdAt'|'amount'|'employeeName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Data richiesta</option>
              <option value="amount">Importo</option>
              <option value="employeeName">Dipendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Richieste */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💰</div>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(request.type)}`}>
                      {getTypeLabel(request.type)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Importo:</span>
                      <div className="font-medium text-lg">{formatCurrency(request.amount)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Reparto:</span>
                      <div className="font-medium flex items-center gap-1">
                        {getDepartmentIcon(request.department)} {request.department}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Periodo:</span>
                      <div className="font-medium">{request.period}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Richiesta:</span>
                      <div className="font-medium">{formatDate(request.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">Descrizione:</span>
                    <p className="text-sm text-gray-900 font-medium">{request.description}</p>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">Motivo:</span>
                    <p className="text-sm text-gray-900">{request.reason}</p>
                  </div>
                  
                  {/* Dettagli specifici per tipo */}
                  {request.type === 'overtime' && (() => {
                    const md = (request.metadata as unknown)
                    const m = (md && typeof md === 'object') ? (md as Record<string, unknown>) : {}
                    const hoursWorked = typeof m.hoursWorked === 'number' ? m.hoursWorked : Number(m.hoursWorked ?? 0)
                    return Boolean(hoursWorked)
                  })() && (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Ore lavorate:</span>
                          <div className="font-medium">{(() => { const m = (request.metadata && typeof request.metadata === 'object' ? request.metadata as Record<string, unknown> : {}); const v = typeof m.hoursWorked === 'number' ? m.hoursWorked : Number(m.hoursWorked ?? 0); return `${v}h` })()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tariffa oraria:</span>
                          <div className="font-medium">{(() => { const m = (request.metadata && typeof request.metadata === 'object' ? request.metadata as Record<string, unknown> : {}); const v = typeof m.hourlyRate === 'number' ? m.hourlyRate : Number(m.hourlyRate ?? 0); return formatCurrency(v) })()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <div className="font-medium">{(() => { const m = (request.metadata && typeof request.metadata === 'object' ? request.metadata as Record<string, unknown> : {}); const d = m.dates; return Array.isArray(d) ? d.join(', ') : '' })()}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {request.type === 'expense_reimbursement' && (
                    <div className="bg-purple-50 rounded-lg p-3 mb-3">
                      <div className="text-sm">
                        <span className="text-gray-600">Certificazione:</span>
                        <div className="font-medium">{(() => { const m = (request.metadata && typeof request.metadata === 'object' ? request.metadata as Record<string, unknown> : {}); return String(m.certification ?? '') })()}</div>
                        {(() => { const m = (request.metadata && typeof request.metadata === 'object' ? request.metadata as Record<string, unknown> : {}); return Boolean(m.receiptUrl) })() && (
                          <button className="mt-1 text-blue-600 hover:text-blue-800 underline">
                            📄 Visualizza ricevuta
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
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
