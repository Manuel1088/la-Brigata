'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

// Stati richiesta ferie
export enum LeaveStatus {
  SUBMITTED = 'SUBMITTED',
  MANAGER_MODIFIED = 'MANAGER_MODIFIED',
  EMPLOYEE_COUNTER = 'EMPLOYEE_COUNTER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export default function LeavesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageEmployees } = usePermissions()
  
  const isManager = canManageEmployees()
  const [activeView, setActiveView] = useState(isManager ? 'approve' : 'my-requests')

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
              <h1 className="text-3xl font-bold text-gray-900">🏖️ Ferie e Permessi</h1>
              <p className="text-gray-600 mt-2">
                {isManager 
                  ? 'Gestisci richieste ferie del team'
                  : 'Richiedi e gestisci le tue ferie'
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Toggle Vista (solo Manager) */}
        {isManager && (
          <div className="flex gap-2 mb-6 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setActiveView('approve')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeView === 'approve'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ✅ Da Approvare
            </button>
            <button
              onClick={() => setActiveView('my-requests')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeView === 'my-requests'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📋 Le Mie Ferie
            </button>
          </div>
        )}

        {/* VISTA: Le Mie Richieste */}
        {activeView === 'my-requests' && (
          <div className="space-y-6">
            {/* Saldo Ferie */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600">26</div>
                <div className="text-sm text-green-700">Giorni Totali</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                <div className="text-3xl font-bold text-orange-600">10</div>
                <div className="text-sm text-orange-700">Usati</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">16</div>
                <div className="text-sm text-blue-700">Disponibili</div>
              </div>
            </div>

            {/* Nuova Richiesta */}
            <button className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow">
              ➕ Nuova Richiesta Ferie
            </button>

            {/* Le Tue Richieste */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Le Tue Richieste</h3>
              
              <div className="space-y-4">
                {/* Richiesta Modificata dal Manager */}
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                      ⚠️ MODIFICATA DAL MANAGER
                    </span>
                    <span className="text-xs text-gray-500">5 Ottobre 2025</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 my-4">
                    <div>
                      <span className="text-sm text-gray-600">Date richieste:</span>
                      <div className="font-medium line-through text-gray-500">10-15 Dicembre</div>
                    </div>
                    <div>
                      <span className="text-sm text-green-600">Proposte dal manager:</span>
                      <div className="font-bold text-green-700">12-17 Dicembre</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-4 p-3 bg-white rounded">
                    <strong>Motivazione:</strong> "Abbiamo già 2 persone in ferie dal 10-12. Le date 12-17 vanno meglio."
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                      ✅ Accetto
                    </button>
                    <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                      ❌ Rifiuto
                    </button>
                    <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                      ✏️ Altre Date
                    </button>
                  </div>
                </div>

                {/* Richiesta Pending */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                        ⏳ IN ATTESA
                      </span>
                      <div className="mt-2 font-semibold">5-10 Gennaio 2026</div>
                      <div className="text-sm text-gray-600">5 giorni • Richiesta del 8 Ottobre</div>
                    </div>
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                      🗑️ Annulla
                    </button>
                  </div>
                </div>

                {/* Richiesta Approvata */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                        ✅ APPROVATA
                      </span>
                      <div className="mt-2 font-semibold">20-25 Agosto 2025</div>
                      <div className="text-sm text-gray-600">5 giorni • Approvata da Marco Rossi il 1 Agosto</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA MANAGER: Da Approvare */}
        {activeView === 'approve' && isManager && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Richieste da Approvare</h3>
            
            <div className="space-y-4">
              {/* Richiesta Nuova */}
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

              {/* Richiesta Rimodificata */}
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
                    🔄 CONTROPROPOSTA
                  </span>
                </div>
                
                <div className="mb-3 p-3 bg-white rounded">
                  <div className="text-xs text-gray-500 mb-2">Cronologia:</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">1.</span>
                      <span>Anna richiede: 1-5 Novembre</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">2.</span>
                      <span>Tu modifichi in: 3-7 Novembre</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">3.</span>
                      <span className="font-semibold">Anna contropropone: 2-6 Novembre</span>
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
      </main>
    </div>
  )
}

