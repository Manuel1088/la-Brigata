'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, type ReactElement } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import ApprovalsSwaps from '@/components/approvals/Swaps'
import ApprovalsEmployees from '@/components/approvals/Employees'
import ApprovalsPayroll from '@/components/approvals/Payroll'
import ApprovalsLeaves from '@/components/approvals/Leaves'

export interface ApprovalItem {
  id: string
  type: 'leave' | 'swap' | 'employee' | 'payroll' | 'expense' | 'schedule'
  title: string
  description: string
  requester: string
  requesterRole: string
  department: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: string
  dueDate?: string
  metadata: ApprovalMetadata
  actions: string[]
}

interface ApprovalMetadata {
  department?: string
  shiftId?: string
  dateISO?: string
  requestId?: string
  employeeId?: string
  [key: string]: unknown
}

type LeaveRequestApi = {
  startDate: string
  endDate: string
  status: string
}

interface SwapRequestLocal {
  dateISO: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface EmployeeRequestLocal {
  status: 'pending' | 'approved' | 'rejected'
}

interface PayrollRequestLocal {
  status: 'pending' | 'approved' | 'rejected'
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('leaves')
  const [pendingCount, setPendingCount] = useState(0)
  const [counts, setCounts] = useState<{ swaps: number; employees: number; payroll: number; leaves: number }>({ swaps: 0, employees: 0, payroll: 0, leaves: 0 })
  const { 
    canManageEmployees, 
    canManagePayroll,
    canManageShifts 
  } = usePermissions()
  const { notifyCustom } = useNotifications()

  // Stabilizza i permessi come boolean per evitare effetti che si ripetono ad ogni render
  const canEmployees = canManageEmployees()
  const canPayroll = canManagePayroll()
  const canShifts = canManageShifts()

  // Data corrente per evidenziazioni
  const today = new Date()

  // Calendario mese corrente con indicatori di stato (pending/approved) per ferie/permessi e cambi turno
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [dayStatuses, setDayStatuses] = useState<Record<string, 'pending' | 'approved' | null>>({})

  const formatISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getMondayIndex = (d: Date) => {
    const jsDay = d.getDay() // 0=Sun..6=Sat
    return (jsDay + 6) % 7 // 0=Mon..6=Sun
  }

  useEffect(() => {
    const buildCalendar = async () => {
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const totalDays = daysInMonth(year, month)
        const statuses: Record<string, 'pending' | 'approved' | null> = {}

        const markPending = (iso: string) => {
          statuses[iso] = 'pending'
        }
        const markApproved = (iso: string) => {
          if (!statuses[iso]) statuses[iso] = 'approved'
        }

        for (let day = 1; day <= totalDays; day++) {
          const d = new Date(year, month, day)
          statuses[formatISO(d)] = null
        }

        if (canEmployees) {
          const res = await fetch(
            `/api/leaves?month=${month}&year=${year}&includeBalances=false`
          )
          if (res.ok) {
            const data = await res.json()
            const leaveRequests = (data.requests ?? []) as LeaveRequestApi[]
            for (const req of leaveRequests) {
              const start = new Date(req.startDate)
              const end = new Date(req.endDate)
              for (let day = 1; day <= totalDays; day++) {
                const d = new Date(year, month, day)
                if (
                  d >=
                    new Date(
                      start.getFullYear(),
                      start.getMonth(),
                      start.getDate()
                    ) &&
                  d <=
                    new Date(end.getFullYear(), end.getMonth(), end.getDate())
                ) {
                  const key = formatISO(d)
                  if (req.status === 'PENDING') markPending(key)
                  else if (req.status === 'APPROVED') markApproved(key)
                }
              }
            }
          }
        }

        if (canShifts) {
          const swapRequests = JSON.parse(
            localStorage.getItem('shift_swap_requests_v1') || '[]'
          ) as SwapRequestLocal[]
          for (const req of swapRequests) {
            const d = new Date(req.dateISO)
            if (d.getFullYear() === year && d.getMonth() === month) {
              const key = formatISO(d)
              if (req.status === 'PENDING') markPending(key)
              else if (req.status === 'APPROVED') markApproved(key)
            }
          }
        }

        setDayStatuses(statuses)
      } catch {
        setDayStatuses({})
      }
    }

    buildCalendar()
  }, [currentMonth, canEmployees, canShifts])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Gestisci query param ?tab=payroll
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['leaves', 'swaps', 'employees', 'payroll'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Calcola conteggio approvazioni in sospeso
  useEffect(() => {
    const calculatePendingCount = async () => {
      let count = 0
      let swaps = 0,
        employees = 0,
        payroll = 0,
        leaves = 0

      try {
        if (canShifts) {
          const swapRequests = JSON.parse(
            localStorage.getItem('shift_swap_requests_v1') || '[]'
          ) as SwapRequestLocal[]
          swaps = swapRequests.filter((req) => req.status === 'PENDING').length
          count += swaps
        }

        if (canEmployees) {
          const employeeRequests = JSON.parse(
            localStorage.getItem('employee_requests') || '[]'
          ) as EmployeeRequestLocal[]
          employees = employeeRequests.filter(
            (req) => req.status === 'pending'
          ).length
          count += employees
        }

        if (canPayroll) {
          const payrollRequests = JSON.parse(
            localStorage.getItem('payroll_requests') || '[]'
          ) as PayrollRequestLocal[]
          payroll = payrollRequests.filter(
            (req) => req.status === 'pending'
          ).length
          count += payroll
        }

        if (canEmployees) {
          const leavesRes = await fetch(
            '/api/leaves?status=PENDING&includeBalances=false'
          )
          if (leavesRes.ok) {
            const leavesData = await leavesRes.json()
            leaves =
              leavesData.meta?.count ?? leavesData.requests?.length ?? 0
            count += leaves
          }
        }
      } catch (error) {
        console.error('Errore nel calcolo approvazioni:', error)
      }

      setPendingCount(count)
      setCounts({ swaps, employees, payroll, leaves })
    }

    calculatePendingCount()

    const handleUpdate = () => {
      calculatePendingCount()
    }
    window.addEventListener('approvals_updated', handleUpdate)
    window.addEventListener('shift_swaps_updated', handleUpdate)
    window.addEventListener('leave_system_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('approvals_updated', handleUpdate)
      window.removeEventListener('shift_swaps_updated', handleUpdate)
      window.removeEventListener('leave_system_updated', handleUpdate)
    }
  }, [canEmployees, canPayroll, canShifts])

  const tabs = [
    { 
      id: 'leaves', 
      label: 'Ferie/Permessi', 
      icon: '🏖️', 
      component: ApprovalsLeaves,
      permission: canEmployees,
      badge: 0
    },
    { 
      id: 'swaps', 
      label: 'Cambi Turno', 
      icon: '🔄', 
      component: ApprovalsSwaps,
      permission: canShifts,
      badge: 0 // Sarà calcolato dinamicamente
    },
    { 
      id: 'employees', 
      label: 'Dipendenti', 
      icon: '👥', 
      component: ApprovalsEmployees,
      permission: canEmployees,
      badge: 0 // Sarà calcolato dinamicamente
    },
    { 
      id: 'payroll', 
      label: 'Payroll', 
      icon: '💰', 
      component: ApprovalsPayroll,
      permission: canPayroll,
      badge: 0 // Sarà calcolato dinamicamente
    }
  ]

  const visibleTabs = tabs.filter(tab => tab.permission)

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  const handleBulkAction = async (action: string, _itemIds: string[]) => {
    try {
      // Implementa azioni bulk
      switch (action) {
        case 'approve_all':
          notifyCustom('SUCCESS', 'SYSTEM', 'Approvazioni', 'Tutte le richieste sono state approvate')
          break
        case 'reject_all':
          notifyCustom('WARNING', 'SYSTEM', 'Approvazioni', 'Tutte le richieste sono state rifiutate')
          break
        default:
          notifyCustom('INFO', 'SYSTEM', 'Azione completata', `Azione ${action} completata`)
      }
      
      // Aggiorna conteggio
      window.dispatchEvent(new CustomEvent('approvals_updated'))
    } catch {
      notifyCustom('ERROR', 'SYSTEM', 'Approvazioni', 'Errore nell\'esecuzione dell\'azione')
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-700">Caricamento...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">✅ Approvazioni</h1>
                <p className="text-gray-600 mt-2">Gestisci tutte le richieste in sospeso</p>
              </div>
            </div>
            
            {pendingCount > 0 && (
              <div className="flex items-center gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="text-lg font-semibold text-red-800">{pendingCount}</div>
                      <div className="text-sm text-red-700">Richieste in sospeso</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('approve_all', [])}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    ✅ Approva Tutto
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject_all', [])}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    ❌ Rifiuta Tutto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Calendario mese corrente */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="px-2 py-1 text-gray-600 hover:text-gray-900"
              >
                ←
              </button>
              <div className={`font-semibold ${currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear() ? 'text-red-700' : 'text-gray-900'}`}>
                {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="px-2 py-1 text-gray-600 hover:text-gray-900"
              >
                →
              </button>
            </div>

            {/* Intestazione giorni */}
            <div className="grid grid-cols-7 text-xs text-gray-500 mb-2 px-1">
              {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>

            {/* Griglia giorni */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const year = currentMonth.getFullYear()
                const month = currentMonth.getMonth()
                const total = new Date(year, month + 1, 0).getDate()
                const firstDay = new Date(year, month, 1)
                const leading = getMondayIndex(firstDay) // numero di celle vuote prima del 1°
                const cells: ReactElement[] = []
                for (let i = 0; i < leading; i++) {
                  cells.push(<div key={`lead_${i}`} className="h-12" />)
                }
                for (let day = 1; day <= total; day++) {
                  const d = new Date(year, month, day)
                  const key = formatISO(d)
                  const status = dayStatuses[key]
                  const dotClass = status === 'approved' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-transparent'
                  const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
                  cells.push(
                    <div key={key} className="h-12 flex flex-col items-center justify-center">
                      <div className={`text-sm ${isToday ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>{day}</div>
                      <div className={`w-2 h-2 rounded-full mt-1 ${dotClass}`}></div>
                    </div>
                  )
                }
                return cells
              })()}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Approvato</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span> In attesa</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {visibleTabs.map((tab) => {
                const badge = tab.id === 'swaps' ? counts.swaps : tab.id === 'employees' ? counts.employees : tab.id === 'payroll' ? counts.payroll : tab.id === 'leaves' ? counts.leaves : 0
                return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center relative
                  `}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  {tab.label}
                  {badge > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                      {badge}
                    </span>
                  )}
                </button>
              )})}
            </nav>
          </div>
          
          <div className="p-6">
            {visibleTabs.map((tab) => (
              <div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
                <tab.component 
                  onUpdate={() => window.dispatchEvent(new CustomEvent('approvals_updated'))}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
