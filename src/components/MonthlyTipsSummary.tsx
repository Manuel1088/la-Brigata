'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getEmployeesFullClient } from '@/lib/employees'
import { useEmployeeContext } from '@/contexts/EmployeeContext'

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
  const { employees: employeesData, mutate: mutateEmployees, isLoading } = useEmployeeContext()
  const [isExportOpen, setIsExportOpen] = useState(false)
  
  // Helpers export
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  const openPrintPDF = (html: string) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(`<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Mance</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;color:#111}.h1{font-size:20px;font-weight:700;margin-bottom:8px}.meta{color:#555;margin-bottom:16px}.table{width:100%;border-collapse:collapse}.table th,.table td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}.small{font-size:12px;color:#555}</style></head><body>${html}</body></html>`)
    w.document.close()
    setTimeout(() => { try { w.print() } catch {} }, 300)
  }
  const buildTipsHTML = () => {
    const headers = ['Data','Tipo','Importo','Location']
    const rows = tipEntries
      .filter(e => { const d = new Date(e.date); return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth() })
      .map(e => `<tr><td>${new Date(e.date).toLocaleDateString('it-IT')}</td><td>${e.type}</td><td>€${Number(e.amount).toFixed(2)}</td><td>${e.location}</td></tr>`)
      .join('')
    return `
      <div class=\"h1\">Riepilogo Mance - ${monthName}</div>
      <div class=\"meta\">${new Date().toLocaleString('it-IT')}</div>
      <div class=\"small\">Totale: Contanti €${totals.cash.toFixed(2)} • Carta €${totals.card.toFixed(2)} • Estere €${totals.foreign.toFixed(2)}</div>
      <table class=\"table\" cellspacing=\"0\" cellpadding=\"0\"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    `
  }
  const exportExcelTips = () => {
    const html = `
      <html><head><meta charset=\"UTF-8\"></head><body>
      <table border=\"1\">
        <tr><th>Data</th><th>Tipo</th><th>Importo</th><th>Location</th></tr>
        ${tipEntries
          .filter(e => { const d = new Date(e.date); return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth() })
          .map(e => `<tr><td>${new Date(e.date).toISOString().split('T')[0]}</td><td>${e.type}</td><td>${Number(e.amount)}</td><td>${e.location}</td></tr>`)
          .join('')}
      </table>
      </body></html>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    downloadBlob(blob, `mance-${targetMonth.getFullYear()}-${(targetMonth.getMonth()+1).toString().padStart(2,'0')}.xls`)
  }
  const exportPNGTips = async () => {
    try {
      const width = 1200
      const height = 800
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#111111'
      ctx.font = 'bold 26px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      ctx.fillText(`Mance - ${monthName}`, 32, 48)
      ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      ctx.fillStyle = '#555'
      ctx.fillText(new Date().toLocaleString('it-IT'), 32, 72)
      ctx.fillStyle = '#111'
      const headers = ['Data','Tipo','Importo','Location']
      const cols = [160, 180, 180, 300]
      let x = 32
      let y = 110
      ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      headers.forEach((h, i) => { ctx.fillText(h, x, y); x += cols[i] })
      y += 8
      ctx.strokeStyle = '#ddd'
      ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(width - 32, y); ctx.stroke()
      y += 22
      ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      const monthRows = tipEntries
        .filter(e => { const d = new Date(e.date); return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth() })
        .slice(0, 26)
      monthRows.forEach(e => {
        x = 32
        const row = [new Date(e.date).toLocaleDateString('it-IT'), e.type, `€${Number(e.amount).toFixed(2)}`, e.location]
        row.forEach((val, i) => { ctx.fillText(String(val), x, y); x += cols[i] })
        y += 22
      })
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b || new Blob()), 'image/png'))
      downloadBlob(blob, `mance-${targetMonth.getFullYear()}-${(targetMonth.getMonth()+1).toString().padStart(2,'0')}.png`)
    } catch {}
  }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop transparent to keep page visible */}
          <div
            className="absolute inset-0 bg-transparent"
            onClick={() => setIsExportOpen(false)}
          />
          {/* sheet */}
          <div className="relative w-full max-w-md mx-auto rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="py-3 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 pb-2">
              <div className="text-center text-sm text-gray-500 mb-3">Come vuoi esportare?</div>
              <div className="flex flex-col divide-y divide-gray-200 rounded-xl overflow-hidden border border-gray-200 mb-3">
                <button onClick={() => { try { openPrintPDF(buildTipsHTML()) } catch {} }} className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900">🧾 PDF (stampa/salva)</button>
                <button onClick={() => { try { exportExcelTips() } catch {} }} className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900">📊 Excel (.xls)</button>
                <button onClick={() => { try { exportPNGTips() } catch {} }} className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900">🖼️ PNG (immagine)</button>
                <button onClick={async () => { try { const headers = ['date','type','amount','location'] as const; const monthRows = tipEntries.filter(e => { const d = new Date(e.date); return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth() }).map(e => [e.date, e.type, e.amount, e.location]); const rows = [headers as unknown as string[], ...monthRows.map(r => r.map(x => String(x)))]; const csv = rows.map(row => row.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }).join(',')).join('\n'); await navigator.clipboard.writeText(csv); alert('Copiato negli appunti') } catch {} }} className="w-full py-3 text-center bg-white hover:bg-gray-50 transition text-gray-900">📋 Copia testo (CSV)</button>
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


