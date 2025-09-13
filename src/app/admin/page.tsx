'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAudit } from '@/hooks/useAudit'
import { PermissionGuard } from '@/components/PermissionGuard'
import { getUserDisplayInfo } from '@/lib/audit'

// Mock data per utenti (in produzione verrà dal database)
const mockUsers = [
  {
    id: '1',
    name: 'Admin Proprietario',
    email: 'admin@brigata.it',
    role: 'PROPRIETARIO',
    level: 10,
    avatar: '👑',
    isActive: true,
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 ore fa
    createdAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Marco Direttore',
    email: 'direttore@brigata.it',
    role: 'DIRETTORE',
    level: 9,
    avatar: '👔',
    isActive: true,
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 ora fa
    createdAt: new Date('2024-01-15')
  },
  {
    id: '3',
    name: 'Anna Manager',
    email: 'manager@brigata.it',
    role: 'MANAGER',
    level: 8,
    avatar: '📊',
    isActive: true,
    lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 min fa
    createdAt: new Date('2024-02-01')
  },
  {
    id: '4',
    name: 'Luca Cassiere',
    email: 'cassiere@brigata.it',
    role: 'CASSIERE',
    level: 6,
    avatar: '💰',
    isActive: true,
    lastLogin: new Date(Date.now() - 15 * 60 * 1000), // 15 min fa
    createdAt: new Date('2024-02-15')
  },
  {
    id: '5',
    name: 'Sofia Dipendente',
    email: 'dipendente@brigata.it',
    role: 'DIPENDENTE',
    level: 5,
    avatar: '👤',
    isActive: false,
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 giorno fa
    createdAt: new Date('2024-03-01')
  }
]

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageUsers, canManageRoles, canViewAudit, canManageSettings } = usePermissions()
  const { getLogs, getStats, logReadAction } = useAudit()
  
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit' | 'settings'>('users')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditStats, setAuditStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // ✅ FIX 1: Carica dati audit - RIMOSSO le funzioni dalle dipendenze
  const loadAuditData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [logs, stats] = await Promise.all([
        getLogs({ limit: 50 }),
        getStats()
      ])
      setAuditLogs(logs)
      setAuditStats(stats)
    } catch (error) {
      console.error('Errore nel caricamento dati audit:', error)
    } finally {
      setIsLoading(false)
    }
  }, []) // ← Array vuoto - la funzione è stabile

  useEffect(() => {
    if (canViewAudit()) {
      loadAuditData()
    }
  }, [activeTab]) // ← Solo quando cambia tab audit

  // ✅ FIX 2: Log accesso - SOLO una volta per sessione
  useEffect(() => {
    if (session?.user) {
      logReadAction('admin')
    }
  }, [session?.user?.id]) // ← Solo quando cambia l'utente, non la funzione

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
    <PermissionGuard permissions={['admin_users', 'admin_roles', 'admin_settings', 'admin_audit']}>
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
                  🛡️ Pannello Amministrativo
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Ciao, {session.user?.name}!
                </span>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                  {(session.user as any)?.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {canManageUsers() && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  👥 Gestione Utenti
                </button>
              )}
              {canManageRoles() && (
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'roles'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🔐 Ruoli e Permessi
                </button>
              )}
              {canViewAudit() && (
                <button
                  onClick={() => {
                    setActiveTab('audit')
                    // Ricarica i dati quando si clicca sul tab audit
                    if (activeTab !== 'audit') {
                      loadAuditData()
                    }
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'audit'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📋 Audit Trail
                </button>
              )}
              {canManageSettings() && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ⚙️ Impostazioni Sistema
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Shortcut Gestione Accessi */}
            {canManageUsers() && (
              <div className="mb-6">
                <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">🧩 Gestione Accessi</div>
                    <div className="text-sm text-gray-600">Configura cosa vedono i sottoposti in dashboard e i permessi sulle pagine.</div>
                  </div>
                  <button
                    onClick={() => router.push('/admin/access')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    Apri Gestione
                  </button>
                </div>
              </div>
            )}
            
            {/* Tab: Gestione Utenti */}
            {activeTab === 'users' && canManageUsers() && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">👥 Gestione Utenti</h2>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    ➕ Nuovo Utente
                  </button>
                </div>

                {/* Statistiche Utenti */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">👥</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Totale Utenti</p>
                        <p className="text-2xl font-bold text-gray-900">{mockUsers.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">✅</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Utenti Attivi</p>
                        <p className="text-2xl font-bold text-green-600">
                          {mockUsers.filter(u => u.isActive).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">🔒</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Utenti Inattivi</p>
                        <p className="text-2xl font-bold text-red-600">
                          {mockUsers.filter(u => !u.isActive).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">👑</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Livelli</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {new Set(mockUsers.map(u => u.level)).size}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabella Utenti */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">Lista Utenti</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruolo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimo Accesso</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {mockUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-2xl mr-3">{user.avatar}</div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.level >= 9 ? 'bg-red-100 text-red-800' :
                                user.level >= 7 ? 'bg-orange-100 text-orange-800' :
                                user.level >= 5 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                L{user.level} - {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.lastLogin.toLocaleString('it-IT')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.isActive ? 'Attivo' : 'Inattivo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">👁️</button>
                              <button className="text-orange-600 hover:text-orange-900">✏️</button>
                              <button className="text-red-600 hover:text-red-900">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Ruoli e Permessi */}
            {activeTab === 'roles' && canManageRoles() && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">🔐 Ruoli e Permessi</h2>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Matrice Ruoli-Permessi</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Ruolo</th>
                          <th className="text-center py-2">👥 Personale</th>
                          <th className="text-center py-2">💰 Mance</th>
                          <th className="text-center py-2">📅 Turni</th>
                          <th className="text-center py-2">📊 Report</th>
                          <th className="text-center py-2">⚙️ Admin</th>
                        </tr>
                      </thead>
                      <tbody className="space-y-2">
                        <tr className="border-b">
                          <td className="py-2 font-medium">👑 Proprietario (L10)</td>
                          <td className="text-center">✅ Tutti</td>
                          <td className="text-center">✅ Tutti</td>
                          <td className="text-center">✅ Tutti</td>
                          <td className="text-center">✅ Tutti</td>
                          <td className="text-center">✅ Tutti</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium">👔 Direttore (L9)</td>
                          <td className="text-center">✅ 7/8</td>
                          <td className="text-center">✅ 6/7</td>
                          <td className="text-center">✅ 5/5</td>
                          <td className="text-center">✅ 5/5</td>
                          <td className="text-center">⚠️ 1/6</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium">📊 Manager (L8)</td>
                          <td className="text-center">✅ 6/8</td>
                          <td className="text-center">✅ 6/7</td>
                          <td className="text-center">✅ 5/5</td>
                          <td className="text-center">✅ 3/5</td>
                          <td className="text-center">❌ 0/6</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 font-medium">💰 Cassiere (L6)</td>
                          <td className="text-center">⚠️ 1/8</td>
                          <td className="text-center">✅ 3/7</td>
                          <td className="text-center">⚠️ 1/5</td>
                          <td className="text-center">⚠️ 1/5</td>
                          <td className="text-center">❌ 0/6</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium">👤 Dipendente (L5)</td>
                          <td className="text-center">⚠️ 1/8</td>
                          <td className="text-center">⚠️ 1/7</td>
                          <td className="text-center">⚠️ 1/5</td>
                          <td className="text-center">❌ 0/5</td>
                          <td className="text-center">❌ 0/6</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Audit Trail */}
            {activeTab === 'audit' && canViewAudit() && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">📋 Audit Trail</h2>
                
                {/* Statistiche Audit */}
                {auditStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">📊</div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Totale Log</p>
                          <p className="text-2xl font-bold text-gray-900">{auditStats.totalLogs}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">📅</div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Oggi</p>
                          <p className="text-2xl font-bold text-blue-600">{auditStats.logsToday}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">📈</div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Questa Settimana</p>
                          <p className="text-2xl font-bold text-green-600">{auditStats.logsThisWeek}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">📊</div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Questo Mese</p>
                          <p className="text-2xl font-bold text-orange-600">{auditStats.logsThisMonth}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Log Audit */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">Log Recenti</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azione</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risorsa</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dettagli</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                              Caricamento log...
                            </td>
                          </tr>
                        ) : auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                              Nessun log disponibile
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => {
                            const userInfo = getUserDisplayInfo(log.userId)
                            return (
                              <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {log.timestamp ? new Date(log.timestamp).toLocaleString('it-IT') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="text-lg mr-2">{userInfo.avatar}</div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{userInfo.name}</div>
                                      <div className="text-sm text-gray-500">{userInfo.role}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    log.action === 'LOGIN' ? 'bg-green-100 text-green-800' :
                                    log.action === 'LOGOUT' ? 'bg-red-100 text-red-800' :
                                    log.action === 'CREATE' ? 'bg-blue-100 text-blue-800' :
                                    log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                    log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {log.resource}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {log.details ? (
                                    <span className="truncate max-w-xs block" title={log.details}>
                                      {log.details}
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Impostazioni Sistema */}
            {activeTab === 'settings' && canManageSettings() && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">⚙️ Impostazioni Sistema</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sicurezza */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">🛡️ Sicurezza</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Durata Sessione (ore)
                        </label>
                        <input
                          type="number"
                          defaultValue="8"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tentativi Login Massimi
                        </label>
                        <input
                          type="number"
                          defaultValue="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="form-checkbox h-4 w-4 text-orange-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Abilita Audit Trail
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Sistema */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">🔧 Sistema</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome Ristorante
                        </label>
                        <input
                          type="text"
                          defaultValue="La Brigata"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuso Orario
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                          <option value="Europe/Rome">Europe/Rome (CET)</option>
                          <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="form-checkbox h-4 w-4 text-orange-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Modalità Manutenzione
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Azioni Sistema */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">🚀 Azioni Sistema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                      💾 Backup Database
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                      🔄 Restart Sistema
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                      🗑️ Pulizia Log
                    </button>
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