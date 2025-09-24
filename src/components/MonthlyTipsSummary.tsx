'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getEmployeesFullClient } from '@/lib/employees'
import { useEmployees } from '@/hooks/useEmployees'

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
  const waitingForCompany = !!session && !(session.user as any)?.companyId
  const { data: employeesData, mutate: mutateEmployees } = useEmployees((session?.user as any)?.companyId, true)
  const [isExportOpen, setIsExportOpen] = useState(false)

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
    if (employeesData && Array.isArray(employeesData)) {
      try {
        const empList = employeesData
          .filter((e: any) => (e as any).role !== 'PROPRIETARIO')
          .map((e: any, idx: number) => ({
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
        setEmployeesList(empList)
        return
      } catch {}
    }
    // Fallback lato client
    setEmployeesList(getEmployeesFullClient())
  }, [employeesData])

  useEffect(() => {
    const onEmployeesUpdate = () => { try { mutateEmployees() } catch {} }
    try { window.addEventListener('employees_updated', onEmployeesUpdate as any) } catch {}
    return () => { try { window.removeEventListener('employees_updated', onEmployeesUpdate as any) } catch {} }
  }, [mutateEmployees])

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

  if (waitingForCompany) {
    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">Caricamento...</div>
    )
  }
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      {variant !== 'boxesOnly' && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-700">{leftLabel || ''}</div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-right">📦 Riepilogo {monthName}</h3>
            <button
              onClick={() => setIsExportOpen(true)}
              className="ml-2 px-3 py-1 rounded bg-gray-900 text-white text-sm hover:bg-gray-800"
              title="Esporta"
            >
              Esporta
            </button>
          </div>
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

      {/* Export Action Sheet */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* backdrop transparent to keep page visible */}
          <div
            className="absolute inset-0 bg-transparent"
            onClick={() => setIsExportOpen(false)}
          />
          {/* sheet */}
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-white shadow-xl overflow-hidden">
            <div className="py-3 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 pb-2">
              <div className="text-center text-sm text-gray-500 mb-3">Come vuoi esportare?</div>
              <div className="flex flex-col divide-y divide-gray-200 rounded-xl overflow-hidden border border-gray-200 mb-3">
                <button
                  onClick={async () => {
                    try {
                      const monthEntries = tipEntries.filter(e => {
                        const d = new Date(e.date)
                        return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth()
                      })
                      const payload = { month: monthName, totals, entries: monthEntries }
                      const dataStr = JSON.stringify(payload, null, 2)
                      const blob = new Blob([dataStr], { type: 'application/json' })
                      const file = new File([blob], `mance-${targetMonth.getFullYear()}-${(targetMonth.getMonth()+1).toString().padStart(2,'0')}.json`, { type: 'application/json' })
                      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
                        await (navigator as any).share({ files: [file], title: 'Mance', text: `Riepilogo ${monthName}` })
                      } else if (navigator.share) {
                        await navigator.share({ title: 'Mance', text: dataStr })
                      } else {
                        await navigator.clipboard.writeText(dataStr)
                        alert('Dati copiati negli appunti')
                      }
                      setIsExportOpen(false)
                    } catch {}
                  }}
                  className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900"
                >
                  📱 Condividi (iOS/Android)
                </button>
                <button
                  onClick={() => {
                    try {
                      const monthEntries = tipEntries.filter(e => {
                        const d = new Date(e.date)
                        return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth()
                      })
                      const payload = { month: monthName, totals, entries: monthEntries }
                      const dataStr = JSON.stringify(payload, null, 2)
                      const dataBlob = new Blob([dataStr], { type: 'application/json' })
                      const url = URL.createObjectURL(dataBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `mance-${targetMonth.getFullYear()}-${(targetMonth.getMonth()+1).toString().padStart(2,'0')}.json`
                      link.click()
                    } catch {}
                  }}
                  className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900"
                >
                  💾 Scarica JSON
                </button>
                <button
                  onClick={() => {
                    try {
                      const headers = ['date','type','amount','location'] as const
                      const monthRows = tipEntries
                        .filter(e => {
                          const d = new Date(e.date)
                          return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth()
                        })
                        .map(e => [e.date, e.type, e.amount, e.location])
                      const rows = [headers as unknown as string[], ...monthRows.map(r => r.map(x => String(x)))]
                      const csv = rows.map(row => row.map(v => {
                        const s = String(v ?? '')
                        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
                      }).join(',')).join('\n')
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `mance-${targetMonth.getFullYear()}-${(targetMonth.getMonth()+1).toString().padStart(2,'0')}.csv`
                      link.click()
                    } catch {}
                  }}
                  className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900"
                >
                  📄 Scarica CSV (Mance del mese)
                </button>
                <button
                  onClick={async () => {
                    try {
                      const monthEntries = tipEntries.filter(e => {
                        const d = new Date(e.date)
                        return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth()
                      })
                      const payload = { month: monthName, totals, entries: monthEntries }
                      const dataStr = JSON.stringify(payload, null, 2)
                      await navigator.clipboard.writeText(dataStr)
                      alert('Copiato negli appunti')
                    } catch {}
                  }}
                  className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900"
                >
                  📋 Copia negli appunti
                </button>
              </div>
              <button
                onClick={() => setIsExportOpen(false)}
                className="w-full py-3 text-center bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-900 mb-1"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


