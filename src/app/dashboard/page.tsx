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
    userRole,
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
  // Visibilità sezioni dashboard gestite da Gestione Accessi (/access)
  const [dashboardVisibility, setDashboardVisibility] = useState<Record<string, boolean> | null>(null)

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

  // Carica visibilità dashboard da localStorage (user_access_controls_v1)
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    try {
      const raw = localStorage.getItem('user_access_controls_v1')
      const map = raw ? JSON.parse(raw) as Record<string, { dashboard?: Record<string, boolean> }> : {}
      setDashboardVisibility(map[userId]?.dashboard || {})
    } catch {
      setDashboardVisibility({})
    }
  }, [session?.user?.id])

  const isSectionVisible = (section: 'bookings' | 'sale' | 'customers' | 'leaves' | 'shifts' | 'rest' | 'tips' | 'admin'): boolean => {
    const upperRole = (userRole || '').toString().toUpperCase()
    if (upperRole === 'ADMIN' || upperRole === 'PROPRIETARIO') return true
    const value = dashboardVisibility?.[section]
    return value === undefined ? true : !!value
  }

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

                

                {/* Navigazione rapida a tutte le pagine principali */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
                  {isSectionVisible('bookings') && (
                    <button onClick={() => router.push('/bookings')} className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition">📋 Prenotazioni</button>
                  )}
                  {isSectionVisible('sale') && (
                    <button onClick={() => router.push('/sale')} className="bg-gray-700 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition">🏬 Sale</button>
                  )}
                  {isSectionVisible('customers') && (
                    <button onClick={() => router.push('/customers')} className="bg-slate-600 text-white px-4 py-3 rounded-lg hover:bg-slate-700 transition">📒 Clienti</button>
                  )}
                  {isSectionVisible('leaves') && (
                    <button onClick={() => router.push('/leaves')} className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition">🏖️ Ferie e Permessi</button>
                  )}
                  {isSectionVisible('shifts') && (
                    <button onClick={() => router.push('/shifts')} className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition">📅 Turni</button>
                  )}
                  {isSectionVisible('rest') && (
                    <button onClick={() => router.push('/shifts/rest')} className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition">😴 Regole Riposi</button>
                  )}
                  {isSectionVisible('tips') && (
                    <button onClick={() => router.push('/tips')} className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition">💰 Mance</button>
                  )}
                  {canAccessAdmin() && isSectionVisible('admin') && (
                    <button onClick={() => router.push('/access')} className="bg-rose-600 text-white px-4 py-3 rounded-lg hover:bg-rose-700 transition">🧩 Gestione Accessi</button>
                  )}
                  
                  {canManageEmployees() && (
                    <button onClick={() => router.push('/employees')} className="bg-fuchsia-600 text-white px-4 py-3 rounded-lg hover:bg-fuchsia-700 transition">👥 Dipendenti</button>
                  )}
                  {canViewBreakEven && (
                    <button onClick={() => router.push('/calendar')} className="bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 transition">📆 Calendario Aziendale</button>
                  )}
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
          ) : null}
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
