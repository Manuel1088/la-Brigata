'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getEmployeesFullClient, getEmployeesByCompany } from '@/lib/employees'

type Props = {
  month?: Date
  leftLabel?: string | null
  variant?: 'full' | 'boxesOnly'
}

type TipEntry = {
  id: string
  date: string
  location: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
  createdAt?: string
}

export default function MonthlyTipsSummary({ month, leftLabel = 'mance', variant = 'full' }: Props) {
  const { data: session } = useSession()
  const [tipEntries, setTipEntries] = useState<TipEntry[]>([])
  const [employeesList, setEmployeesList] = useState<any[]>(getEmployeesFullClient())

  const targetMonth = month ? new Date(month) : new Date()
  const monthName = targetMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('tipEntries')
        const list: TipEntry[] = raw ? JSON.parse(raw) : []
        setTipEntries(list)
      } catch {
        setTipEntries([])
      }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('tip_entries_updated', onUpdate as any) } catch {}
    try { window.addEventListener('storage', onUpdate as any) } catch {}
    return () => {
      try { window.removeEventListener('tip_entries_updated', onUpdate as any) } catch {}
      try { window.removeEventListener('storage', onUpdate as any) } catch {}
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadEmployees = async () => {
      let empList = getEmployeesFullClient()
      try {
        const cid = (session?.user as any)?.companyId as string | undefined
        if (cid) {
          const api = await getEmployeesByCompany(cid)
          empList = api
            .filter(e => (e as any).role !== 'PROPRIETARIO')
            .map((e, idx) => ({
            id: e.id || String(idx + 1),
            name: e.name,
            email: e.email,
            phone: e.phone || '',
            role: e.role,
            department: (e as any).department || 'sala',
            level: (e as any).level || 2,
            hourlyRate: 12,
            contractType: 'full-time',
            startDate: new Date().toISOString().split('T')[0],
            isActive: e.isActive,
            avatar: e.avatar || '👤',
            skills: [],
            personalInfo: {}
          })) as any
        }
      } catch {}
      if (!cancelled) setEmployeesList(empList)
    }
    loadEmployees()
    const onEmployeesUpdate = () => loadEmployees()
    try { window.addEventListener('employees_updated', onEmployeesUpdate as any) } catch {}
    return () => {
      cancelled = true
      try { window.removeEventListener('employees_updated', onEmployeesUpdate as any) } catch {}
    }
  }, [session?.user])

  const totals = useMemo(() => {
    const monthEntries = tipEntries.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth()
    })

    let employeePointsByName: Record<string, number> = {}
    let restDaysByName: Record<string, [string, string?]> = {}
    try { const ep = localStorage.getItem('employeePoints'); employeePointsByName = ep ? JSON.parse(ep) : {} } catch {}
    try { const rd = localStorage.getItem('employeeRestDays'); restDaysByName = rd ? JSON.parse(rd) : {} } catch {}

    const empList = employeesList

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

    const getWeekStart = (d: Date) => { const x = new Date(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1) - day; x.setHours(0,0,0,0); x.setDate(x.getDate() + diff); return x }
    const toISODate = (d: Date) => { const z = (n: number) => (n < 10 ? `0${n}` : `${n}`); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}` }
    const getDayIndexFromDate = (dateStr: string, weekStart: Date) => { const target = new Date(dateStr); const diffTime = target.getTime() - weekStart.getTime(); return Math.floor(diffTime / (1000*60*60*24)) }

    const result = { cash: 0, card: 0, foreign: 0 }
    byDate.forEach((totals, dateStr) => {
      const weekStart = getWeekStart(new Date(dateStr))
      const weekKey = `shifts_${toISODate(weekStart)}`
      let weeklySchedule: Record<string, { time?: string }> = {}
      try { const raw = localStorage.getItem(weekKey); weeklySchedule = raw ? JSON.parse(raw) : {} } catch { weeklySchedule = {} }
      const dayIndex = getDayIndexFromDate(dateStr, weekStart)
      const dayIdx = new Date(dateStr).getDay()
      const dayMap = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
      const dayStr = dayMap[dayIdx]
      const present = empList.filter(emp => {
        const key = `${emp.name}-${dayIndex}`
        const shift = weeklySchedule[key]
        if (shift && typeof shift.time === 'string') { return shift.time !== 'RIPOSO' && shift.time !== 'FERIE' }
        const r = restDaysByName[emp.name] || []
        return !(r[0] === dayStr || r[1] === dayStr)
      })
      const totalPoints = present.reduce((sum, emp) => sum + (employeePointsByName[emp.name] || 0), 0)
      if (totalPoints <= 0) return
      result.cash += totals.cash
      result.card += totals.card
      result.foreign += totals.foreign
    })
    return result
  }, [tipEntries, targetMonth, employeesList])

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      {variant !== 'boxesOnly' && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-700">{leftLabel || ''}</div>
          <h3 className="text-lg font-semibold text-right">📦 Riepilogo {monthName}</h3>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-3 rounded-lg border bg-green-50 text-center">
          <div className="text-sm text-gray-600 mb-1">💵 Contanti</div>
          <div className="text-xl font-semibold text-green-700">€{totals.cash.toFixed(2)}</div>
        </div>
        <div className="p-3 rounded-lg border bg-blue-50 text-center">
          <div className="text-sm text-gray-600 mb-1">💳 Carta</div>
          <div className="text-xl font-semibold text-blue-700">€{totals.card.toFixed(2)}</div>
        </div>
        <div className="p-3 rounded-lg border bg-purple-50 text-center">
          <div className="text-sm text-gray-600 mb-1">🌍 Monete Estere</div>
          <div className="text-xl font-semibold text-purple-700">€{totals.foreign.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}


