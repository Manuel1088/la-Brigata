'use client'
// Test comment added by AI assistant - prova modifica GitHub
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAudit } from '@/hooks/useAudit'
import { NotificationCenter } from '@/components/NotificationCenter'
import { NotificationBadge } from '@/components/NotificationBadge'
import { BreakEvenWidget } from '@/components/BreakEvenWidget'
import EmployeeDashboard from '@/components/EmployeeDashboard'
import CashierDashboard from '@/components/CashierDashboard'
import ManagerDashboard from '@/components/ManagerDashboard'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { 
    canManageEmployees, 
    canManageTips, 
    canManageShifts, 
    canManageLeaves,
    canViewReports, 
    canAccessAdmin,
    canCreateEmployee,
    canInsertTips,
    canCreateShift,
    canRequestLeave
  } = usePermissions()
  
  // Controlla se l'utente può vedere il break-even (Direttore e Manager)
  const canViewBreakEven = (session?.user as any)?.role === 'DIRETTORE' || (session?.user as any)?.role === 'MANAGER'
  
  // Controlla se l'utente è un dipendente per mostrare dashboard personale
  const isEmployee = (session?.user as any)?.role === 'DIPENDENTE'
  
  // Controlla se l'utente è un cassiere per mostrare dashboard cassiere
  const isCashier = (session?.user as any)?.role === 'CASSIERE'
  
  // Controlla se l'utente è un manager o proprietario per mostrare dashboard manageriale
  const isManager = (session?.user as any)?.role === 'MANAGER' || (session?.user as any)?.role === 'PROPRIETARIO'
  
  const { logReadAction } = useAudit()
  
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)

  // Redirect se non autenticato e log accesso dashboard
  useEffect(() => {
    if (status === 'loading') return // Ancora caricando
    if (!session) {
      router.push('/login')
      return
    }
    
    // Log accesso alla dashboard
    logReadAction('dashboard')
  }, [session, status, router, logReadAction])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null // Redirect in corso
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                🍝 LA BRIGATA
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{(session.user as any)?.avatar}</span>
                         <div className="text-gray-700 font-medium">
                           Ciao, {session.user?.name}!
                         <div className="text-xs text-gray-500">
                           Livello {(session.user as any)?.level}
                         </div>
                       </div>
                     </div>
                     <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                       {(session.user as any)?.role}
                     </span>
                     
                     {/* Centro Notifiche */}
                     <NotificationBadge 
                       userId={session.user?.id}
                       onClick={() => setIsNotificationCenterOpen(true)}
                     />
                     
                     <button
                       onClick={() => signOut({ callbackUrl: '/' })}
                       className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                     >
                       Logout
                     </button>
                   </div>
          </div>
        </div>
      </header>
      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
                          <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {isEmployee ? 'La Mia Dashboard Personale' : 
                     isCashier ? 'Dashboard Cassiere' : 
                     isManager ? 'Dashboard Manageriale' :
                     'Benvenuto nella Dashboard!'}
                  </h2>
                  <p className="text-gray-600">
                    {isEmployee ? 'Gestisci i tuoi turni, mance e richieste' : 
                     isCashier ? 'Gestisci mance e turni del ristorante' :
                     isManager ? 'Gestisci prenotazioni, turni e personale' :
                     `Sistema di gestione per ${(session.user as any)?.role}`}
                  </p>
                </div>

                {/* Azioni Rapide */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <button 
                    onClick={() => router.push('/bookings')}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
                  >
                    🏬 Sale
                  </button>
                  {canManageEmployees() && (
                    <button 
                      onClick={() => router.push('/employees')}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                    >
                      👥 Dipendenti
                    </button>
                  )}
                  <button 
                    onClick={() => router.push('/shifts')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    📅 Turni
                  </button>
                  {canManageLeaves() && (
                    <button 
                      onClick={() => router.push('/leaves')}
                      className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                    >
                      🏖️ Ferie
                    </button>
                  )}
                  <button 
                    onClick={() => router.push('/tips')}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    💰 Mance
                  </button>
                  <button 
                    onClick={() => router.push('/bookings')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    📋 Prenotazioni
                  </button>
                </div>

                {/* Widget Break-Even per Direttore e Manager */}
                {canViewBreakEven && (
                  <div className="mb-8">
                    <BreakEvenWidget 
                      userId={session.user?.id}
                      userRole={(session.user as any)?.role}
                    />
                  </div>
                )}

          {/* Dashboard Content - Diversa per Ruoli */}
          {isEmployee ? (
            // Dashboard Personale per Dipendenti
            <EmployeeDashboard 
              userId={session.user?.id || ''}
              userName={session.user?.name || ''}
            />
          ) : isCashier ? (
            // Dashboard Cassiere
            <CashierDashboard 
              userId={session.user?.id || ''}
              userName={session.user?.name || ''}
            />
          ) : isManager ? (
            // Dashboard Manageriale
            <ManagerDashboard 
              userId={session.user?.id || ''}
              userName={session.user?.name || ''}
              userRole={(session.user as any)?.role || ''}
            />
          ) : (
            // Dashboard Manageriale per Altri Ruoli
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📅</div>
                <h3 className="text-lg font-semibold mb-2">I Miei Turni</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Visualizza e gestisci i turni
                </p>
                <button 
                  onClick={() => router.push('/shifts')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Vedi Turni
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">💰</div>
                <h3 className="text-lg font-semibold mb-2">Mance</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Gestisci le mance
                </p>
                <div className="space-y-2">
                  <button 
                    onClick={() => router.push('/tips')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    💰 Vedi Mance
                  </button>
                  {canInsertTips() && (
                    <button 
                      onClick={() => router.push('/tips/insert')}
                      className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
                    >
                      ➕ Inserisci Mance
                    </button>
                  )}
                </div>
              </div>

              {canManageEmployees() && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-4">👥</div>
                  <h3 className="text-lg font-semibold mb-2">Dipendenti</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Gestisci il team e i profili
                  </p>
                  <div className="space-y-2">
                    <button 
                      onClick={() => router.push('/employees')}
                      className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                    >
                      Gestisci Dipendenti
                    </button>
                    {canCreateEmployee() && (
                      <button 
                        onClick={() => router.push('/employees/new')}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                      >
                        ➕ Nuovo Dipendente
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canManageLeaves() && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-4">🏖️</div>
                  <h3 className="text-lg font-semibold mb-2">Ferie e Permessi</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Gestisci ferie e permessi
                  </p>
                  <div className="space-y-2">
                    <button 
                      onClick={() => router.push('/leaves')}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                    >
                      📋 Gestisci Ferie
                    </button>
                    {canRequestLeave() && (
                      <button 
                        onClick={() => router.push('/leaves/new')}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                      >
                        ➕ Nuova Richiesta
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canAccessAdmin() && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-4">⚙️</div>
                  <h3 className="text-lg font-semibold mb-2">Amministrazione</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Gestione sistema e utenti
                  </p>
                  <div className="space-y-2">
                    <button 
                      onClick={() => router.push('/admin')}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                    >
                      🛡️ Pannello Admin
                    </button>
                    {canViewReports() && (
                      <button 
                        onClick={() => router.push('/reports')}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                      >
                        📊 Report Avanzati
                      </button>
                    )}
                    {canViewBreakEven && (
                      <button 
                        onClick={() => router.push('/calendar')}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                      >
                        📅 Calendario Aziendale
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
                  </div>
        </main>
        
        {/* Centro Notifiche */}
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          userId={session.user?.id}
        />
      </div>
    )
  }
