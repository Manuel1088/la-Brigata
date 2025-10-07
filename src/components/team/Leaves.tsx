'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useAudit } from '@/hooks/useAudit'
import { useNotifications } from '@/hooks/useNotifications'
import { 
  getLeaveBalances, 
  getLeaveRequests, 
  getLeaveStats, 
  LEAVE_TYPES,
  LeaveBalance,
  LeaveRequest,
  acceptLeaveProposal,
  rejectLeaveProposal,
  counterProposeLeaveDates,
  proposeLeaveDates,
  updateLeaveRequestStatus 
} from '@/lib/leaveSystem'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import { UserRole } from '@/types/roles'

export default function TeamLeaves() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { 
    canRequestLeave, 
    canApproveLeave, 
    canViewAllLeaves, 
    canExportLeaves,
    canViewLeaveCalendar,
    canManageLeaveBalance,
    userRole
  } = usePermissions()
  
  const { logReadAction } = useAudit()
  const { notifyProposalAccepted, notifyProposalRejected, notifyLeaveProposed } = useNotifications()
  
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'requests' | 'calendar' | 'balances'>('requests')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const { employees: employeesData, isLoading } = useEmployeeContext()

  // Carica dati
  useEffect(() => {
    const loadData = () => {
      try {
        setBalances(getLeaveBalances())
        setRequests(getLeaveRequests())
        setStats(getLeaveStats())
      } catch (error) {
        console.error('Errore nel caricamento dati ferie:', error)
      }
    }
    
    loadData()
    
    // Listener per aggiornamenti
    const handleUpdate = () => loadData()
    window.addEventListener('leave_system_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('leave_system_updated', handleUpdate)
    }
  }, [])

  // Filtra richieste
  const filteredRequests = requests.filter(req => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false
    if (filterEmployee !== 'all' && req.employeeName !== filterEmployee) return false
    if (filterType !== 'all' && req.type !== filterType) return false
    return true
  })

  // Gestione approvazione/rifiuto
  const handleApproveLeave = async (requestId: string) => {
    try {
      const updated = acceptLeaveProposal(requestId)
      setRequests(updated)
      notifyProposalAccepted('Richiesta ferie approvata')
      logReadAction('leave_approved', { requestId })
    } catch (error) {
      console.error('Errore nell\'approvazione:', error)
    }
  }

  const handleRejectLeave = async (requestId: string, reason: string) => {
    try {
      const updated = rejectLeaveProposal(requestId, reason)
      setRequests(updated)
      notifyProposalRejected('Richiesta ferie rifiutata')
      logReadAction('leave_rejected', { requestId, reason })
    } catch (error) {
      console.error('Errore nel rifiuto:', error)
    }
  }

  const handleCounterPropose = async (requestId: string, alternativeDates: string[]) => {
    try {
      const updated = counterProposeLeaveDates(requestId, alternativeDates)
      setRequests(updated)
      notifyLeaveProposed('Date alternative proposte')
      logReadAction('leave_counter_proposed', { requestId, alternativeDates })
    } catch (error) {
      console.error('Errore nella controproposta:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'counter_proposed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'In Attesa'
      case 'approved': return 'Approvata'
      case 'rejected': return 'Rifiutata'
      case 'counter_proposed': return 'Controproposta'
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vacation': return '🏖️'
      case 'sick': return '🤒'
      case 'personal': return '👤'
      case 'emergency': return '🚨'
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

  return (
    <PermissionGuard permission="leaves_view">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🏖️ Ferie e Permessi</h2>
              <p className="text-gray-600 mt-1">Gestisci richieste ferie e permessi del team</p>
            </div>
            
            <div className="flex gap-2">
              {canRequestLeave() && (
                <button
                  onClick={() => router.push('/leaves/new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  ➕ Nuova Richiesta
                </button>
              )}
              
              {canExportLeaves() && (
                <button
                  onClick={() => {/* Export logic */}}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  📊 Esporta
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Statistiche */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRequests}</div>
              <div className="text-sm text-blue-700">Richieste Totali</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
              <div className="text-sm text-yellow-700">In Attesa</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approvedRequests}</div>
              <div className="text-sm text-green-700">Approvate</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalDays}</div>
              <div className="text-sm text-purple-700">Giorni Totali</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setSelectedTab('requests')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm transition ${
                  selectedTab === 'requests'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Richieste
              </button>
              <button
                onClick={() => setSelectedTab('calendar')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm transition ${
                  selectedTab === 'calendar'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📅 Calendario
              </button>
              <button
                onClick={() => setSelectedTab('balances')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm transition ${
                  selectedTab === 'balances'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                💰 Saldi
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab Richieste */}
            {selectedTab === 'requests' && (
              <div className="space-y-6">
                {/* Filtri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Tutti</option>
                      <option value="pending">In Attesa</option>
                      <option value="approved">Approvate</option>
                      <option value="rejected">Rifiutate</option>
                      <option value="counter_proposed">Controproposte</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dipendente</label>
                    <select
                      value={filterEmployee}
                      onChange={(e) => setFilterEmployee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Tutti</option>
                      {employeesData?.map((emp: any) => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                      ))}
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
                      <option value="vacation">Ferie</option>
                      <option value="sick">Malattia</option>
                      <option value="personal">Personali</option>
                      <option value="emergency">Emergenza</option>
                    </select>
                  </div>
                </div>

                {/* Lista richieste */}
                <div className="space-y-4">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📋</div>
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
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Periodo:</span>
                                <div className="font-medium">{formatDateRange(request.startDate, request.endDate)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Tipo:</span>
                                <div className="font-medium capitalize">{request.type}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Richiesta:</span>
                                <div className="font-medium">{formatDate(request.requestDate)}</div>
                              </div>
                            </div>
                            
                            {request.reason && (
                              <div className="mt-3">
                                <span className="text-sm text-gray-600">Motivo:</span>
                                <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                              </div>
                            )}
                            
                            {request.status === 'rejected' && request.rejectionReason && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                <span className="text-sm text-red-700 font-medium">Motivo rifiuto:</span>
                                <p className="text-sm text-red-600 mt-1">{request.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                          
                          {canApproveLeave() && request.status === 'pending' && (
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleApproveLeave(request.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                              >
                                ✅ Approva
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Motivo del rifiuto:')
                                  if (reason) handleRejectLeave(request.id, reason)
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                              >
                                ❌ Rifiuta
                              </button>
                              <button
                                onClick={() => {
                                  const dates = prompt('Date alternative (formato: YYYY-MM-DD,YYYY-MM-DD):')
                                  if (dates) {
                                    const dateArray = dates.split(',').map(d => d.trim())
                                    handleCounterPropose(request.id, dateArray)
                                  }
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                              >
                                🔄 Controproposta
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab Calendario */}
            {selectedTab === 'calendar' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-gray-500">Calendario ferie in sviluppo</p>
                  <p className="text-sm text-gray-400 mt-1">Prossimamente disponibile</p>
                </div>
              </div>
            )}

            {/* Tab Saldi */}
            {selectedTab === 'balances' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Saldi Ferie e Permessi</h3>
                  <button
                    onClick={() => setShowBalanceDetails(!showBalanceDetails)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                  >
                    {showBalanceDetails ? 'Nascondi' : 'Mostra'} Dettagli
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {balances.map(balance => (
                    <div key={balance.employeeName} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{balance.employeeName}</h4>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ferie:</span>
                          <span className="font-medium">{balance.vacationDays} giorni</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ROL:</span>
                          <span className="font-medium">{balance.rolDays} giorni</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Permessi:</span>
                          <span className="font-medium">{balance.personalDays} giorni</span>
                        </div>
                      </div>
                      
                      {showBalanceDetails && (
                        <div className="mt-4 pt-4 border-t space-y-2 text-xs text-gray-600">
                          <div>Carryover ferie: {balance.vacationCarryover || 0} giorni</div>
                          <div>Carryover ROL: {balance.rolCarryover || 0} giorni</div>
                          <div>Ultimo aggiornamento: {formatDate(balance.lastUpdated)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
