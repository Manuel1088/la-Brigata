'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import { formatEuro } from '@/lib/utils'
import { shiftHubLabel, toDateOnlyIso } from '@/lib/shifts'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { isManagerRole } from '@/lib/roles'
import { usePermissions } from '@/hooks/usePermissions'
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
type MyTipsData = {
  monthLabel?: string
  summary?: {
    total: number
    cash: number
    card: number
    foreign: number
    daysWithTips: number
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
  assignedToRole?: string | null
  assignedTo?: {
    id: string
    firstName?: string | null
    lastName?: string | null
    name?: string | null
    role?: string | null
  } | null
}
type OnboardingStatus = {
  isOwnerOrManager: boolean
  restaurantId: string | null
  hasLocations: boolean
  hasEmployees: boolean
  needsOnboarding: boolean
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

function assigneeLabel(t: TaskRow): string {
  const a = t.assignedTo
  if (a) {
    const full = [a.firstName, a.lastName].filter(Boolean).join(' ').trim()
    if (full) return full
    if (a.name?.trim()) return a.name
  }
  if (t.assignedToRole?.trim()) return t.assignedToRole
  return 'Non assegnato'
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

// ── Mance widget unificato (Le mie mance + Mance ristorante) ────────────────

function TipsWidget({
  myTips,
  myLoading,
  myError,
  showRestaurant,
  restaurantTotal,
  restaurantDays,
  restaurantLoading,
  restaurantError,
}: {
  myTips: MyTipsData | undefined
  myLoading: boolean
  myError: boolean
  showRestaurant: boolean
  restaurantTotal: number
  restaurantDays: number
  restaurantLoading: boolean
  restaurantError: boolean
}) {
  const s = myTips?.summary

  return (
    <Card icon="💰" title="Mance" accent="border-amber-400">
      {/* Le mie mance */}
      <div className="mt-1">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Le mie mance (mese)
        </p>
        {myLoading ? (
          <div className="h-12 animate-pulse bg-gray-100 rounded" />
        ) : myError && !myTips ? (
          <p className="text-sm text-gray-400 italic">Dati non disponibili</p>
        ) : !s || s.total === 0 ? (
          <p className="text-sm text-gray-400 italic">Nessuna mancia questo mese</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-amber-600">{formatEuro(s.total)}</p>
            <div className="flex gap-4 mt-1 text-sm text-gray-500">
              <span>💵 {formatEuro(s.cash)}</span>
              <span>💳 {formatEuro(s.card)}</span>
            </div>
          </>
        )}
      </div>

      {/* Mance ristorante — solo per manager / chi gestisce le mance */}
      {showRestaurant && (
        <>
          <hr className="my-4 border-gray-100" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Mance ristorante (mese)
            </p>
            {restaurantLoading ? (
              <div className="h-12 animate-pulse bg-gray-100 rounded" />
            ) : restaurantError ? (
              <p className="text-sm text-gray-400 italic">Dati non disponibili</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-amber-600">{formatEuro(restaurantTotal)}</p>
                {restaurantDays > 0 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {restaurantDays} {restaurantDays === 1 ? 'giorno' : 'giorni'} con inserimenti
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Card>
  )
}

// ── Task widget unificato (I miei task + Task reparto) ──────────────────────

function TaskWidget({
  myTasks,
  myLoading,
  myError,
  onComplete,
  showDept,
  deptTasks,
  deptLoading,
  deptError,
}: {
  myTasks: TaskRow[] | undefined
  myLoading: boolean
  myError: boolean
  onComplete: (id: string) => void
  showDept: boolean
  deptTasks: TaskRow[] | undefined
  deptLoading: boolean
  deptError: boolean
}) {
  const top3 = (myTasks ?? []).filter((t) => t.status !== 'COMPLETATO').slice(0, 3)
  const deptList = (deptTasks ?? []).filter((t) => t.status !== 'COMPLETATO')

  return (
    <Card icon="📋" title="Task" accent="border-orange-400">
      {/* I miei task */}
      <div className="mt-1">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          I miei task
        </p>
        {myLoading ? (
          <div className="h-12 animate-pulse bg-gray-100 rounded" />
        ) : myError && !myTasks ? (
          <p className="text-sm text-gray-400 italic">Dati non disponibili</p>
        ) : top3.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nessun task in attesa</p>
        ) : (
          <div className="space-y-2">
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
      </div>

      {/* Task reparto — solo per chi gestisce il reparto */}
      {showDept && (
        <>
          <hr className="my-4 border-gray-100" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Task reparto — in scadenza oggi
            </p>
            {deptLoading ? (
              <div className="h-12 animate-pulse bg-gray-100 rounded" />
            ) : deptError && !deptTasks ? (
              <p className="text-sm text-gray-400 italic">Dati non disponibili</p>
            ) : deptList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun task in scadenza oggi</p>
            ) : (
              <div className="space-y-2">
                {deptList.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full ${priorityDot(t.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400 truncate">{assigneeLabel(t)}</p>
                    </div>
                    <span className="text-xs flex-shrink-0 text-amber-500 font-medium">Oggi</span>
                  </div>
                ))}
                {deptList.length > 4 && (
                  <p className="text-xs text-gray-400">+{deptList.length - 4} altri</p>
                )}
              </div>
            )}
          </div>
        </>
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

// ── Coperti (confronto anno su anno) ────────────────────────────────────────

type CoversBreakdown = {
  date: string
  bookings: number
  events: number
  walkins: number
  total: number
}
type CoversData = {
  current: CoversBreakdown
  previous: CoversBreakdown & { hasData: boolean }
  changePercent: number | null
}

function fmtCoversDay(iso: string, withYear: boolean): string {
  const d = new Date(`${iso}T12:00:00`)
  const s = d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function CoversWidget({
  data,
  loading,
  error,
}: {
  data: CoversData | undefined
  loading: boolean
  error: boolean
}) {
  if (loading) {
    return (
      <Card icon="🍽️" title="Coperti">
        <div className="h-28 animate-pulse bg-gray-100 rounded mt-2" />
      </Card>
    )
  }
  if (error || !data) {
    return <Card icon="🍽️" title="Coperti" error />
  }

  const { current, previous, changePercent } = data
  const hasPrev = previous.hasData
  const num = (n: number) => (n === 0 ? '—' : String(n))
  const prevNum = (n: number) => (!hasPrev ? '—' : n === 0 ? '—' : String(n))

  const leftLabel = fmtCoversDay(current.date, false)
  const rightLabel = fmtCoversDay(previous.date, true)

  return (
    <Card icon="🍽️" title="Coperti" accent="border-teal-400">
      <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm">
        {/* Header */}
        <div />
        <div className="text-right font-semibold text-gray-700 w-16">OGGI</div>
        <div className="text-right font-semibold text-gray-500 w-20 pl-4 border-l border-gray-200">
          {rightLabel.replace(/ \d{4}$/, '')}
        </div>

        {/* Sub-header date */}
        <div className="text-xs text-gray-400">{leftLabel}</div>
        <div className="text-right text-xs text-gray-400 w-16">&nbsp;</div>
        <div className="text-right text-xs text-gray-400 w-20 pl-4 border-l border-gray-200">
          {hasPrev ? previous.date.slice(0, 4) : ''}
        </div>

        {/* Prenotazioni */}
        <div className="text-gray-600">Prenotazioni</div>
        <div className="text-right w-16">{num(current.bookings)}</div>
        <div className="text-right w-20 pl-4 border-l border-gray-200">{prevNum(previous.bookings)}</div>

        {/* Pax eventi */}
        <div className="text-gray-600">Pax eventi</div>
        <div className="text-right w-16">{num(current.events)}</div>
        <div className="text-right w-20 pl-4 border-l border-gray-200">{prevNum(previous.events)}</div>

        {/* Passanti */}
        <div className="text-gray-600">Passanti</div>
        <div className="text-right w-16">{num(current.walkins)}</div>
        <div className="text-right w-20 pl-4 border-l border-gray-200">{prevNum(previous.walkins)}</div>

        {/* Totale */}
        <div className="font-bold text-gray-900 border-t border-gray-200 pt-2">TOTALE</div>
        <div className="text-right font-bold text-gray-900 w-16 border-t border-gray-200 pt-2">
          {current.total}
        </div>
        <div className="text-right font-bold text-gray-900 w-20 pl-4 border-t border-l border-gray-200 pt-2">
          {hasPrev ? previous.total : '—'}
        </div>

        {/* Variazione % */}
        {changePercent !== null && (
          <>
            <div />
            <div className="w-16" />
            <div className="text-right w-20 pl-4 border-l border-gray-200">
              <span
                className={`text-xs font-semibold ${
                  changePercent >= 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {changePercent >= 0 ? '📈' : '📉'} {changePercent > 0 ? '+' : ''}
                {changePercent}%
              </span>
            </div>
          </>
        )}
      </div>
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
  const { can, canManageTasks, canManageTips } = usePermissions()
  const userRole = (session?.user?.role as string) ?? ''
  const ccnlLevel = session?.user?.ccnlLevel ?? null
  const isManager = isManagerRole(userRole)
  const showDeptSection = isManager || ccnlMeetsMinimum(ccnlLevel, 'LIVELLO_3')
  // Task reparto: L2+ (capo turno/responsabile) oppure chi può gestire i task
  const canViewDeptTasks =
    isManager || canManageTasks() || ccnlMeetsMinimum(ccnlLevel, 'LIVELLO_2')
  // Mance ristorante: manager oppure chi può gestire le mance
  const showRestaurantTips = isManager || canManageTips()
  // Coperti: manager oppure chi può vedere le prenotazioni
  const showCovers = isManager || can('bookings_view')
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

  // ── Task reparto (L2+ / canManageTasks) ───────────────────────────────
  const { data: deptTasksRaw, isLoading: deptTasksLoading, error: deptTasksError } =
    useSWR<{ tasks: TaskRow[] }>(
      canViewDeptTasks && status === 'authenticated' ? '/api/tasks?scope=department&due=today' : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  // ── Mance personali (contanti / carta / totale) ───────────────────────
  const now = new Date()
  const { data: myTipsRaw, isLoading: myTipsLoading, error: myTipsError } =
    useSWR<MyTipsData>(
      status === 'authenticated'
        ? `/api/tips/my?year=${now.getFullYear()}&month=${now.getMonth()}`
        : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  // ── Mance ristorante (manager / canManageTips) ────────────────────────
  const { data: tipsSummaryRaw, isLoading: tipsLoading, error: tipsError } =
    useSWR<{ summary?: { monthTotal?: number; monthDaysWithTips?: number } }>(
      showRestaurantTips && status === 'authenticated'
        ? `/api/tips/summary?year=${now.getFullYear()}&month=${now.getMonth()}`
        : null,
      cFetch,
      { revalidateOnFocus: false }
    )

  // ── Coperti (confronto anno su anno) ──────────────────────────────────
  const { data: coversRaw, isLoading: coversLoading, error: coversError } =
    useSWR<CoversData>(
      showCovers && status === 'authenticated'
        ? `/api/dashboard/covers?date=${toDateOnlyIso(now)}`
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

  // ── Onboarding: redirect titolare senza Sale + banner "nessun dipendente" ─
  const { data: onboarding } =
    useSWR<OnboardingStatus>(
      status === 'authenticated' && !isPlatformAdmin ? '/api/onboarding/status' : null,
      cFetch,
      { revalidateOnFocus: true }
    )

  useEffect(() => {
    if (onboarding?.needsOnboarding) router.replace('/onboarding')
  }, [onboarding, router])

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
  // Titolare/manager senza Sale: wizard bloccante (redirect gestito nell'effect)
  if (onboarding?.needsOnboarding) return null

  const showNoEmployeesBanner =
    !!onboarding?.isOwnerOrManager && onboarding.hasLocations && !onboarding.hasEmployees

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

        {/* Banner: nessun dipendente ancora aggiunto (solo titolare/manager) */}
        {showNoEmployeesBanner && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              ⚠️ Non hai ancora aggiunto dipendenti.
            </p>
            <button
              type="button"
              onClick={() => router.push('/onboarding?step=2')}
              className="shrink-0 text-sm font-semibold text-amber-800 underline hover:text-amber-900"
            >
              Aggiungi ora →
            </button>
          </div>
        )}

        {/* ── Row 1: Turno + Ferie/ROL ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ShiftCard hub={hubData} loading={hubLoading} />
          <LeaveCard leaves={leavesData} loading={leavesLoading} error={!!leavesError} />
        </div>

        {/* ── Row 2: Mance (unificato) + Task (unificato) ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <TipsWidget
            myTips={myTipsRaw}
            myLoading={myTipsLoading}
            myError={!!myTipsError}
            showRestaurant={showRestaurantTips}
            restaurantTotal={restaurantTipsTotal}
            restaurantDays={restaurantTipsDays}
            restaurantLoading={tipsLoading}
            restaurantError={!!tipsError}
          />
          <TaskWidget
            myTasks={urgentTasks}
            myLoading={tasksLoading}
            myError={!!tasksError}
            onComplete={(id) => void handleCompleteTask(id)}
            showDept={canViewDeptTasks}
            deptTasks={deptTasksRaw?.tasks}
            deptLoading={deptTasksLoading}
            deptError={!!deptTasksError}
          />
        </div>

        {/* ── L2-3: Chi è in turno oggi nel reparto ──────────────────────── */}
        {showDeptSection && (
          <div className="grid grid-cols-1">
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
          </div>
        )}

        {/* ── Manager + bookings_view: Inbox + Coperti (YoY) ─────────────── */}
        {(isManager || showCovers) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {isManager && (
              <InboxCard
                pendingCount={pendingCountRaw?.total}
                pendingEmployments={pendingEmployments.length}
                yesterdayTipsTotal={widgets.yesterdayTipsTotal}
                router={router}
              />
            )}

            {showCovers && (
              <CoversWidget
                data={coversRaw}
                loading={coversLoading}
                error={!!coversError}
              />
            )}
          </div>
        )}

      </main>
    </div>
  )
}
