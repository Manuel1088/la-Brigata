// src/app/tips/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import MonthlyTipsSummary from '@/components/MonthlyTipsSummary'
import { getEmployeesByCompany } from '@/lib/employees'

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

export default function TipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null)
  const [isAddTipOpen, setIsAddTipOpen] = useState(false)
  const [newTipDate, setNewTipDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [newAmountCash, setNewAmountCash] = useState('')
  const [newAmountCard, setNewAmountCard] = useState('')
  const [newAmountForeign, setNewAmountForeign] = useState('')
  const [newSelectedLocation, setNewSelectedLocation] = useState('')
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [expandedType, setExpandedType] = useState<'cash' | 'card' | 'foreign' | null>(null)

  // Tip entries (inserimenti) da localStorage per riepilogo real-time
  const [tipEntries, setTipEntries] = useState<any[]>([])
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('tipEntries')
        setTipEntries(raw ? JSON.parse(raw) : [])
      } catch {
        setTipEntries([])
      }
    }
  }, [])

  const clearTipsData = () => {
    try {
      localStorage.removeItem('tipEntries')
    } catch {}
    setTipEntries([])
    setMonthlyTips({})
  }

  // Carica sale esistenti per l'azienda corrente (booking_areas_v1::<fiscalCode>)
  useEffect(() => {
    let cancelled = false
    const resolveAndLoad = async () => {
      try {
        const uid = (session?.user as any)?.id
        if (!uid) return
        const res = await fetch(`/api/users/${uid}/company`)
        const data = await res.json()
        const fiscal: string | undefined = data?.company?.fiscalCode
        if (!fiscal) return
        const key = `booking_areas_v1::${fiscal}`
        const load = () => {
          try {
            const raw = localStorage.getItem(key)
            const areas = raw ? JSON.parse(raw) : []
            const locs = (areas || []).map((a: any) => ({ id: a.id, name: a.name }))
            if (!cancelled) {
              setLocations(locs)
              if (!newSelectedLocation && locs.length > 0) setNewSelectedLocation(locs[0].id)
            }
          } catch {
            if (!cancelled) setLocations([])
          }
        }
        load()
        const onUpdate = () => load()
        try { window.addEventListener('booking_areas_updated', onUpdate as any) } catch {}
        return () => { try { window.removeEventListener('booking_areas_updated', onUpdate as any) } catch {} }
      } catch {}
    }
    resolveAndLoad()
    return () => { cancelled = true }
  }, [newSelectedLocation, session])

  const shiftNewTipDate = (delta: number) => {
    try {
      const d = new Date(newTipDate)
      d.setDate(d.getDate() + delta)
      setNewTipDate(d.toISOString().split('T')[0])
    } catch {}
  }

  const handleInlineSaveTip = () => {
    const numCash = parseFloat(newAmountCash || '0') || 0
    const numCard = parseFloat(newAmountCard || '0') || 0
    const numForeign = parseFloat(newAmountForeign || '0') || 0
    const hasAny = numCash > 0 || numCard > 0 || numForeign > 0
    if (!hasAny || !newSelectedLocation) return
    try {
      const raw = localStorage.getItem('tipEntries')
      const arr: any[] = raw ? JSON.parse(raw) : []
      const locName = locations.find(l => l.id === newSelectedLocation)?.name || newSelectedLocation
      const nowIso = new Date().toISOString()
      if (numCash > 0) arr.push({ id: crypto.randomUUID(), date: newTipDate, location: locName, type: 'cash', amount: numCash, createdAt: nowIso })
      if (numCard > 0) arr.push({ id: crypto.randomUUID(), date: newTipDate, location: locName, type: 'card', amount: numCard, createdAt: nowIso })
      if (numForeign > 0) arr.push({ id: crypto.randomUUID(), date: newTipDate, location: locName, type: 'foreign', amount: numForeign, createdAt: nowIso })
      localStorage.setItem('tipEntries', JSON.stringify(arr))
      setTipEntries(arr)
      try { window.dispatchEvent(new CustomEvent('tip_entries_updated')) } catch {}
      // reset e chiudi
      setNewAmountCash('')
      setNewAmountCard('')
      setNewAmountForeign('')
      setIsAddTipOpen(false)
    } catch {}
  }

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Dipendenti (caricati da API per companyId)
  const [employees, setEmployees] = useState<Array<{ name: string; role: string; department: string }>>([])
  useEffect(() => {
    const loadEmployees = async () => {
      const cid = (session?.user as any)?.companyId as string | undefined
      if (cid) {
        try {
          const apiList = await getEmployeesByCompany(cid, { active: true })
          let list = apiList.map((e: any) => ({ name: e.name, role: e.role, department: (e as any).department || 'sala' }))
          try {
            const raw = localStorage.getItem('working_owner_mode_v1')
            const map = raw ? JSON.parse(raw) as Record<string, boolean> : {}
            const isOwner = ((session?.user as any)?.role || '').toUpperCase() === 'PROPRIETARIO'
            const workingOwner = !!map[(session?.user as any)?.id || '']
            if (isOwner && !workingOwner) {
              list = list.filter(e => (e.role || '').toUpperCase() !== 'PROPRIETARIO')
            }
          } catch {}
          setEmployees(list)
        } catch {
          // fallback demo solo in caso di errore
          setEmployees([
            { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
            { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
            { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
            { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
            { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
            { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
          ])
        }
      }
    }
    if (session) loadEmployees()
  }, [session])

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

  const getMonthlyTotal = (employeeName: string) => {
    return Object.values(monthlyTips).reduce((total, day) => {
      const empTip = day.distributions.find(d => d.employeeName === employeeName)
      return total + (empTip?.amount || 0)
    }, 0)
  }

  const getDayTip = (date: string, employeeName: string) => {
    const dayData = monthlyTips[date]
    if (!dayData) return 0
    const empTip = dayData.distributions.find(d => d.employeeName === employeeName)
    return empTip?.amount || 0
  }

  const departments = [
    { key: 'cucina', label: 'Cucina', color: 'red' },
    { key: 'sala', label: 'Sala', color: 'blue' },
    { key: 'bar', label: 'Bar', color: 'green' }
  ]

  // Funzione per calcolare totale mance per reparto
  const getDepartmentTotal = (department: string) => {
    return Object.values(monthlyTips).reduce((total, day) => {
      const deptTips = day.distributions.filter(d => d.department === department)
      return total + deptTips.reduce((sum, d) => sum + d.amount, 0)
    }, 0)
  }

  // Riepilogo real-time di oggi dalle tipEntries
  const todayStr = new Date().toISOString().split('T')[0]
  const todayEntries = tipEntries.filter(e => e.date === todayStr)
  const todayTotalsByLocation: Record<string, number> = todayEntries.reduce((acc, e) => {
    acc[e.location] = (acc[e.location] || 0) + (Number(e.amount) || 0)
    return acc
  }, {} as Record<string, number>)

  // Riepilogo mensile per tipologia pagamento (basato su presenze e punti):
  // somma giornaliera inclusa solo se ci sono presenti (totalPoints>0)
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
    // employees demo list for names and departments
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
        // nessuna presenza: non conteggiare la giornata
        return
      }
      // Se ci sono presenti, i totali giornalieri sono validi e aggiungiamo
      result.cash += totals.cash
      result.card += totals.card
      result.foreign += totals.foreign
    })
    return result
  })()

  // Vista personale dipendente: calcolo dai dati mensili mock
  const myName = session?.user?.name || ''
  const dates = Object.keys(monthlyTips)
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

  // (sezione di inserimento inline usa shiftNewTipDate)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  const canManageTips = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'CASSIERE', 'RESPONSABILE_SALA'].includes(session.user?.role || '')
  const monthDays = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()

  // Helpers condivisi per calcolo presenza/turni
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + diff)
    return d
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

  // Calcolo lista giornaliera per un tipo (per il dipendente corrente)
  const getDailySharesFor = (type: 'cash' | 'card' | 'foreign') => {
    if (!session?.user?.name) return [] as { date: string; shiftLabel: string; amount: number }[]
    let employeePointsByName: Record<string, number> = {}
    let restDaysByName: Record<string, [string, string?]> = {}
    try { const ep = localStorage.getItem('employeePoints'); employeePointsByName = ep ? JSON.parse(ep) : {} } catch {}
    try { const rd = localStorage.getItem('employeeRestDays'); restDaysByName = rd ? JSON.parse(rd) : {} } catch {}

    const dayMap = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const days = getDaysInMonth(currentMonth)
    const myName = session.user.name
    const myPoints = employeePointsByName[myName] || 0
    const result: { date: string; shiftLabel: string; amount: number }[] = []

    days.forEach(d => {
      const dateStr = d.toISOString().split('T')[0]
      // Calcola presenza e punti del giorno
      const weekStart = getWeekStart(d)
      const weekKey = `shifts_${toISODate(weekStart)}`
      let weeklySchedule: Record<string, { time?: string }> = {}
      try { const raw = localStorage.getItem(weekKey); weeklySchedule = raw ? JSON.parse(raw) : {} } catch {}
      const dayIndex = getDayIndexFromDate(dateStr, weekStart)
      const dayIdx = d.getDay()
      const dayStr = dayMap[dayIdx]
      const candidateNames = Object.keys(employeePointsByName).length > 0 ? Object.keys(employeePointsByName) : employees.map(e => e.name)
      const isPresent = (name: string) => {
        const key = `${name}-${dayIndex}`
        const shift = weeklySchedule[key]
        if (shift && typeof shift.time === 'string') {
          return shift.time !== 'RIPOSO' && shift.time !== 'FERIE'
        }
        const r = restDaysByName[name] || []
        return !(r[0] === dayStr || r[1] === dayStr)
      }
      // Solo giorni in cui il dipendente è presente nei turni
      if (!isPresent(myName)) return
      const presentNames = candidateNames.filter(isPresent)
      const totalPoints = presentNames.reduce((sum, name) => sum + (employeePointsByName[name] || 0), 0)
      // Somma importi del tipo per quel giorno
      const dayTotal = tipEntries
        .filter(e => e.date === dateStr && e.type === type)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      let myShare = 0
      if (dayTotal > 0 && totalPoints > 0 && myPoints > 0) {
        myShare = (dayTotal / totalPoints) * myPoints
      }
      // Trova turno del dipendente per quel giorno
      const myKey = `${myName}-${dayIndex}`
      const myShift = weeklySchedule[myKey]
      const shiftLabel = myShift?.time && myShift.time !== 'RIPOSO' && myShift.time !== 'FERIE' ? myShift.time : '-'
      result.push({ date: dateStr, shiftLabel, amount: myShare })
    })

    // Ordina per data asc
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return result
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                💰 Mance
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {canManageTips && (
                <>
                  <button
                    onClick={clearTipsData}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                    title="Svuota importi e inserimenti demo"
                  >
                    🧹 Pulisci mance
                  </button>
                </>
              )}
              <span className="text-gray-700">{session.user?.name}</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                {session.user?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {canManageTips && (
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => router.push('/tips/manage')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                ⚙️ Gestisci Mance
              </button>
              <button
                onClick={() => router.push('/tips/daily')}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
              >
                📊 Storico Mance
              </button>
              <button
                onClick={() => setIsAddTipOpen(v => !v)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                ➕ Inserisci Mancia
              </button>
            </div>
          )}
          {/* Month Navigator */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
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
            {/* 3 riquadri sotto al mese (component condiviso, dati live) */}
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
            {expandedType && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold mb-2 capitalize">Dettaglio {expandedType === 'cash' ? 'Contanti' : expandedType === 'card' ? 'Carta' : 'Monete Estere'}</h4>
                {(() => {
                  const rows = getDailySharesFor(expandedType)
                  if (rows.length === 0) return <div className="text-sm text-gray-500">Nessun importo per il mese selezionato</div>
                  return (
                    <div className="space-y-2">
                      {rows.map(r => (
                        <div key={r.date} className="flex items-center justify-between text-sm">
                          <div className="text-gray-700">{new Date(r.date).toLocaleDateString('it-IT')}</div>
                          <div className="text-gray-600">{r.shiftLabel}</div>
                          <div className="font-semibold">€{r.amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
          {/* Riepilogo Mensile componetizzato rimosso su richiesta */}
          {/* Form inline nuova mancia */}
          {isAddTipOpen && canManageTips && (
            <div className="bg-white p-6 rounded-lg shadow mb-6 border">
              <div className="mb-4 grid grid-cols-3 items-center">
                <div className="text-sm text-gray-700">Nuova Mancia</div>
                <div className="flex justify-center">
                  <input
                    type="date"
                    value={newTipDate}
                    onChange={(e) => setNewTipDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => shiftNewTipDate(-1)} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">←</button>
                  <button onClick={() => shiftNewTipDate(1)} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">→</button>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 mb-2">Sala</div>
                <div className="flex flex-wrap gap-2">
                  {locations.map(loc => (
                    <label key={loc.id} className={`px-3 py-2 border-2 rounded-lg cursor-pointer ${newSelectedLocation===loc.id? 'border-indigo-500 bg-indigo-50':'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="new_location" value={loc.id} checked={newSelectedLocation===loc.id} onChange={(e)=>setNewSelectedLocation(e.target.value)} className="sr-only" />
                      {loc.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 border rounded bg-green-50">
                  <div className="text-sm mb-1">💵 Contanti</div>
                  <input type="number" step="0.01" min="0" value={newAmountCash} onChange={(e)=>setNewAmountCash(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="0.00" />
                </div>
                <div className="p-3 border rounded bg-blue-50">
                  <div className="text-sm mb-1">💳 Carta</div>
                  <input type="number" step="0.01" min="0" value={newAmountCard} onChange={(e)=>setNewAmountCard(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="0.00" />
                </div>
                <div className="p-3 border rounded bg-purple-50">
                  <div className="text-sm mb-1">🌍 Monete Estere</div>
                  <input type="number" step="0.01" min="0" value={newAmountForeign} onChange={(e)=>setNewAmountForeign(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="0.00" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=>setIsAddTipOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Annulla</button>
                <button onClick={handleInlineSaveTip} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">💾 Salva Mancia</button>
              </div>
            </div>
          )}
          {/* Sezioni successive rimosse per tutti i ruoli su richiesta */}
          {/* Moduli extra rimossi */}
        </div>
      </main>
    </div>
  )
}
