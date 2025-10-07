'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import MonthlyTipsSummary from '@/components/MonthlyTipsSummary'

interface TipDistribution {
  employeeName: string
  amount: number
  role: string
  department: string
  hoursWorked: number
}

interface DailyTip {
  id: string
  date: string
  totalTips: number
  distributions: TipDistribution[]
}

export default function TipsOverview() {
  const { data: session } = useSession()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null)
  const [expandedType, setExpandedType] = useState<'cash' | 'card' | 'foreign' | null>(null)

  // Tip entries per ristorante loggato
  const [tipEntries, setTipEntries] = useState<any[]>([])
  const [tipsKey, setTipsKey] = useState<string>('')
  const [waitingCtx, setWaitingCtx] = useState<boolean>(true)
  
  // Company data via shared hook
  const { data: companyData, error: companyError } = useCompanyData(session?.user?.id)

  // Primo useEffect ottimizzato - usa SWR data
  useEffect(() => {
    if (!session) return
    if (companyError) {
      setWaitingCtx(false)
      return
    }
    if (!companyData) return

    try {
      const rid = (session?.user as any)?.restaurantId as string | undefined
      if (rid) {
        setTipsKey(`tipEntries_v1::${rid}`)
      } else {
        const firstRest = companyData?.company?.restaurants?.[0]?.id as string | undefined
        if (firstRest) setTipsKey(`tipEntries_v1::${firstRest}`)
      }
    } finally {
      setWaitingCtx(false)
    }
  }, [session, companyData, companyError])

  useEffect(() => {
    if (!tipsKey) return
    try {
      const raw = localStorage.getItem(tipsKey)
      setTipEntries(raw ? JSON.parse(raw) : [])
    } catch { setTipEntries([]) }
  }, [tipsKey])

  // Dipendenti via SWR per companyId
  const { employees: employeesData, isLoading } = useEmployeeContext()
  const employees = (employeesData || []).map((e: any) => ({
    name: e.name,
    role: e.role,
    department: (e as any).department || 'sala'
  }))

  // Demo data mance mensili
  const [monthlyTips, setMonthlyTips] = useState<{[date: string]: DailyTip}>({
    '2025-01-15': {
      id: '1', date: '2025-01-15', totalTips: 297.80,
      distributions: [
        { employeeName: 'Giuseppe Chef', amount: 59.56, role: 'CHEF', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Maria Cameriera', amount: 44.67, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Luca Barista', amount: 44.67, role: 'DIPENDENTE_BAR', department: 'bar', hoursWorked: 8 },
        { employeeName: 'Anna Sous Chef', amount: 52.61, role: 'CAPO_PARTITA', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Marco Cameriere', amount: 35.73, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Sofia Cassiera', amount: 60.56, role: 'CASSIERE', department: 'sala', hoursWorked: 8 }
      ]
    },
    '2025-01-16': {
      id: '2', date: '2025-01-16', totalTips: 234.50,
      distributions: [
        { employeeName: 'Giuseppe Chef', amount: 46.90, role: 'CHEF', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Maria Cameriera', amount: 35.18, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Luca Barista', amount: 35.18, role: 'DIPENDENTE_BAR', department: 'bar', hoursWorked: 8 },
        { employeeName: 'Anna Sous Chef', amount: 41.41, role: 'CAPO_PARTITA', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Marco Cameriere', amount: 28.14, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Sofia Cassiera', amount: 47.69, role: 'CASSIERE', department: 'sala', hoursWorked: 8 }
      ]
    },
    '2025-01-17': {
      id: '3', date: '2025-01-17', totalTips: 189.20,
      distributions: [
        { employeeName: 'Giuseppe Chef', amount: 37.84, role: 'CHEF', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Maria Cameriera', amount: 28.38, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Luca Barista', amount: 28.38, role: 'DIPENDENTE_BAR', department: 'bar', hoursWorked: 8 },
        { employeeName: 'Anna Sous Chef', amount: 33.41, role: 'CAPO_PARTITA', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Marco Cameriere', amount: 22.69, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Sofia Cassiera', amount: 38.50, role: 'CASSIERE', department: 'sala', hoursWorked: 8 }
      ]
    }
  })

  // Funzioni per navigazione mese
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth)
    prevMonth.setMonth(currentMonth.getMonth() - 1)
    setCurrentMonth(prevMonth)
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(currentMonth.getMonth() + 1)
    setCurrentMonth(nextMonth)
  }

  // Riepilogo mensile per tipologia pagamento (basato su presenze e punti):
  const monthEntries = tipEntries.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth()
  })
  
  const monthTotalsByType = (() => {
    // Carica configurazioni punti e riposi
    let employeePointsByName: Record<string, number> = {}
    let restDaysByName: Record<string, [string, string?]> = {}
    try {
      const ep = localStorage.getItem('employeePoints')
      employeePointsByName = ep ? JSON.parse(ep) : {}
    } catch {}
    try {
      const rd = localStorage.getItem('employeeRestDays')
      restDaysByName = rd ? JSON.parse(rd) : {}
    } catch {}
    
    const empList = employees
    // Group entries by date
    const byDate = new Map<string, { cash: number; card: number; foreign: number }>()
    monthEntries.forEach(e => {
      const key = e.date
      const t = byDate.get(key) || { cash: 0, card: 0, foreign: 0 }
      const amt = Number(e.amount) || 0
      if (e.type === 'cash') t.cash += amt
      else if (e.type === 'card') t.card += amt
      else if (e.type === 'foreign') t.foreign += amt
      byDate.set(key, t)
    })

    // Helpers for week and presence from shifts
    const getWeekStart = (d: Date) => {
      const x = new Date(d)
      const day = x.getDay()
      const diff = (day === 0 ? -6 : 1) - day
      x.setHours(0, 0, 0, 0)
      x.setDate(x.getDate() + diff)
      return x
    }
    const toISODate = (d: Date) => {
      const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
    }
    const getDayIndexFromDate = (dateStr: string, weekStart: Date) => {
      const target = new Date(dateStr)
      const diffTime = target.getTime() - weekStart.getTime()
      return Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }

    const result = { cash: 0, card: 0, foreign: 0 }
    byDate.forEach((totals, dateStr) => {
      // Determine presence
      const weekStart = getWeekStart(new Date(dateStr))
      const weekKey = `shifts_${toISODate(weekStart)}`
      let weeklySchedule: Record<string, { time?: string }> = {}
      try {
        const raw = localStorage.getItem(weekKey)
        weeklySchedule = raw ? JSON.parse(raw) : {}
      } catch { weeklySchedule = {} }
      const dayIndex = getDayIndexFromDate(dateStr, weekStart)
      const dayIdx = new Date(dateStr).getDay()
      const dayMap = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
      const dayStr = dayMap[dayIdx]
      // Present employees
      const present = empList.filter(emp => {
        const key = `${emp.name}-${dayIndex}`
        const shift = weeklySchedule[key]
        if (shift && typeof shift.time === 'string') {
          return shift.time !== 'RIPOSO' && shift.time !== 'FERIE'
        }
        const r = restDaysByName[emp.name] || []
        return !(r[0] === dayStr || r[1] === dayStr)
      })
      const totalPoints = present.reduce((sum, emp) => sum + (employeePointsByName[emp.name] || 0), 0)
      if (totalPoints <= 0) {
        return
      }
      result.cash += totals.cash
      result.card += totals.card
      result.foreign += totals.foreign
    })
    return result
  })()

  // Vista personale dipendente: calcolo dai dati mensili mock
  const myName = session?.user?.name || ''
  const dates = Object.keys(monthlyTips)
  const todayStr = new Date().toISOString().split('T')[0]
  const myDailyToday = (() => {
    const d = monthlyTips[todayStr]
    if (!d) return 0
    const rec = d.distributions.find(x => x.employeeName === myName)
    return rec?.amount || 0
  })()
  const myLast7 = dates
    .filter(ds => {
      const diff = (new Date(todayStr).getTime() - new Date(ds).getTime()) / (1000*60*60*24)
      return diff >= 0 && diff < 7
    })
    .reduce((sum, ds) => {
      const d = monthlyTips[ds]
      const rec = d.distributions.find(x => x.employeeName === myName)
      return sum + (rec?.amount || 0)
    }, 0)
  const myLast30 = dates
    .filter(ds => {
      const diff = (new Date(todayStr).getTime() - new Date(ds).getTime()) / (1000*60*60*24)
      return diff >= 0 && diff < 30
    })
    .reduce((sum, ds) => {
      const d = monthlyTips[ds]
      const rec = d.distributions.find(x => x.employeeName === myName)
      return sum + (rec?.amount || 0)
    }, 0)

  if (waitingCtx) return <div className="text-center py-8">Caricamento...</div>

  const monthDays = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()

  return (
    <div className="space-y-6">
      {/* Month Navigator */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-3 items-center">
          <div className="text-left text-sm text-gray-700">mese</div>
          <div className="text-center">
            <h2 className={`text-2xl font-semibold capitalize mb-1 ${isCurrentMonth ? 'text-red-600' : 'text-gray-900'}`}>
              {monthName}
            </h2>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              aria-label="Mese precedente"
              title="Mese precedente"
            >
              <span className="text-xl">←</span>
            </button>
            <button
              onClick={goToNextMonth}
              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              aria-label="Mese successivo"
              title="Mese successivo"
            >
              <span className="text-xl">→</span>
            </button>
          </div>
        </div>
        {/* 3 riquadri sotto al mese */}
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg border bg-green-50 text-center cursor-pointer" onClick={() => setExpandedType(prev => prev === 'cash' ? null : 'cash')}>
            <div className="text-sm text-gray-600 mb-1">💵 Contanti</div>
            <div className="text-xl font-semibold text-green-700">€{monthTotalsByType.cash.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg border bg-blue-50 text-center cursor-pointer" onClick={() => setExpandedType(prev => prev === 'card' ? null : 'card')}>
            <div className="text-sm text-gray-600 mb-1">💳 Carta</div>
            <div className="text-xl font-semibold text-blue-700">€{monthTotalsByType.card.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg border bg-purple-50 text-center cursor-pointer" onClick={() => setExpandedType(prev => prev === 'foreign' ? null : 'foreign')}>
            <div className="text-sm text-gray-600 mb-1">🌍 Monete Estere</div>
            <div className="text-xl font-semibold text-purple-700">€{monthTotalsByType.foreign.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Riepilogo Mensile */}
      <MonthlyTipsSummary />
    </div>
  )
}
