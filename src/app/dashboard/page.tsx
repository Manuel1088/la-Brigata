'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'
import { formatCurrency } from '@/lib/formatNumber'
import { shiftHubLabel } from '@/lib/shifts'
import { useDashboardData } from '@/hooks/useDashboardData'

interface HubShift {
  id: string
  time: string
  department: string
  status: string
}

interface MeHubData {
  todayShift: HubShift | null
}

const hubFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Failed to load hub')
    return res.json() as Promise<MeHubData>
  })

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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { userRole } = usePermissions()
  
  // ✅ NUOVO: Hook ottimizzato per dashboard (1 API invece di 4!)
  const {
    company,
    restaurant,
    stats,
    widgets,
    pendingEmployments,
    isLoading: isLoadingDashboard,
  } = useDashboardData()
  
  // States con valori di default sicuri
  const [monthlyTips, setMonthlyTips] = useState<number>(0)
  const [monthlyTipsDays, setMonthlyTipsDays] = useState<number>(0)
  const [todayTips, setTodayTips] = useState<number>(0)
  const [tipsLoading, setTipsLoading] = useState(true)
  const [tipsView, setTipsView] = useState<'restaurant' | 'personal'>('personal')
  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

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

  const isManagerOrAdmin =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.MANAGER ||
    isRestaurantTipsRole(session?.user?.role as string | undefined)

  const showPersonalShift = !isManagerOrAdmin
  const { data: hubData, isLoading: hubLoading } = useSWR<MeHubData>(
    showPersonalShift && status === 'authenticated' ? '/api/me/hub' : null,
    hubFetcher,
    { revalidateOnFocus: true }
  )
  const todayShift = shiftHubLabel(hubData?.todayShift ?? null)

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

        {/* Azioni rapide + card operative */}
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

          {showPersonalShift ? (
            <div
              className={`rounded-2xl p-6 shadow-md text-white ${
                todayShift.tone === 'work'
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 border-t-4 border-orange-300'
                  : todayShift.tone === 'leave'
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-t-4 border-purple-300'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600 border-t-4 border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium opacity-90">Il tuo turno oggi</p>
                  <p className="text-2xl font-bold mt-1">
                    {hubLoading ? '…' : todayShift.title}
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    {hubLoading ? '' : todayShift.subtitle}
                  </p>
                </div>
                <span className="text-3xl">📅</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shifts')}
                className="text-sm font-semibold hover:underline opacity-90"
              >
                I miei turni →
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600">In turno oggi</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingDashboard ? '…' : widgets.shiftsTodayCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">dipendenti presenti</p>
                </div>
                <span className="text-3xl">👥</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/team/turni')}
                className="text-sm text-orange-600 font-semibold hover:underline"
              >
                Calendario turni →
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-indigo-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">{widgets.yesterdayTipsLabel}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingDashboard ? '…' : formatCurrency(widgets.yesterdayTipsTotal)}
                </p>
              </div>
              <span className="text-3xl">📆</span>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  widgets.tipsView === 'restaurant' || isManagerOrAdmin
                    ? '/team/mance'
                    : '/tips'
                )
              }
              className="text-sm text-orange-600 font-semibold hover:underline"
            >
              Dettaglio mance →
            </button>
          </div>
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

          {widgets.hasBookings && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Prenotazioni oggi</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {widgets.bookingsTodayCount}
                  </p>
                </div>
                <div className="text-3xl">📋</div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/operations')}
                className="text-sm text-orange-600 font-semibold hover:underline"
              >
                Gestisci →
              </button>
            </div>
          )}

          {widgets.hasEvents && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Eventi questa settimana</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {widgets.weeklyEventsCount}
                  </p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shifts')}
                className="text-sm text-orange-600 font-semibold hover:underline"
              >
                Vedi calendario →
              </button>
            </div>
          )}
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

      </div>
    </div>
  )
}