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
  
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'restaurants' | 'audit' | 'settings'>('users')
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
              <button
                onClick={() => setActiveTab('restaurants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'restaurants'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏪 Gestione Ristoranti
              </button>
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
            {/* Shortcut Gestione Accessi rimosso: ora pagina indipendente /access */}
            
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

            {/* Tab: Gestione Ristoranti */}
            {activeTab === 'restaurants' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">🏪 Gestione Ristoranti</h2>
                  <button
                    onClick={() => {
                      // TODO: Implementare creazione nuovo ristorante
                      alert('Funzionalità in sviluppo')
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                  >
                    ➕ Nuovo Ristorante
                  </button>
                </div>

                {/* Lista Ristoranti */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Ristoranti Registrati</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gestisci i ristoranti e le loro informazioni
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Ristorante 1 */}
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🍽️</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">La Brigata - Sede Centrale</h4>
                              <p className="text-sm text-gray-600">Via Roma 123, Milano</p>
                              <p className="text-xs text-gray-500">Tel: +39 02 1234567</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">15 dipendenti</div>
                              <div className="text-xs text-gray-500">Attivo</div>
                            </div>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                                ✏️ Modifica
                              </button>
                              <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                                👥 Dipendenti
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ristorante 2 */}
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🍕</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">La Brigata - Filiale Nord</h4>
                              <p className="text-sm text-gray-600">Corso Italia 456, Milano</p>
                              <p className="text-xs text-gray-500">Tel: +39 02 7654321</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">8 dipendenti</div>
                              <div className="text-xs text-gray-500">Attivo</div>
                            </div>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                                ✏️ Modifica
                              </button>
                              <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                                👥 Dipendenti
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ristorante 3 */}
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🍝</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">La Brigata - Filiale Sud</h4>
                              <p className="text-sm text-gray-600">Via Garibaldi 789, Milano</p>
                              <p className="text-xs text-gray-500">Tel: +39 02 9876543</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">12 dipendenti</div>
                              <div className="text-xs text-gray-500">Attivo</div>
                            </div>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                                ✏️ Modifica
                              </button>
                              <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                                👥 Dipendenti
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistiche Ristoranti */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <span className="text-2xl">🏪</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Totale Ristoranti</p>
                        <p className="text-2xl font-bold text-gray-900">3</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Totale Dipendenti</p>
                        <p className="text-2xl font-bold text-gray-900">35</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Fatturato Mensile</p>
                        <p className="text-2xl font-bold text-gray-900">€125K</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <span className="text-2xl">⭐</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Rating Medio</p>
                        <p className="text-2xl font-bold text-gray-900">4.8</p>
                      </div>
                    </div>
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
                
                {/* Collegamento Inquadramenti CCNL */}
                <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">📑 Inquadramenti CCNL</div>
                    <div className="text-sm text-gray-600">Gestisci livelli e retribuzioni secondo CCNL Turismo.</div>
                  </div>
                  <button
                    onClick={() => router.push('/admin/ccnl')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Apri CCNL
                  </button>
                </div>
                
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