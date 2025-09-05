'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useAudit } from '@/hooks/useAudit'
import { 
  getLeaveBalances, 
  getLeaveRequests, 
  getLeaveStats, 
  LEAVE_TYPES,
  LeaveBalance,
  LeaveRequest 
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
  
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'balances' | 'requests' | 'calendar'>('balances')

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
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← Dashboard
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  🏖️ Gestione Ferie e Permessi
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
                {canApproveLeave() && (
                  <button
                    onClick={() => router.push('/leaves/approvals')}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                  >
                    ✅ Approvazioni
                  </button>
                )}
                {canViewLeaveCalendar() && (
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    📅 Calendario
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
                  <h2 className="text-lg font-semibold text-gray-900">💳 I Miei Saldi Ferie</h2>
                  <p className="text-sm text-gray-600">Visualizza i tuoi saldi per ogni tipologia di ferie e permessi</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        
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
                              {request.startDate.toLocaleDateString('it-IT')} - {request.endDate.toLocaleDateString('it-IT')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {days} giorni
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status === 'APPROVED' ? '✅ Approvata' :
                                 request.status === 'PENDING' ? '⏳ In Attesa' :
                                 request.status === 'REJECTED' ? '❌ Rifiutata' :
                                 request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.createdAt.toLocaleDateString('it-IT')}
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
                  <h2 className="text-lg font-semibold text-gray-900">📅 Calendario Assenze Team</h2>
                  <p className="text-sm text-gray-600">Visualizza le assenze programmate del team</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Calendario in Sviluppo</h3>
                    <p className="text-gray-500">La vista calendario sarà disponibile nella prossima versione</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
