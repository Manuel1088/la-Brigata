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
  counterProposeLeaveDates 
} from '@/lib/leaveSystem'

export default function LeavesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { 
    canRequestLeave, 
    canApproveLeave, 
    canViewAllLeaves, 
    canExportLeaves,
    canViewLeaveCalendar,
    canManageLeaveBalance
  } = usePermissions()
  
  const { logReadAction } = useAudit()
  const { notifyProposalAccepted, notifyProposalRejected } = useNotifications()
  
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'balances' | 'requests' | 'calendar'>('balances')
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)
  // Stato calendario
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0,0,0,0)
    return d
  })
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null)
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Helper per date sicure
  const toSafeDate = (value: any): Date | null => {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    // Log accesso alla pagina ferie
    logReadAction('leaves')
    
    // Carica dati
    loadData()
  }, [session, status, router, logReadAction])

  const loadData = () => {
    if (session?.user?.id) {
      const userBalances = getLeaveBalances(session.user.id)
      const userRequests = getLeaveRequests(session.user.id)
      const systemStats = getLeaveStats()
      
      setBalances(userBalances)
      setRequests(userRequests)
      setStats(systemStats)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <PermissionGuard permission="ferie_view">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  🏖️ Ferie e Permessi
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                {canRequestLeave() && (
                  <button
                    onClick={() => router.push('/leaves/new')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    ➕ Nuova Richiesta
                  </button>
                )}
                
                {canExportLeaves() && (
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify({ balances, requests, stats }, null, 2)
                      const dataBlob = new Blob([dataStr], {type: 'application/json'})
                      const url = URL.createObjectURL(dataBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = 'ferie-dati.json'
                      link.click()
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    📤 Esporta
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Statistiche Generali */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="text-3xl text-blue-600">📋</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Totale Richieste</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="text-3xl text-yellow-600">⏳</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">In Attesa</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="text-3xl text-green-600">✅</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Approvate</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.approvedRequests}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="text-3xl text-red-600">🚨</div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Urgenti</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.urgentRequests}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('balances')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'balances'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    💳 I Miei Saldi
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'requests'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📋 Le Mie Richieste
                  </button>
                  {canViewAllLeaves() && (
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'calendar'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      📅 Calendario Team
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'balances' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">💳 I Miei Saldi Ferie</h2>
                      <p className="text-sm text-gray-600">Visualizza i tuoi saldi per ogni tipologia di ferie e permessi</p>
                    </div>
                    <button
                      onClick={() => setShowBalanceDetails(v => !v)}
                      className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                    >
                      {showBalanceDetails ? 'Nascondi' : 'Dettagli'}
                    </button>
                  </div>
                </div>
                {showBalanceDetails && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {balances.map((balance) => {
                      const config = LEAVE_TYPES[balance.type]
                      if (!config) return null
                      
                      return (
                        <div key={balance.type} className="border rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <span className="text-2xl mr-2">{config.icon}</span>
                              <div>
                                <h3 className="font-semibold text-gray-900">{config.name}</h3>
                                <p className="text-xs text-gray-500">{config.description}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              balance.percentage > 80 ? 'bg-red-100 text-red-800' :
                              balance.percentage > 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {balance.percentage}% usato
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Utilizzato</span>
                              <span>{balance.used} / {balance.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  balance.percentage > 80 ? 'bg-red-500' :
                                  balance.percentage > 60 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${balance.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Rimanenti:</span>
                            <span className="font-semibold text-gray-900">{balance.remaining}</span>
                          </div>
                          
                          {balance.remaining > 0 && canRequestLeave() && (
                            <button
                              onClick={() => router.push(`/leaves/new?type=${balance.type}`)}
                              className="w-full mt-3 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition"
                            >
                              Richiedi {config.name}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">📋 Le Mie Richieste</h2>
                  <p className="text-sm text-gray-600">Storico delle tue richieste di ferie e permessi</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Periodo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giorni
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Richiesta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requests.map((request) => {
                        const config = LEAVE_TYPES[request.type]
                        const s = toSafeDate(request.startDate)
                        const e = toSafeDate(request.endDate)
                        const days = s && e ? Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0
                        
                        return (
                          <tr key={request.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-xl mr-2">{config?.icon}</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{config?.name}</div>
                                  {request.isUrgent && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      🚨 Urgente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(s?.toLocaleDateString('it-IT')) || '-'} - {(e?.toLocaleDateString('it-IT')) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {days} giorni
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                request.status === 'PROPOSED' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status === 'APPROVED' ? '✅ Approvata' :
                                 request.status === 'PENDING' ? '⏳ In Attesa' :
                                 request.status === 'REJECTED' ? '❌ Rifiutata' :
                                 request.status === 'PROPOSED' ? '✏️ Proposta' :
                                 request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(toSafeDate(request.createdAt)?.toLocaleDateString('it-IT')) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 mr-3">
                                👁️ Vedi
                              </button>
                              {request.status === 'PENDING' && (
                                <button className="text-red-600 hover:text-red-900">
                                  🗑️ Annulla
                                </button>
                              )}
                              {request.status === 'PROPOSED' && (
                                <div className="space-y-2">
                                  <span className="inline-flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        if (!session?.user?.id) return
                                        const res = acceptLeaveProposal(request.id, session.user.id)
                                        if (!res.success) {
                                          alert('Errore: ' + res.error)
                                        } else {
                                          const employeeName = session.user?.name || 'Dipendente'
                                          const ps = request.proposedStartDate?.toLocaleDateString('it-IT') || request.startDate.toLocaleDateString('it-IT')
                                          const pe = request.proposedEndDate?.toLocaleDateString('it-IT') || request.endDate.toLocaleDateString('it-IT')
                                          notifyProposalAccepted(employeeName, ps, pe)
                                          loadData()
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      ✅ Accetta proposta
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!session?.user?.id) return
                                        const res = rejectLeaveProposal(request.id, session.user.id)
                                        if (!res.success) {
                                          alert('Errore: ' + res.error)
                                        } else {
                                          const employeeName = session.user?.name || 'Dipendente'
                                          notifyProposalRejected(employeeName)
                                          loadData()
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      ❌ Rifiuta proposta
                                    </button>
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                    <div>
                                      <label className="block text-xs text-gray-600">Controproponi Inizio</label>
                                      <input
                                        type="date"
                                        onChange={(e) => (request as any)._counterStart = e.target.value}
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600">Controproponi Fine</label>
                                      <input
                                        type="date"
                                        onChange={(e) => (request as any)._counterEnd = e.target.value}
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    </div>
                                    <div>
                                      <button
                                        onClick={() => {
                                          if (!session?.user?.id) return
                                          const cs = (request as any)._counterStart
                                          const ce = (request as any)._counterEnd
                                          if (!cs || !ce) {
                                            alert('Inserisci entrambe le date per controproporre')
                                            return
                                          }
                                          const res = counterProposeLeaveDates(request.id, session.user.id, new Date(cs), new Date(ce))
                                          if (!res.success) alert('Errore: ' + res.error)
                                          else loadData()
                                        }}
                                        className="bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 transition text-sm"
                                      >
                                        ✏️ Controproponi
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  
                  {requests.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📋</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna richiesta</h3>
                      <p className="text-gray-500 mb-4">Non hai ancora inviato richieste di ferie o permessi</p>
                      {canRequestLeave() && (
                        <button
                          onClick={() => router.push('/leaves/new')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          ➕ Prima Richiesta
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && canViewAllLeaves() && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">📅 Calendario Assenze Team</h2>
                      <p className="text-sm text-gray-600">Visualizza e filtra ferie e permessi su base giornaliera</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                        title="Filtra per dipendente"
                      >
                        <option value="all">Tutti i dipendenti</option>
                        {[...new Set(getLeaveRequests().map(r => r.userId))].map(uid => (
                          <option key={uid} value={uid}>Utente {uid}</option>
                        ))}
                      </select>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                        title="Filtra per tipologia"
                      >
                        <option value="all">Tutte le tipologie</option>
                        {Object.values(LEAVE_TYPES).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {/* Toolbar mese */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        const d = new Date(calendarDate)
                        d.setMonth(d.getMonth() - 1)
                        setCalendarDate(d)
                      }}
                      className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                    >
                      ← Mese precedente
                    </button>
                    <div className="text-lg font-semibold text-gray-900">
                      {calendarDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                      onClick={() => {
                        const d = new Date(calendarDate)
                        d.setMonth(d.getMonth() + 1)
                        setCalendarDate(d)
                      }}
                      className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                    >
                      Mese successivo →
                    </button>
                  </div>
                  <div className="mb-3">
                    <button
                      onClick={() => {
                        const now = new Date()
                        const d = new Date(now.getFullYear(), now.getMonth(), 1)
                        d.setHours(0,0,0,0)
                        setCalendarDate(d)
                        const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
                        setSelectedDayISO(`${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`)
                      }}
                      className="text-xs text-blue-700 hover:text-blue-900"
                    >
                      Oggi
                    </button>
                  </div>

                  {/* Griglia calendario */}
                  {(() => {
                    // Days header
                    const dayHeader = (
                      <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
                        {['L','M','M','G','V','S','D'].map(d => (
                          <div key={d} className="px-2 py-1 text-center uppercase tracking-wide">{d}</div>
                        ))}
                      </div>
                    )

                    const startOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
                    const endOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0)
                    const startDay = (startOfMonth.getDay() + 6) % 7 // Monday=0
                    const gridStart = new Date(startOfMonth)
                    gridStart.setDate(startOfMonth.getDate() - startDay)
                    gridStart.setHours(0,0,0,0)

                    const cells: Date[] = []
                    for (let i = 0; i < 42; i++) {
                      const d = new Date(gridStart)
                      d.setDate(gridStart.getDate() + i)
                      cells.push(d)
                    }

                    const toLocalISO = (d: Date) => {
                      const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
                      return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
                    }
                    const todayISO = toLocalISO(new Date())

                    // Filtra richieste secondo filtri
                    const allReq = getLeaveRequests()
                      .filter(r => (filterEmployee === 'all' ? true : r.userId === filterEmployee))
                      .filter(r => (filterType === 'all' ? true : r.type === filterType))

                    const colorMap: Record<string, string> = {
                      blue: 'bg-blue-100 text-blue-800',
                      red: 'bg-red-100 text-red-800',
                      green: 'bg-green-100 text-green-800',
                      purple: 'bg-purple-100 text-purple-800',
                      gray: 'bg-gray-100 text-gray-800',
                      pink: 'bg-pink-100 text-pink-800',
                      indigo: 'bg-indigo-100 text-indigo-800',
                      orange: 'bg-orange-100 text-orange-800'
                    }

                    const cellEls = cells.map((d) => {
                      const inMonth = d.getMonth() === calendarDate.getMonth()
                      const dayISO = toLocalISO(d)
                      const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
                      const dayReqs = allReq.filter(r => {
                        const s = startOf(r.startDate)
                        const e = startOf(r.endDate)
                        const dd = startOf(d)
                        return dd >= s && dd <= e
                      })
                      const isSelected = selectedDayISO === dayISO
                      const isToday = dayISO === todayISO
                      const numberCls = isSelected
                        ? 'bg-blue-600 text-white'
                        : isToday
                          ? 'border border-red-600 text-red-600'
                          : inMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'

                      const dotColorMap: Record<string, string> = {
                        blue: 'bg-blue-500',
                        red: 'bg-red-500',
                        green: 'bg-green-500',
                        purple: 'bg-purple-500',
                        gray: 'bg-gray-400',
                        pink: 'bg-pink-500',
                        indigo: 'bg-indigo-500',
                        orange: 'bg-orange-500'
                      }

                      return (
                        <div
                          key={dayISO}
                          onClick={() => setSelectedDayISO(dayISO)}
                          className={`p-2 h-20 cursor-pointer ${inMonth ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 rounded-lg transition`}
                          title={`${dayReqs.length} assenze`}
                        >
                          <div className="flex justify-center">
                            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${numberCls}`}>{d.getDate()}</div>
                          </div>
                          <div className="mt-2 flex justify-center gap-1">
                            {dayReqs.slice(0,4).map(r => {
                              const cfg = LEAVE_TYPES[r.type]
                              const colorCls = dotColorMap[cfg?.color || 'gray']
                              return <span key={r.id} className={`w-1.5 h-1.5 rounded-full ${colorCls}`}></span>
                            })}
                          </div>
                        </div>
                      )
                    })

                    // Dettagli giorno selezionato
                    const selectedDate = selectedDayISO ? (() => { const [yy,mm,dd] = selectedDayISO.split('-').map(Number); return new Date(yy, (mm||1)-1, dd||1) })() : null
                    const selectedReqs = selectedDate ? allReq.filter(r => selectedDate >= new Date(r.startDate.setHours(0,0,0,0)) && selectedDate <= new Date(r.endDate.setHours(0,0,0,0))) : []

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                          {dayHeader}
                          <div className="grid grid-cols-7 gap-0">
                            {cellEls}
                          </div>
                        </div>
                        <div>
                          <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-gray-900">Dettagli Giorno</div>
                              <button onClick={() => setSelectedDayISO(null)} className="text-xs text-gray-500 hover:text-gray-700">Pulisci</button>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                              {selectedDate ? selectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Seleziona un giorno'}
                            </div>
                            <div className="space-y-2">
                              {selectedReqs.length === 0 && (
                                <div className="text-sm text-gray-500">Nessuna assenza</div>
                              )}
                              {selectedReqs.map(r => {
                                const cfg = LEAVE_TYPES[r.type]
                                const cls = colorMap[cfg?.color || 'gray']
                                return (
                                  <div key={r.id} className={`border rounded p-2 ${cls.replace('100','50')} text-gray-900`}>
                                    <div className="text-sm font-medium">
                                      {cfg?.icon} {cfg?.name} • Utente {r.userId}
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      {r.startDate.toLocaleDateString('it-IT')} → {r.endDate.toLocaleDateString('it-IT')} • {r.status}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
