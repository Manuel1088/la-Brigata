'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useMemo } from 'react'
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

type TipEntry = {
  date: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
}

type PointsType = { [key: string]: number }
type RestDaysType = { [key: string]: [string, string?] }

// Utility sicura per sommare numeri
const safeSum = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Formattazione valuta sicura
const formatCurrency = (amount: number | undefined): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '€0,00'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

// Calcolo presenza dipendente
const calculateEmployeePresence = (
  employee: { name: string },
  dateStr: string,
  restDays: RestDaysType,
  weeklySchedule: Record<string, { time?: string }>,
  dayIndex: number
): boolean => {
  const key = `${employee.name}-${dayIndex}`
  const shift = weeklySchedule[key]
  
  if (shift && typeof shift.time === 'string') {
    return shift.time !== 'RIPOSO' && shift.time !== 'FERIE'
  }
  
  const dayIdx = new Date(dateStr).getDay()
  const dayMap = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const dayStr = dayMap[dayIdx]
  const r = restDays[employee.name] || []
  
  return !(r[0] === dayStr || r[1] === dayStr)
}

// Helpers per gestione date
const getWeekStart = (d: Date): Date => {
  const x = new Date(d)
  const day = x.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() + diff)
  return x
}

const toISODate = (d: Date): string => {
  const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

const getDayIndexFromDate = (dateStr: string, weekStart: Date): number => {
  const target = new Date(dateStr)
  const diffTime = target.getTime() - weekStart.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export default function TipsOverview() {
  const { data: session } = useSession()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expandedType, setExpandedType] = useState<'cash' | 'card' | 'foreign' | null>(null)

  // Tip entries per ristorante loggato
  const [tipEntries, setTipEntries] = useState<TipEntry[]>([])
  const [tipsKey, setTipsKey] = useState<string>('')
  const [waitingCtx, setWaitingCtx] = useState<boolean>(true)
  
  // Company data via shared hook
  const { data: companyData, error: companyError } = useCompanyData(session?.user?.id)

  // Setup chiave localStorage
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

  // Carica entries da localStorage
  useEffect(() => {
    if (!tipsKey) return
    try {
      const raw = localStorage.getItem(tipsKey)
      setTipEntries(raw ? JSON.parse(raw) : [])
    } catch {
      setTipEntries([])
    }
  }, [tipsKey])

  // Dipendenti via SWR
  const { employees: employeesData, isLoading } = useEmployeeContext()
  const employees = useMemo(() => 
    (employeesData || []).map((e: any) => ({
      name: e.name,
      role: e.role,
      department: (e as any).department || 'sala'
    })),
    [employeesData]
  )

  // Funzioni navigazione mese
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
  }

  // Filtra entries del mese corrente
  const monthEntries = useMemo(() => 
    tipEntries.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === currentMonth.getFullYear() && 
             d.getMonth() === currentMonth.getMonth()
    }),
    [tipEntries, currentMonth]
  )
  
  // Calcolo totali per tipologia con logica presenza
  const monthTotalsByType = useMemo(() => {
    // Carica configurazioni
    let employeePointsByName: PointsType = {}
    let restDaysByName: RestDaysType = {}
    
    try {
      const ep = localStorage.getItem('employeePoints')
      employeePointsByName = ep ? JSON.parse(ep) : {}
    } catch {}
    
    try {
      const rd = localStorage.getItem('employeeRestDays')
      restDaysByName = rd ? JSON.parse(rd) : {}
    } catch {}
    
    // Raggruppa entries per data
    const byDate = new Map<string, { cash: number; card: number; foreign: number }>()
    monthEntries.forEach(e => {
      const key = e.date
      const t = byDate.get(key) || { cash: 0, card: 0, foreign: 0 }
      const amt = safeSum(e.amount)
      
      if (e.type === 'cash') t.cash += amt
      else if (e.type === 'card') t.card += amt
      else if (e.type === 'foreign') t.foreign += amt
      
      byDate.set(key, t)
    })

    const result = { cash: 0, card: 0, foreign: 0 }
    
    byDate.forEach((totals, dateStr) => {
      // Determina presenze per questo giorno
      const weekStart = getWeekStart(new Date(dateStr))
      const weekKey = `shifts_${toISODate(weekStart)}`
      
      let weeklySchedule: Record<string, { time?: string }> = {}
      try {
        const raw = localStorage.getItem(weekKey)
        weeklySchedule = raw ? JSON.parse(raw) : {}
      } catch {}
      
      const dayIndex = getDayIndexFromDate(dateStr, weekStart)
      
      // Filtra dipendenti presenti
      const present = employees.filter(emp => 
        calculateEmployeePresence(emp, dateStr, restDaysByName, weeklySchedule, dayIndex)
      )
      
      const totalPoints = present.reduce(
        (sum, emp) => sum + safeSum(employeePointsByName[emp.name] || 0), 
        0
      )
      
      // Aggiungi solo se ci sono dipendenti presenti con punti
      if (totalPoints > 0) {
        result.cash += totals.cash
        result.card += totals.card
        result.foreign += totals.foreign
      }
    })
    
    return result
  }, [monthEntries, employees])

  if (waitingCtx || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl text-gray-700">Caricamento...</div>
        </div>
      </div>
    )
  }

  const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear() && 
                         now.getMonth() === currentMonth.getMonth()

  return (
    <div className="space-y-6">
      {/* Month Navigator */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-3 items-center">
          <div className="text-left text-sm text-gray-700">mese</div>
          <div className="text-center">
            <h2 className={`text-2xl font-semibold capitalize mb-1 ${
              isCurrentMonth ? 'text-red-600' : 'text-gray-900'
            }`}>
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
        
        {/* 3 riquadri totali per tipologia */}
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <div 
            className="p-3 rounded-lg border bg-green-50 text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setExpandedType(prev => prev === 'cash' ? null : 'cash')}
          >
            <div className="text-sm text-gray-600 mb-1">💵 Contanti</div>
            <div className="text-xl font-semibold text-green-700">
              {formatCurrency(monthTotalsByType.cash)}
            </div>
          </div>
          
          <div 
            className="p-3 rounded-lg border bg-blue-50 text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setExpandedType(prev => prev === 'card' ? null : 'card')}
          >
            <div className="text-sm text-gray-600 mb-1">💳 Carta</div>
            <div className="text-xl font-semibold text-blue-700">
              {formatCurrency(monthTotalsByType.card)}
            </div>
          </div>
          
          <div 
            className="p-3 rounded-lg border bg-purple-50 text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setExpandedType(prev => prev === 'foreign' ? null : 'foreign')}
          >
            <div className="text-sm text-gray-600 mb-1">🌍 Monete Estere</div>
            <div className="text-xl font-semibold text-purple-700">
              {formatCurrency(monthTotalsByType.foreign)}
            </div>
          </div>
        </div>

        {/* Dettaglio espanso per tipologia selezionata */}
        {expandedType && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">
                Dettaglio {
                  expandedType === 'cash' ? 'Contanti 💵' : 
                  expandedType === 'card' ? 'Carta 💳' : 
                  'Monete Estere 🌍'
                }
              </h3>
              <button
                onClick={() => setExpandedType(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {monthEntries
                .filter(e => e.type === expandedType)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded">
                    <span className="text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString('it-IT')}
                    </span>
                    <span className="font-medium">{formatCurrency(entry.amount)}</span>
                  </div>
                ))
              }
              
              {monthEntries.filter(e => e.type === expandedType).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Nessuna transazione trovata
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Riepilogo Mensile */}
      <MonthlyTipsSummary />
    </div>
  )
}