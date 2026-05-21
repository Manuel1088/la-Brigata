'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'
import { formatCurrency } from '@/lib/formatNumber'
import { useDashboardData } from '@/hooks/useDashboardData'

// Color Palette La Brigata
const COLORS = {
  coral: '#E17055',
  orange: '#FDCB6E',
  yellow: '#F9CA24',
  lightBlue: '#74B9FF',
  darkBlue: '#2D3436'
}

interface DashboardAction {
  id: string
  icon: string
  label: string
  path: string
  color: string
  roles?: UserRole[]
}

interface TodayShift {
  start: string
  end: string
  role?: string
}

interface StoredShift {
  date: string
  employeeId: string
  start: string
  end: string
  role?: string
}

function isStoredShift(value: unknown): value is StoredShift {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.date === 'string' &&
    typeof v.employeeId === 'string' &&
    typeof v.start === 'string' &&
    typeof v.end === 'string'
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { userRole } = usePermissions()
  
  // ✅ NUOVO: Hook ottimizzato per dashboard (1 API invece di 4!)
  const { 
    company, 
    restaurant,
    stats, // ✅ stats.totalEmployees è già un COUNT (numero)
    pendingEmployments,
    activeEmployments,
    isLoading: isLoadingDashboard 
  } = useDashboardData()
  
  // States con valori di default sicuri
  const [monthlyTips, setMonthlyTips] = useState<number>(0)
  const [monthlyTipsDays, setMonthlyTipsDays] = useState<number>(0)
  const [todayTips, setTodayTips] = useState<number>(0)
  const [tipsLoading, setTipsLoading] = useState(true)
  const [tipsView, setTipsView] = useState<'restaurant' | 'personal'>('personal')
  const [liveTips, setLiveTips] = useState<number>(0)
  const [savingsFound, setSavingsFound] = useState<number>(1250)
  const [todayShift, setTodayShift] = useState<TodayShift | null>(null)
  const [bookingsToday, setBookingsToday] = useState<number>(12)
  const [weeklyEvents, setWeeklyEvents] = useState<number>(3)

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // AI Suggestions
  const aiSuggestions = [
    { 
      icon: '🎯', 
      text: 'Richiedi sabato libero (90% approvazione)', 
      action: () => router.push('/leaves') 
    },
    { 
      icon: '💼', 
      text: 'Controlla nuove opportunità di carriera', 
      action: () => router.push('/me') 
    },
    { 
      icon: '📚', 
      text: 'Corso disponibile: Servizio Avanzato', 
      action: () => alert('Funzionalità in arrivo!') 
    }
  ]

  const isRestaurantTipsRole = (role: string | undefined): boolean => {
    const r = (role || '').toUpperCase()
    return r === 'ADMIN' || r === 'MANAGER'
  }

  // Manager/Admin: TipEntry ristorante (/api/tips/summary). Dipendente: quota V2 (/api/tips/my)
  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false
    const role = session.user.role as string | undefined
    const restaurantView = isRestaurantTipsRole(role)

    const loadMonthlyTips = async () => {
      setTipsLoading(true)
      try {
        const now = new Date()
        const params = `year=${now.getFullYear()}&month=${now.getMonth()}`
        const url = restaurantView ? `/api/tips/summary?${params}` : `/api/tips/my?${params}`

        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) {
            setMonthlyTips(0)
            setMonthlyTipsDays(0)
            setTodayTips(0)
            setTipsView(restaurantView ? 'restaurant' : 'personal')
          }
          return
        }

        if (restaurantView) {
          const data = (await res.json()) as {
            summary?: {
              monthTotal?: number
              monthDaysWithTips?: number
              todayTotal?: number
            }
          }
          if (!cancelled) {
            setTipsView('restaurant')
            setMonthlyTips(Number(data.summary?.monthTotal ?? 0))
            setMonthlyTipsDays(Number(data.summary?.monthDaysWithTips ?? 0))
            setTodayTips(Number(data.summary?.todayTotal ?? 0))
          }
        } else {
          const data = (await res.json()) as {
            summary?: { total?: number; daysWithTips?: number }
          }
          if (!cancelled) {
            setTipsView('personal')
            setMonthlyTips(Number(data.summary?.total ?? 0))
            setMonthlyTipsDays(Number(data.summary?.daysWithTips ?? 0))
            setTodayTips(0)
          }
        }
      } catch (error) {
        console.error('Error loading monthly tips:', error)
        if (!cancelled) {
          setMonthlyTips(0)
          setMonthlyTipsDays(0)
          setTodayTips(0)
        }
      } finally {
        if (!cancelled) setTipsLoading(false)
      }
    }

    void loadMonthlyTips()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, session?.user?.role])

  // ✅ CORREZIONE: Carica turno di oggi
  useEffect(() => {
    try {
      const raw = localStorage.getItem('shifts_v1::restaurant_1')
      if (!raw) return
      
      const parsed = JSON.parse(raw) as unknown
      const shifts: StoredShift[] = Array.isArray(parsed) ? parsed.filter(isStoredShift) : []
      if (shifts.length === 0) return
      
      const today = new Date().toISOString().split('T')[0]
      const shift = shifts.find((s) => s.date === today && s.employeeId === (session?.user?.id || ''))
      
      setTodayShift(shift || null)
    } catch (error) {
      console.error('Error loading today shift:', error)
      setTodayShift(null)
    }
  }, [session?.user?.id])

  // ✅ CORREZIONE: Live tips solo se effettivamente in turno
  useEffect(() => {
    if (!todayShift) return
    
    // Verifica se siamo nell'orario del turno
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startH, startM] = todayShift.start.split(':').map(Number)
    const [endH, endM] = todayShift.end.split(':').map(Number)
    const shiftStart = startH * 60 + startM
    const shiftEnd = endH * 60 + endM
    
    if (currentTime < shiftStart || currentTime > shiftEnd) {
      setLiveTips(0)
      return
    }
    
    // Simula aggiornamento live tips
    const tipTimer = setInterval(() => {
      setLiveTips(prev => {
        const newTip = prev + (Math.random() * 3)
        return isNaN(newTip) ? 0 : newTip
      })
    }, 8000)
    
    return () => clearInterval(tipTimer)
  }, [todayShift])

  // Helper: Check if currently in shift
  const isInShift = (): boolean => {
    if (!todayShift) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    try {
      const [startH, startM] = todayShift.start.split(':').map(Number)
      const [endH, endM] = todayShift.end.split(':').map(Number)
      const shiftStart = startH * 60 + startM
      const shiftEnd = endH * 60 + endM
      
      return currentTime >= shiftStart && currentTime <= shiftEnd
    } catch {
      return false
    }
  }

  // Helper: Get greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buongiorno'
    if (hour < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  }

  // Dashboard actions based on role
  const dashboardActions: DashboardAction[] = [
    {
      id: 'tips',
      icon: '💰',
      label: 'Le Mie Mance',
      path: '/tips',
      color: COLORS.yellow,
      // Nascondi per Proprietario/Admin per coerenza con sidebar
      roles: [
        UserRole.DIPENDENTE,
        UserRole.CASSIERE,
        UserRole.HEAD_CHEF,
        UserRole.HEAD_BARMAN,
        UserRole.HEAD_SOMMELIER,
        UserRole.DIPENDENTE_SALA,
        UserRole.DIPENDENTE_BAR,
        UserRole.CAMERIERE,
        UserRole.CAMERIERE_SENIOR,
        UserRole.CUOCO_QUALIFICATO,
        UserRole.CHEF,
        UserRole.CAPO_PARTITA,
        UserRole.SOUS_CHEF,
        UserRole.RUNNER,
        UserRole.LAVAPIATTI
      ]
    },
    {
      id: 'shifts',
      icon: '📅',
      label: 'I Miei Turni',
      path: '/shifts',
      color: COLORS.lightBlue,
      // Nascondi per Proprietario/Admin per coerenza con sidebar
      roles: [
        UserRole.DIPENDENTE,
        UserRole.CASSIERE,
        UserRole.HEAD_CHEF,
        UserRole.HEAD_BARMAN,
        UserRole.HEAD_SOMMELIER,
        UserRole.DIPENDENTE_SALA,
        UserRole.DIPENDENTE_BAR,
        UserRole.CAMERIERE,
        UserRole.CAMERIERE_SENIOR,
        UserRole.CUOCO_QUALIFICATO,
        UserRole.CHEF,
        UserRole.CAPO_PARTITA,
        UserRole.SOUS_CHEF,
        UserRole.RUNNER,
        UserRole.LAVAPIATTI
      ]
    },
    {
      id: 'employees',
      icon: '👥',
      label: 'Il Mio Team',
      path: '/team',
      color: COLORS.orange,
      roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
    },
    {
      id: 'profile',
      icon: '📊',
      label: 'Profilo',
      path: '/me',
      color: COLORS.darkBlue,
      // Mostra a tutti gli utenti
    }
  ]

  // Filter actions based on user role
  const availableActions = dashboardActions.filter(action => 
    !action.roles || action.roles.includes(userRole as UserRole)
  )

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {session.user?.name?.split(' ')[0] || 'Team'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Ecco la tua panoramica per oggi
          </p>
        </div>

        {/* Savings Discovery - Immediate Value */}
        {savingsFound > 0 && (
          <div 
            className="bg-green-50 border-2 border-green-500 rounded-2xl p-5 mb-6 cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => router.push('/buste-paga')}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-green-800 mb-1">
                  💡 Risparmio Scoperto!
                </h3>
                <p className="text-sm text-green-700">
                  Analisi ultima busta paga
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">
                  +€{savingsFound.toLocaleString()}
                </div>
                <p className="text-sm text-green-600">potenziale annuo</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🤖 Suggerimenti AI</h2>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={suggestion.action}
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl mr-3">{suggestion.icon}</span>
                <span className="text-gray-700">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {availableActions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(action.path)}
              className="bg-white rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl shadow-md flex flex-col items-center gap-2"
              style={{ borderTop: `4px solid ${action.color}` }}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className="font-semibold text-gray-800 text-center">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Tips This Month */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">
                  {tipsView === 'restaurant'
                    ? 'Mance ristorante (mese)'
                    : 'Le tue mance (mese)'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {tipsLoading ? '…' : formatCurrency(monthlyTips)}
                </p>
                {!tipsLoading && tipsView === 'restaurant' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Oggi: {formatCurrency(todayTips)}
                  </p>
                )}
                {!tipsLoading && monthlyTipsDays > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {monthlyTipsDays} giorn{monthlyTipsDays === 1 ? 'o' : 'i'} con{' '}
                    {tipsView === 'restaurant' ? 'inserimenti' : 'mance'}
                  </p>
                )}
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <button
              onClick={() =>
                router.push(tipsView === 'restaurant' ? '/team/mance' : '/tips')
              }
              className="text-sm text-orange-600 font-semibold hover:underline"
            >
              Vedi dettagli →
            </button>
          </div>

          {/* Live Tips (only if in shift) - non mostrare per Proprietario/Admin */}
          {isInShift() && userRole !== UserRole.PROPRIETARIO && userRole !== UserRole.ADMIN && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-sm border-2 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-green-700 font-medium">Mance live oggi</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(liveTips)}
                  </p>
                </div>
                <div className="text-3xl animate-pulse">⚡</div>
              </div>
              <p className="text-xs text-green-600">
                Aggiornamento in tempo reale • Turno: {todayShift?.start} - {todayShift?.end}
              </p>
            </div>
          )}

          {/* Prenotazioni Oggi */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Prenotazioni oggi</p>
                <p className="text-2xl font-bold text-gray-900">{bookingsToday}</p>
              </div>
              <div className="text-3xl">📋</div>
            </div>
            <button
              onClick={() => router.push('/operations')}
              className="text-sm text-orange-600 font-semibold hover:underline"
            >
              Gestisci →
            </button>
          </div>

          {/* Eventi Settimana */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Eventi questa settimana</p>
                <p className="text-2xl font-bold text-gray-900">{weeklyEvents}</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
            <button
              onClick={() => router.push('/shifts')}
              className="text-sm text-orange-600 font-semibold hover:underline"
            >
              Vedi calendario →
            </button>
          </div>
        </div>

        {/* ✅ DATI REALI DA API BATCH - Company & Team Info */}
        {!isLoadingDashboard && (company || stats.totalEmployees > 0 || pendingEmployments.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Company Info */}
            {company && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Azienda</p>
                    <p className="text-lg font-bold text-gray-900">{company.name}</p>
                  </div>
                  <div className="text-3xl">🏢</div>
                </div>
                {restaurant && (
                  <p className="text-sm text-gray-600 mt-2">
                    📍 {restaurant.name}
                  </p>
                )}
              </div>
            )}

            {/* Pending Requests (solo per manager/owner) */}
            {pendingEmployments.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Richieste in attesa</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingEmployments.length}</p>
                  </div>
                  <div className="text-3xl">⏳</div>
                </div>
                <button
                  onClick={() => router.push('/approvals')}
                  className="text-sm text-orange-600 font-semibold hover:underline"
                >
                  Gestisci →
                </button>
              </div>
            )}

            {/* Team Stats */}
            {stats.totalEmployees > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Team</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {stats.activeContracts > 0 && (
                    <p>✅ {stats.activeContracts} contratti attivi</p>
                  )}
                </div>
                <button
                  onClick={() => router.push('/team')}
                  className="text-sm text-orange-600 font-semibold hover:underline mt-2"
                >
                  Vedi team →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Today's Shift Info */}
        {todayShift && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  📍 Il Tuo Turno Oggi
                </h3>
                <p className="text-blue-700">
                  {todayShift.start} - {todayShift.end}
                  {todayShift.role && ` • ${todayShift.role}`}
                </p>
              </div>
              <button
                onClick={() => router.push('/shifts')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dettagli
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}