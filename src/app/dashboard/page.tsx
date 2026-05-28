'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import { formatEuro } from '@/lib/utils'
import { shiftHubLabel } from '@/lib/shifts'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { isManagerRole } from '@/lib/roles'
import { useDashboardData } from '@/hooks/useDashboardData'
import PlatformAdminDashboard from '@/components/dashboard/PlatformAdminDashboard'

// ── Types ──────────────────────────────────────────────────────────────────

type HubShift = { id: string; time: string; department: string; status: string }
type MeHubData = {
  todayShift: HubShift | null
  monthlyTips?: {
    total: number
    daysWithTips: number
    month: number
    year: number
    monthLabel: string
  }
}
type LeaveBalance = { type: string; total: number; used: number; remaining: number }
type LeavesData = {
  balances?: LeaveBalance[]
  requests?: Array<{ id: string; type: string; startDate: string; endDate: string; status: string }>
}
type TaskRow = {
  id: string
  title: string
  dueDate: string | null
  priority: 'ALTA' | 'MEDIA' | 'BASSA'
  status: string
}
type NotifRow = {
  id: string
  title: string
  body?: string
  isRead: boolean
  isUrgent?: boolean
  createdAt: string
  category?: string
}

// ── Fetcher ────────────────────────────────────────────────────────────────

const cFetch = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

// ── Helpers ────────────────────────────────────────────────────────────────

function greet(firstName?: string | null, name?: string | null): string {
  const h = new Date().getHours()
  const word = h >= 6 && h < 12 ? 'Buongiorno' : h >= 12 && h < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const display = firstName?.trim() || name?.split(' ')[0] || ''
  return display ? `${word}, ${display}` : word
}

function todayLabel(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function priorityDot(p: 'ALTA' | 'MEDIA' | 'BASSA'): string {
  if (p === 'ALTA') return 'bg-red-500'
  if (p === 'MEDIA') return 'bg-amber-400'
  return 'bg-gray-300'
}

function taskDueLabel(iso: string | null): { text: string; cls: string } {
  if (!iso) return { text: '', cls: '' }
  const due = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (due < today) return { text: 'Scaduto', cls: 'text-red-500' }
  if (due < tomorrow) return { text: 'Oggi', cls: 'text-amber-500' }
  return { text: due.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), cls: 'text-gray-400' }
}

// ── Small card shell ───────────────────────────────────────────────────────

function Card({
  icon,
  title,
  children,
  accent,
  error,
}: {
  icon: string
  title: string
  children?: React.ReactNode
  accent?: string
  error?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${accent ? `border-t-4 ${accent}` : ''}`}>
      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-5 pb-5">
        {error ? (
          <p className="text-sm text-gray-400 italic mt-2">Dati non disponibili</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

// ── Turno oggi ─────────────────────────────────────────────────────────────

function ShiftCard({ hub, loading }: { hub: MeHubData | undefined; loading: boolean }) {
  if (loading) return <Card icon="🕐" title="Il mio turno" accent="border-blue-400"><div className="h-10 animate-pulse bg-gray-100 rounded mt-2" /></Card>

  const label = shiftHubLabel(hub?.todayShift ?? null)
  const toneColor =
    label.tone === 'rest' ? 'text-gray-400' : label.tone === 'leave' ? 'text-green-600' : 'text-gray-900'

  return (
    <Card icon="🕐" title="Il mio turno oggi" accent="border-blue-400">
      <p className={`text-2xl font-bold mt-2 ${toneColor}`}>{label.title}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label.subtitle}</p>
      {hub?.todayShift?.department && (
        <p className="text-xs text-gray-400 mt-1">📍 {hub.todayShift.department}</p>
      )}
    </Card>
  )
}

// ── Ferie / ROL ────────────────────────────────────────────────────────────

function LeaveCard({
  leaves,
  loading,
  error,
}: {
  leaves: LeavesData | undefined
  loading: boolean
  error: boolean
}) {
  if (loading) return (
    <Card icon="🏖️" title="Ferie e ROL">
      <div className="h-10 animate-pulse bg-gray-100 rounded mt-2" />
    </Card>
  )

  const vac = leaves?.balances?.find((b) => b.type === 'VACATION')
  const rol = leaves?.balances?.find((b) => b.type === 'ROL')

  return (
    <Card icon="🏖️" title="Ferie e ROL" accent="border-green-400" error={error && !leaves}>
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Ferie</span>
          <span className="text-lg font-bold text-green-700">
            {vac ? `${vac.remaining}g` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ROL</span>
          <span className="text-lg font-bold text-teal-700">
            {rol ? `${rol.remaining}h` : '—'}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ── Mance personali ────────────────────────────────────────────────────────

function PersonalTipsCard({ hub, loading }: { hub: MeHubData | undefined; loading: boolean }) {
  if (loading) return <Card icon="💰" title="Le mie mance"><div className="h-10 animate-pulse bg-gray-100 rounded mt-2" /></Card>

  const tips = hub?.monthlyTips
  return (
    <Card icon="💰" title="Le mie mance (mese)" accent="border-amber-400">
      {tips ? (
        <>
          <p className="text-2xl font-bold text-amber-600 mt-2">{formatEuro(tips.total)}</p>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{tips.monthLabel} · {tips.daysWithTips} {tips.daysWithTips === 1 ? 'giorno' : 'giorni'}</p>
        </>
      ) : (
        <p className="text-sm text-gray-400 italic mt-2">Nessuna mance questo mese</p>
      )}
    </Card>
  )
}

// ── Task urgenti ───────────────────────────────────────────────────────────

function UrgentTasksCard({
  tasks,
  loading,
  error,
  onComplete,
}: {
  tasks: TaskRow[] | undefined
  loading: boolean
  error: boolean
  onComplete: (id: string) => void
}) {
  if (loading) return <Card icon="📋" title="Task urgenti"><div className="h-16 animate-pulse bg-gray-100 rounded mt-2" /></Card>
  const top3 = (tasks ?? []).filter((t) => t.status !== 'COMPLETATO').slice(0, 3)

  return (
    <Card icon="📋" title="I miei task" accent="border-orange-400" error={error && !tasks}>
      {top3.length === 0 ? (
        <p className="text-sm text-gray-400 italic mt-2">Nessun task in attesa</p>
      ) : (
        <div className="mt-2 space-y-2">
          {top3.map((t) => {
            const due = taskDueLabel(t.dueDate)
            return (
              <div key={t.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onComplete(t.id)}
                  className="flex-shrink-0 w-4 h-4 rounded border-2 border-gray-300 hover:border-green-400 transition"
                />
                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${priorityDot(t.priority)}`} />
                <span className="text-sm text-gray-800 flex-1 truncate">{t.title}</span>
                {due.text && (
                  <span className={`text-xs flex-shrink-0 font-medium ${due.cls}`}>{due.text}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ── Ultima notifica ────────────────────────────────────────────────────────

function NotificationCard({
  notif,
  loading,
  error,
}: {
  notif: NotifRow | undefined
  loading: boolean
  error: boolean
}) {
  if (loading) return <Card icon="🔔" title="Notifiche"><div className="h-10 animate-pulse bg-gray-100 rounded mt-2" /></Card>

  return (
    <Card icon="🔔" title="Ultima notifica" error={error && !notif}>
      {!notif ? (
        <p className="text-sm text-gray-400 italic mt-2">Nessuna notifica</p>
      ) : (
        <div className="mt-2">
          <div className="flex items-start gap-2">
            {!notif.isRead && <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-orange-500" />}
            <div>
              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
              {notif.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(notif.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Dept tasks ─────────────────────────────────────────────────────────────

function DeptTasksCard({ tasks, loading, error }: { tasks: TaskRow[] | undefined; loading: boolean; error: boolean }) {
  if (loading) return <Card icon="📋" title="Task reparto oggi"><div className="h-10 animate-pulse bg-gray-100 rounded mt-2" /></Card>
  const list = tasks ?? []

  return (
    <Card icon="📋" title="Task reparto — in scadenza oggi" accent="border-purple-400" error={error && !tasks}>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 italic mt-2">Nessun task in scadenza oggi</p>
      ) : (
        <div className="mt-2 space-y-2">
          {list.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${priorityDot(t.priority)}`} />
              <span className="text-sm text-gray-800 flex-1 truncate">{t.title}</span>
              <span className="text-xs text-amber-500 font-medium">Oggi</span>
            </div>
          ))}
          {list.length > 4 && <p className="text-xs text-gray-400">+{list.length - 4} altri</p>}
        </div>
      )}
    </Card>
  )
}

// ── Manager inbox ──────────────────────────────────────────────────────────

type InboxItem = { id: string; label: string; icon: string; path: string; urgent?: boolean }

function InboxCard({
  pendingCount,
  pendingEmployments,
  yesterdayTipsTotal,
  router,
}: {
  pendingCount: number | undefined
  pendingEmployments: number
  yesterdayTipsTotal: number
  router: ReturnType<typeof useRouter>
}) {
  const items: InboxItem[] = []

  if (pendingEmployments > 0) {
    items.push({
      id: 'hires',
      label: `${pendingEmployments} ${pendingEmployments === 1 ? 'candidatura' : 'candidature'} in attesa`,
      icon: '👤',
      path: '/approvals?tab=candidatures',
      urgent: true,
    })
  }

  const otherPending = (pendingCount ?? 0) - pendingEmployments
  if (otherPending > 0) {
    items.push({
      id: 'approvals',
      label: `${otherPending} ${otherPending === 1 ? 'richiesta' : 'richieste'} da approvare`,
      icon: '✅',
      path: '/approvals',
    })
  }

  if (yesterdayTipsTotal === 0) {
    items.push({
      id: 'tips',
      label: 'Mance ieri non ancora inserite',
      icon: '💰',
      path: '/mance?tab=insert',
      urgent: true,
    })
  }

  return (
    <Card icon="📥" title="Da fare" accent="border-red-400">
      {items.length === 0 ? (
        <p className="text-sm text-green-600 font-medium mt-2">✓ Nessuna azione richiesta</p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition ${
                item.urgent
                  ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <span className="text-gray-400 text-xs">→</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Restaurant tips ────────────────────────────────────────────────────────

function RestaurantTipsCard({
  total,
  days,
  loading,
  error,
}: {
  total: number
  days: number
  loading: boolean
  error: boolean
}) {
  if (loading) return <Card icon="💰" title="Mance ristorante"><div className="h-10 animate-pulse bg-gray-100 rounded mt-2" /></Card>
  return (
    <Card icon="💰" title="Mance ristorante (mese)" accent="border-amber-400" error={error}>
      <p className="text-2xl font-bold text-amber-600 mt-2">{formatEuro(total)}</p>
      {days > 0 && (
        <p className="text-sm text-gray-500 mt-0.5">{days} {days === 1 ? 'giorno' : 'giorni'} con inserimenti</p>
      )}
    </Card>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // ── Role detection ────────────────────────────────────────────────────
  const userRole = (session?.user?.role as string) ?? ''
  const ccnlLevel = session?.user?.ccnlLevel ?? null
  const isManager = isManagerRole(userRole)
  const showDeptSection = isManager || ccnlMeetsMinimum(ccnlLevel, 'LIVELLO_3')
  const isPlatformAdmin = session?.user?.role === 'ADMIN' && session?.user?.level === 11

  // ── Batch data ────────────────────────────────────────────────────────
  const { widgets, pendingEmployments, isLoading: batchLoading } = useDashboardData()

  // ── Personal data ─────────────────────────────────────────────────────
  const { data: hubData, isLoading: hubLoading, error: hubError } =
    useSWR<MeHubData>(
      status === 'authenticated' ? '/api/me/hub' : null,
      cFetch,
      { revalidateOnFocus: true }
    )

  const { data: leavesData, isLoading: leavesLoading, error: leavesError } =
    useSWR<LeavesData>(
      status === 'authenticated' ? '/api/leaves?includeBalances=true' : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  const { data: tasksRaw, isLoading: tasksLoading, error: tasksError, mutate: mutateTasks } =
    useSWR<{ tasks: TaskRow[] }>(
      status === 'authenticated' ? '/api/tasks?scope=mine&status=DA_FARE' : null,
      cFetch,
      { revalidateOnFocus: true }
    )

  const { data: notifRaw, isLoading: notifLoading, error: notifError } =
    useSWR<{ notifications: NotifRow[] }>(
      status === 'authenticated' ? '/api/notifications' : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  // ── L2-3 dept tasks ───────────────────────────────────────────────────
  const { data: deptTasksRaw, isLoading: deptTasksLoading, error: deptTasksError } =
    useSWR<{ tasks: TaskRow[] }>(
      showDeptSection && status === 'authenticated' ? '/api/tasks?scope=department&due=today' : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  // ── Manager: restaurant tips ──────────────────────────────────────────
  const now = new Date()
  const { data: tipsSummaryRaw, isLoading: tipsLoading, error: tipsError } =
    useSWR<{ summary?: { monthTotal?: number; monthDaysWithTips?: number } }>(
      isManager && status === 'authenticated'
        ? `/api/tips/summary?year=${now.getFullYear()}&month=${now.getMonth()}`
        : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  // ── Manager: pending approvals count ─────────────────────────────────
  const { data: pendingCountRaw } =
    useSWR<{ total: number }>(
      isManager && status === 'authenticated' ? '/api/approvals/pending-count' : null,
      cFetch,
      { revalidateOnFocus: true }
    )

  // ── Task complete handler ─────────────────────────────────────────────
  const handleCompleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETATO' }),
      })
      await mutateTasks()
    } catch {
      /* ignore */
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-xl text-gray-500">Caricamento…</div>
      </div>
    )
  }
  if (!session) return null
  if (isPlatformAdmin) return <PlatformAdminDashboard />

  // ── Derived values ────────────────────────────────────────────────────
  const urgentTasks = (tasksRaw?.tasks ?? [])
    .filter((t) => t.status !== 'COMPLETATO')
    .sort((a, b) => {
      const aO = a.dueDate && new Date(a.dueDate) < new Date() ? 0 : a.dueDate ? 1 : 2
      const bO = b.dueDate && new Date(b.dueDate) < new Date() ? 0 : b.dueDate ? 1 : 2
      if (aO !== bO) return aO - bO
      const pr: Record<string, number> = { ALTA: 0, MEDIA: 1, BASSA: 2 }
      return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1)
    })

  const lastNotif = notifRaw?.notifications?.find((n) => !n.isRead) ?? notifRaw?.notifications?.[0]

  const restaurantTipsTotal = Number(tipsSummaryRaw?.summary?.monthTotal ?? 0)
  const restaurantTipsDays = Number(tipsSummaryRaw?.summary?.monthDaysWithTips ?? 0)

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greet(null, session.user?.name)}
          </h1>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{todayLabel()}</p>
        </div>

        {/* ── Row 1: Turno + Ferie + ROL ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ShiftCard hub={hubData} loading={hubLoading} />
          <LeaveCard leaves={leavesData} loading={leavesLoading} error={!!leavesError} />

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚡</span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accesso rapido</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => router.push('/mance')}
                className="w-full text-left px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition"
              >
                💰 Le mie mance
              </button>
              <button
                type="button"
                onClick={() => router.push('/shifts')}
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
              >
                📅 I miei turni
              </button>
              <button
                type="button"
                onClick={() => router.push('/tasks')}
                className="w-full text-left px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition"
              >
                📋 I miei task
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2: Mance personali + Task urgenti + Notifica ───────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PersonalTipsCard hub={hubData} loading={hubLoading} />
          <UrgentTasksCard
            tasks={urgentTasks}
            loading={tasksLoading}
            error={!!tasksError}
            onComplete={(id) => void handleCompleteTask(id)}
          />
          <NotificationCard notif={lastNotif} loading={notifLoading} error={!!notifError} />
        </div>

        {/* ── L2-3: Chi è in turno + Task reparto ────────────────────────── */}
        {showDeptSection && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Staff in turno oggi */}
            <Card icon="👥" title="Chi è in turno oggi" accent="border-indigo-400">
              {batchLoading ? (
                <div className="h-10 animate-pulse bg-gray-100 rounded mt-2" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-indigo-700 mt-2">{widgets.shiftsTodayCount}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {widgets.shiftsTodayCount === 1
                      ? 'persona in turno'
                      : 'persone in turno'}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/shifts')}
                    className="text-xs text-indigo-600 font-semibold mt-2 hover:underline"
                  >
                    Vedi calendario →
                  </button>
                </>
              )}
            </Card>

            <DeptTasksCard
              tasks={deptTasksRaw?.tasks}
              loading={deptTasksLoading}
              error={!!deptTasksError}
            />
          </div>
        )}

        {/* ── Manager: Inbox + Prenotazioni + Mance ristorante ───────────── */}
        {isManager && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InboxCard
              pendingCount={pendingCountRaw?.total}
              pendingEmployments={pendingEmployments.length}
              yesterdayTipsTotal={widgets.yesterdayTipsTotal}
              router={router}
            />

            {/* Prenotazioni oggi */}
            <Card icon="🍽️" title="Coperti oggi" accent="border-teal-400">
              {batchLoading ? (
                <div className="h-10 animate-pulse bg-gray-100 rounded mt-2" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-teal-700 mt-2">{widgets.bookingsTodayCount}</p>
                  <p className="text-sm text-gray-500 mt-0.5">prenotazioni oggi</p>
                  <button
                    type="button"
                    onClick={() => router.push('/operations')}
                    className="text-xs text-teal-600 font-semibold mt-2 hover:underline"
                  >
                    Gestisci →
                  </button>
                </>
              )}
            </Card>

            <RestaurantTipsCard
              total={restaurantTipsTotal}
              days={restaurantTipsDays}
              loading={tipsLoading}
              error={!!tipsError}
            />
          </div>
        )}

      </main>
    </div>
  )
}
