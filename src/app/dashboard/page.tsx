'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'
import { formatEuro } from '@/lib/utils'
import { shiftHubLabel } from '@/lib/shifts'
import { useDashboardData } from '@/hooks/useDashboardData'
import PlatformAdminDashboard from '@/components/dashboard/PlatformAdminDashboard'

interface HubShift {
  id: string
  time: string
  department: string
  status: string
}

interface MeHubData {
  todayShift: HubShift | null
  monthlyTips?: {
    total: number
    daysWithTips: number
    month: number
    year: number
    monthLabel: string
  }
}

type LeaveBalance = {
  type: string
  total: number
  used: number
  remaining: number
  percentage: number
}

type LeaveRequestRow = {
  id: string
  type: string
  startDate: string
  endDate: string
  status: string
}

type LeavesHubData = {
  balances?: LeaveBalance[]
  requests?: LeaveRequestRow[]
}

const hubFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Failed to load hub')
    return res.json() as Promise<MeHubData>
  })

const leavesFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Failed to load leaves')
    return res.json() as Promise<LeavesHubData>
  })

function formatLeaveRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const startLabel = start.toLocaleDateString('it-IT', opts)
  const endLabel = end.toLocaleDateString('it-IT', opts)
  if (startDate.slice(0, 10) === endDate.slice(0, 10)) return startLabel
  return `${startLabel} – ${endLabel}`
}

function leaveSummary(
  type: 'VACATION' | 'ROL',
  balances: LeaveBalance[],
  requests: LeaveRequestRow[]
) {
  const balance = balances.find((b) => b.type === type)
  const remaining = balance?.remaining ?? 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureApproved = requests
    .filter(
      (r) =>
        r.type === type &&
        r.status === 'APPROVED' &&
        new Date(r.endDate) >= today
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

  const pendingCount = requests.filter(
    (r) => r.type === type && r.status === 'PENDING'
  ).length

  const remainingLabel =
    type === 'VACATION'
      ? remaining === 1
        ? '1 giorno residuo'
        : `${remaining} giorni residui`
      : remaining === 1
        ? '1 ora residua'
        : `${remaining} ore residue`

  return {
    remaining,
    remainingLabel,
    futureApproved,
    pendingCount,
  }
}

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
  const [tipsLoading, setTipsLoading] = useState(true)
  const [tipsView, setTipsView] = useState<'restaurant' | 'personal'>('personal')
  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  const isPlatformAdmin =
    session?.user?.role === 'ADMIN' && session?.user?.level === 11

  const isRestaurantTipsRole = (role: string | undefined): boolean => {
    const r = (role || '').toUpperCase()
    return r === 'ADMIN' || r === 'MANAGER'
  }

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
  const { data: leavesData, isLoading: leavesLoading } = useSWR<LeavesHubData>(
    showPersonalShift && status === 'authenticated'
      ? '/api/leaves?includeBalances=true'
      : null,
    leavesFetcher,
    { revalidateOnFocus: true }
  )

  // Manager/Admin: totale mance ristorante del mese corrente
  useEffect(() => {
    if (!session?.user?.id || showPersonalShift) return

    let cancelled = false
    const loadRestaurantTips = async () => {
      setTipsLoading(true)
      try {
        const now = new Date()
        const params = `year=${now.getFullYear()}&month=${now.getMonth()}`
        const res = await fetch(`/api/tips/summary?${params}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (!cancelled) {
            setMonthlyTips(0)
            setMonthlyTipsDays(0)
            setTipsView('restaurant')
          }
          return
        }
        const data = (await res.json()) as {
          summary?: { monthTotal?: number; monthDaysWithTips?: number }
        }
        if (!cancelled) {
          setTipsView('restaurant')
          setMonthlyTips(Number(data.summary?.monthTotal ?? 0))
          setMonthlyTipsDays(Number(data.summary?.monthDaysWithTips ?? 0))
        }
      } catch (error) {
        console.error('Error loading monthly tips:', error)
        if (!cancelled) {
          setMonthlyTips(0)
          setMonthlyTipsDays(0)
        }
      } finally {
        if (!cancelled) setTipsLoading(false)
      }
    }

    void loadRestaurantTips()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, session?.user?.restaurantId, showPersonalShift])

  // Dipendente: stesso totale mese di /me (da /api/me/hub, non oggi)
  useEffect(() => {
    if (!showPersonalShift) return
    setTipsView('personal')
    if (hubLoading) {
      setTipsLoading(true)
      return
    }
    setTipsLoading(false)
    setMonthlyTips(Number(hubData?.monthlyTips?.total ?? 0))
    setMonthlyTipsDays(Number(hubData?.monthlyTips?.daysWithTips ?? 0))
  }, [showPersonalShift, hubLoading, hubData?.monthlyTips])
  const todayShift = shiftHubLabel(hubData?.todayShift ?? null)

  const leaveBalances = leavesData?.balances ?? []
  const leaveRequests = leavesData?.requests ?? []
  const vacationSummary = leaveSummary('VACATION', leaveBalances, leaveRequests)
  const rolSummary = leaveSummary('ROL', leaveBalances, leaveRequests)

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

  if (isPlatformAdmin) {
    return <PlatformAdminDashboard userName={session.user?.name} />
  }

  const statCardClass =
    'bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col'
  const statLinkClass =
    'text-sm text-orange-600 font-semibold hover:underline mt-auto pt-2 inline-block self-start'
  const employeeCardsGridClass =
    'grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-stretch'

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

        {/* Azioni rapide */}
        {availableActions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-md">
            {availableActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => router.push(action.path)}
                className="bg-white rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md flex flex-col items-center gap-2"
                style={{ borderTop: `4px solid ${action.color}` }}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="font-semibold text-gray-800 text-center text-sm">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {showPersonalShift ? (
          <div className={employeeCardsGridClass}>
            {/* Riga 1: Turno + Prenotazioni + vuoto */}
            <div
              className={`col-span-1 ${statCardClass} border-t-4 border-orange-500`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600">Il tuo turno oggi</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight">
                    {hubLoading ? '…' : todayShift.title}
                  </p>
                  {!hubLoading && todayShift.subtitle ? (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {todayShift.subtitle}
                    </p>
                  ) : null}
                </div>
                <span className="text-xl shrink-0">📅</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shifts')}
                className={statLinkClass}
              >
                I miei turni →
              </button>
            </div>

            <div className={`col-span-1 ${statCardClass} border-t-4 border-indigo-400`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-600">Prenotazioni oggi</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoadingDashboard ? '…' : widgets.bookingsTodayCount}
                  </p>
                </div>
                <span className="text-xl shrink-0">📋</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/operations')}
                className={statLinkClass}
              >
                Gestisci →
              </button>
            </div>
            <div className="hidden md:block md:col-span-1" aria-hidden />

            {/* Riga 2: Ferie + ROL + vuoto */}
            <div className={`col-span-1 ${statCardClass} border-t-4 border-blue-400`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-600">Ferie</p>
                  <p className="text-lg font-bold text-gray-900">
                    {leavesLoading ? '…' : vacationSummary.remainingLabel}
                  </p>
                  {!leavesLoading && vacationSummary.pendingCount > 0 && (
                    <p className="text-xs text-amber-700">
                      {vacationSummary.pendingCount} in attesa
                    </p>
                  )}
                  {!leavesLoading &&
                    vacationSummary.pendingCount === 0 &&
                    vacationSummary.futureApproved.length > 0 && (
                      <p className="text-xs text-gray-500 truncate">
                        {vacationSummary.futureApproved
                          .slice(0, 1)
                          .map((r) => formatLeaveRange(r.startDate, r.endDate))
                          .join('')}
                      </p>
                    )}
                </div>
                <span className="text-xl shrink-0">🏖️</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/leaves')}
                className={statLinkClass}
              >
                Ferie →
              </button>
            </div>

            <div className={`col-span-1 ${statCardClass} border-t-4 border-emerald-400`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-600">Rol</p>
                  <p className="text-lg font-bold text-gray-900">
                    {leavesLoading ? '…' : rolSummary.remainingLabel}
                  </p>
                  {!leavesLoading && rolSummary.pendingCount > 0 && (
                    <p className="text-xs text-amber-700">
                      {rolSummary.pendingCount} in attesa
                    </p>
                  )}
                  {!leavesLoading &&
                    rolSummary.pendingCount === 0 &&
                    rolSummary.futureApproved.length > 0 && (
                      <p className="text-xs text-gray-500 truncate">
                        {rolSummary.futureApproved
                          .slice(0, 1)
                          .map((r) => formatLeaveRange(r.startDate, r.endDate))
                          .join('')}
                      </p>
                    )}
                </div>
                <span className="text-xl shrink-0">⏰</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/leaves')}
                className={statLinkClass}
              >
                Rol →
              </button>
            </div>
            <div className="hidden md:block md:col-span-1" aria-hidden />

            {/* Riga 3: Mance + vuoto (2 colonne) */}
            <div className={`col-span-1 ${statCardClass} border-t-4 border-amber-400`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-600">
                    {tipsView === 'restaurant'
                      ? 'Mance ristorante (mese)'
                      : 'Le tue mance (mese)'}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {tipsLoading ? '…' : formatEuro(monthlyTips)}
                  </p>
                  {!tipsLoading && monthlyTipsDays > 0 && (
                    <p className="text-xs text-gray-500">
                      {monthlyTipsDays} giorn{monthlyTipsDays === 1 ? 'o' : 'i'} con{' '}
                      {tipsView === 'restaurant' ? 'inserimenti' : 'mance'}
                    </p>
                  )}
                </div>
                <span className="text-xl shrink-0">💰</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(tipsView === 'restaurant' ? '/team/mance' : '/tips')
                }
                className={statLinkClass}
              >
                Vedi dettagli →
              </button>
            </div>
            <div className="hidden md:block md:col-span-2" aria-hidden />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 items-stretch">
              <div className={`${statCardClass} border-t-4 border-orange-500 shadow-md`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-600">In turno oggi</p>
                    <p className="text-lg font-bold text-gray-900">
                      {isLoadingDashboard ? '…' : widgets.shiftsTodayCount}
                    </p>
                    <p className="text-xs text-gray-500">dipendenti presenti</p>
                  </div>
                  <span className="text-xl shrink-0">👥</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/shifts')}
                  className={statLinkClass}
                >
                  Calendario turni →
                </button>
              </div>

              <div className={`${statCardClass} border-t-4 border-indigo-400`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Prenotazioni oggi</p>
                    <p className="text-lg font-bold text-gray-900">
                      {isLoadingDashboard ? '…' : widgets.bookingsTodayCount}
                    </p>
                  </div>
                  <span className="text-xl shrink-0">📋</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/operations')}
                  className={statLinkClass}
                >
                  Gestisci →
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className={`${statCardClass} border-t-4 border-amber-400`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Mance ristorante (mese)</p>
                    <p className="text-lg font-bold text-gray-900">
                      {tipsLoading ? '…' : formatEuro(monthlyTips)}
                    </p>
                    {!tipsLoading && monthlyTipsDays > 0 && (
                      <p className="text-xs text-gray-500">
                        {monthlyTipsDays} giorn{monthlyTipsDays === 1 ? 'o' : 'i'} con
                        inserimenti
                      </p>
                    )}
                  </div>
                  <span className="text-xl shrink-0">💰</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/team/mance')}
                  className={statLinkClass}
                >
                  Vedi dettagli →
                </button>
              </div>
            </div>
          </>
        )}

        {widgets.hasEvents && (
          <div className="mb-8">
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-600">Eventi questa settimana</p>
                  <p className="text-lg font-bold text-gray-900">
                    {widgets.weeklyEventsCount}
                  </p>
                </div>
                <span className="text-xl shrink-0">📅</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shifts')}
                className={statLinkClass}
              >
                Vedi calendario →
              </button>
            </div>
          </div>
        )}

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
                  onClick={() => router.push('/approvals?tab=candidatures')}
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