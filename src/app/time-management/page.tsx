'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import ShiftsCalendar from '@/components/shifts/Calendar'

// Stati richiesta ferie
export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  MANAGER_MODIFIED = 'MANAGER_MODIFIED',
  EMPLOYEE_COUNTER = 'EMPLOYEE_COUNTER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export default function TimeManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageEmployees } = usePermissions()
  
  const isManager = canManageEmployees()
  const userDepartment = (session?.user as any)?.department || 'sala'
  
  // Tab dinamici basati su ruolo
  const employeeTabs = [
    { id: 'my-calendar', label: 'Il Mio Calendario', icon: '📅' },
    { id: 'leaves', label: 'Ferie e Permessi', icon: '🏖️' },
    { id: 'swaps', label: 'Scambi Turni', icon: '🔄' },
    { id: 'history', label: 'Storico', icon: '📜' }
  ]
  
  const managerTabs = [
    { id: 'master-calendar', label: 'Calendario Master', icon: '📅' },
    { id: 'approvals', label: 'Approvazioni', icon: '✅' },
    { id: 'events', label: 'Eventi Aziendali', icon: '🎉' },
    { id: 'auto-schedule', label: 'Auto Scheduling', icon: '🤖' },
    { id: 'analytics', label: 'Analytics Tempo', icon: '📊' },
    { id: 'config', label: 'Configurazione', icon: '⚙️' }
  ]
  
  const tabs = isManager ? managerTabs : employeeTabs
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const [selectedDepartment, setSelectedDepartment] = useState(isManager ? 'all' : userDepartment)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isManager ? '📅 Time Management Team' : '📅 Il Mio Tempo'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isManager 
                  ? 'Gestisci turni, ferie e permessi del team'
                  : 'Gestisci i tuoi turni, ferie e permessi'
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 text-center font-medium text-sm whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* DIPENDENTE: Il Mio Calendario */}
            {activeTab === 'my-calendar' && !isManager && (
              <div>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">📅 Il Tuo Calendario Personale</h3>
                  <p className="text-sm text-blue-700">
                    I tuoi turni, ferie approvate e permessi in un'unica vista
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    🔵 Turno | 🟢 Ferie | 🔴 Permesso | ⚪ Riposo | 🟣 Evento Aziendale
                  </p>
                </div>

                {/* Componente Calendario Integrato */}
                <ShiftsCalendar />
              </div>
            )}

            {/* MANAGER: Calendario Master */}
            {activeTab === 'master-calendar' && isManager && (
              <div>
                <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🎯 Calendario Master Team</h3>
                  <p className="text-sm text-orange-700">
                    Vista completa: turni + ferie + permessi + eventi di tutto il team
                  </p>
                  <p className="text-xs text-orange-600 mt-2">
                    🔵 Turno | 🟢 Ferie | 🟡 Pending | 🔴 Permesso | ⚪ Riposo | 🟣 Evento
                  </p>
                </div>

                {/* Componente Calendario Integrato (Manager vede tutti) */}
                <ShiftsCalendar />
              </div>
            )}

            {/* TUTTI: Ferie e Permessi */}
            {activeTab === 'leaves' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🏖️ Ferie e Permessi</h3>
                  
                  {/* Saldo Ferie */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">26</div>
                      <div className="text-sm text-green-700">Giorni Totali</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-orange-600">10</div>
                      <div className="text-sm text-orange-700">Usati</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">16</div>
                      <div className="text-sm text-blue-700">Disponibili</div>
                    </div>
                  </div>

                  {/* Nuova Richiesta */}
                  <button className="w-full mb-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                    ➕ Nuova Richiesta Ferie
                  </button>

                  {/* Le Tue Richieste */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">📋 Le Tue Richieste</h4>
                    
                    {/* Esempio Richiesta Modificata dal Manager */}
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                            ⚠️ MODIFICATA DAL MANAGER
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">Richiesta del 5 Ott</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 my-4">
                        <div>
                          <span className="text-sm text-gray-600">Date richieste:</span>
                          <div className="font-medium line-through text-gray-500">10-15 Dicembre</div>
                        </div>
                        <div>
                          <span className="text-sm text-green-600">Nuove date proposte:</span>
                          <div className="font-bold text-green-700">12-17 Dicembre</div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-4 p-3 bg-white rounded">
                        <strong>Motivazione:</strong> "Abbiamo già 2 persone in ferie dal 10-12. Le date 12-17 vanno meglio per la copertura."
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                          ✅ Accetto le Modifiche
                        </button>
                        <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                          ❌ Rifiuto
                        </button>
                        <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                          ✏️ Proponi Altre Date
                        </button>
                      </div>
                    </div>

                    {/* Esempio Richiesta Pending */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                            ⏳ IN ATTESA
                          </span>
                          <div className="mt-2 font-semibold">5-10 Gennaio 2026</div>
                          <div className="text-sm text-gray-600">5 giorni • Richiesta del 8 Ott</div>
                        </div>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          🗑️ Annulla
                        </button>
                      </div>
                    </div>

                    {/* Esempio Richiesta Approvata */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                            ✅ APPROVATA
                          </span>
                          <div className="mt-2 font-semibold">20-25 Agosto 2025</div>
                          <div className="text-sm text-gray-600">5 giorni • Approvata da Marco Rossi</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MANAGER: Approvazioni */}
            {activeTab === 'approvals' && isManager && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">✅ Approvazioni</h3>
                
                {/* Filtro Tipo */}
                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                  <button className="flex-1 py-2 bg-white rounded-lg shadow font-medium">
                    🏖️ Ferie
                  </button>
                  <button className="flex-1 py-2 text-gray-600 hover:bg-white rounded-lg">
                    🔄 Scambi
                  </button>
                  <button className="flex-1 py-2 text-gray-600 hover:bg-white rounded-lg">
                    🏥 Permessi
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Richiesta Nuova da Approvare */}
                  <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">👤</div>
                        <div>
                          <div className="font-semibold text-gray-900">Mario Bianchi</div>
                          <div className="text-sm text-gray-600">Chef de Partie • Cucina</div>
                        </div>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                        ⏳ DA APPROVARE
                      </span>
                    </div>
                    
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <div className="font-semibold">10-15 Dicembre</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Giorni:</span>
                          <div className="font-semibold">5 giorni</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Saldo dopo:</span>
                          <div className="font-semibold">21/26</div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Nota:</strong> "Vacanza famiglia"
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                        ✅ Approva
                      </button>
                      <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                        ❌ Rifiuta
                      </button>
                      <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        ✏️ Modifica Date
                      </button>
                    </div>
                  </div>

                  {/* Richiesta Rimodificata dal Dipendente */}
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">👤</div>
                        <div>
                          <div className="font-semibold text-gray-900">Anna Verdi</div>
                          <div className="text-sm text-gray-600">Cameriera • Sala</div>
                        </div>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                        🔄 RIMODIFICATA
                      </span>
                    </div>
                    
                    <div className="mb-3 p-3 bg-white rounded">
                      <div className="text-xs text-gray-500 mb-2">Cronologia:</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">1.</span>
                          <span>Anna richiede: 1-5 Nov</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600">2.</span>
                          <span>Tu modifichi: 3-7 Nov</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">3.</span>
                          <span className="font-semibold">Anna contropropone: 2-6 Nov</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                        ✅ Approva Nuove Date
                      </button>
                      <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                        ❌ Rifiuta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MANAGER: Eventi Aziendali */}
            {activeTab === 'events' && isManager && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">🎉 Eventi Aziendali</h3>
                    <p className="text-sm text-gray-600">Chiusure, festività e eventi che impattano i turni</p>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    ➕ Nuovo Evento
                  </button>
                </div>

                {/* Lista Eventi */}
                <div className="space-y-3">
                  {/* Evento Esempio */}
                  <div className="bg-white border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">🎄</div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Chiusura Natale</h4>
                          <p className="text-sm text-gray-600">25-26 Dicembre 2025</p>
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full mt-1 inline-block">
                            Ristorante Chiuso
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                          Modifica
                        </button>
                        <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">🎉</div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Team Building</h4>
                          <p className="text-sm text-gray-600">15 Gennaio 2026</p>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mt-1 inline-block">
                            Evento Aziendale
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                          Modifica
                        </button>
                        <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Placeholder per nuovi eventi */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-600">
                      Aggiungi eventi che impattano i turni: chiusure, festività, team building
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scambi Turni */}
            {activeTab === 'swaps' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔄</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Scambi Turni
                </h4>
                <p className="text-gray-600">
                  Sistema scambio turni tra colleghi (già esistente da integrare)
                </p>
              </div>
            )}

            {/* Auto Scheduling (Manager) */}
            {activeTab === 'auto-schedule' && isManager && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  AI Auto Scheduling
                </h4>
                <p className="text-gray-600">
                  Genera automaticamente turni rispettando ferie, riposi e CCNL
                </p>
              </div>
            )}

            {/* Analytics Tempo (Manager) */}
            {activeTab === 'analytics' && isManager && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Analytics Tempo
                </h4>
                <p className="text-gray-600">
                  Statistiche ore lavorate, ferie utilizzate, costi turni
                </p>
              </div>
            )}

            {/* Configurazione (Manager) */}
            {activeTab === 'config' && isManager && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚙️</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Configurazione
                </h4>
                <p className="text-gray-600">
                  Regole riposo, turni predefiniti, festività
                </p>
              </div>
            )}

            {/* Storico */}
            {activeTab === 'history' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Storico
                </h4>
                <p className="text-gray-600">
                  Archivio completo turni e richieste passate
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

