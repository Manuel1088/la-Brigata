'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  isOpen: boolean
  onClose: () => void
  userId?: string
  userRole?: string
}

type ShiftSwapRequest = {
  id: string
  dateISO: string
  dayIndex: number
  targetEmployeeName: string
  targetDepartment: string
  targetShiftTime: string
  requesterId: string
  requesterName: string
  requesterDepartment: string
  offeredShiftTime: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  reason?: string
}

const loadSwapRequests = (): ShiftSwapRequest[] => {
  try {
    const raw = localStorage.getItem('shift_swap_requests_v1')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveSwapRequests = (list: ShiftSwapRequest[]) => {
  try { localStorage.setItem('shift_swap_requests_v1', JSON.stringify(list)) } catch {}
  try { window.dispatchEvent(new Event('shift_swaps_updated')) } catch {}
}

const toISODate = (d: Date) => {
  const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

const getWeekStart = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day // porta a lunedì
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

export function ShiftSwapManager({ isOpen, onClose, userId, userRole }: Props) {
  const { data: session } = useSession()
  const [version, setVersion] = useState(0)
  const { notifyCustom } = useNotifications()
  const [showPendingOnly, setShowPendingOnly] = useState(true)
  const [deptFilter, setDeptFilter] = useState<'all'|'cucina'|'sala'|'bar'>('all')

  useEffect(() => {
    const onUpd = () => setVersion(v => v + 1)
    window.addEventListener('shift_swaps_updated', onUpd)
    return () => window.removeEventListener('shift_swaps_updated', onUpd)
  }, [])

  const list = useMemo(() => loadSwapRequests(), [version, isOpen])
  const filtered = useMemo(() => {
    return list
      .filter(r => showPendingOnly ? r.status === 'PENDING' : true)
      .filter(r => deptFilter === 'all' ? true : (r.requesterDepartment === deptFilter || r.targetDepartment === deptFilter))
  }, [list, showPendingOnly, deptFilter])

  const canModerate = useMemo(() => {
    const upper = (userRole || '').toUpperCase()
    return ['ADMIN','PROPRIETARIO','DIRETTORE','MANAGER'].includes(upper)
  }, [userRole])

  const applySwapToSchedule = (req: ShiftSwapRequest) => {
    const d = new Date(req.dateISO)
    const weekKey = `shifts_${toISODate(getWeekStart(d))}`
    let map: Record<string, { employee: string; time?: string; department?: string; role?: string }> = {}
    try { const raw = localStorage.getItem(weekKey); map = raw ? JSON.parse(raw) : {} } catch { map = {} }
    const aKey = `${req.targetEmployeeName}-${req.dayIndex}`
    const bKey = `${req.requesterName}-${req.dayIndex}`
    map[aKey] = { employee: req.targetEmployeeName, time: req.offeredShiftTime, department: map[aKey]?.department || req.targetDepartment }
    map[bKey] = { employee: req.requesterName, time: req.targetShiftTime, department: map[bKey]?.department || req.requesterDepartment }
    try { localStorage.setItem(weekKey, JSON.stringify(map)) } catch {}
  }

  const approve = (id: string) => {
    const req = list.find(r => r.id === id)
    if (!req) return
    applySwapToSchedule(req)
    const updated = list.map(r => r.id === id ? ({ ...r, status: 'APPROVED', decidedBy: (session?.user?.id as string) || userId || '', decidedAt: new Date().toISOString() }) : r)
    saveSwapRequests(updated)
    notifyCustom('SUCCESS','SHIFTS','Cambio turno approvato', `${req.requesterName} ⇄ ${req.targetEmployeeName} • ${new Date(req.dateISO).toLocaleDateString('it-IT')}`, false)
    setVersion(v => v + 1)
  }

  const reject = (id: string) => {
    const reason = prompt('Motivo (opzionale):') || undefined
    const updated = list.map(r => r.id === id ? ({ ...r, status: 'REJECTED', reason, decidedBy: (session?.user?.id as string) || userId || '', decidedAt: new Date().toISOString() }) : r)
    saveSwapRequests(updated)
    const req = list.find(r => r.id === id)
    if (req) notifyCustom('WARNING','SHIFTS','Cambio turno rifiutato', `${req.requesterName} ⇄ ${req.targetEmployeeName}`, false)
    setVersion(v => v + 1)
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">🔄 Gestione Cambi Turno</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showPendingOnly} onChange={(e)=> setShowPendingOnly(e.target.checked)} />
                Solo in attesa
              </label>
              <select value={deptFilter} onChange={(e)=> setDeptFilter(e.target.value as any)} className="px-2 py-1 border rounded">
                <option value="all">Tutti i reparti</option>
                <option value="cucina">Cucina</option>
                <option value="sala">Sala</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div className="text-xs text-gray-600">Totale: {filtered.length}</div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-600">Nessuna richiesta.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => (
                <div key={r.id} className="border rounded p-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{new Date(r.dateISO).toLocaleDateString('it-IT')} • {r.status}</div>
                    <div className="text-gray-700">
                      {r.requesterName} propone <span className="font-semibold">{r.offeredShiftTime}</span> ⇄ {r.targetEmployeeName} <span className="font-semibold">{r.targetShiftTime}</span>
                    </div>
                    {r.reason && <div className="text-xs text-gray-500 mt-1">Motivo: {r.reason}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'PENDING' && canModerate ? (
                      <>
                        <button onClick={() => approve(r.id)} className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Approva</button>
                        <button onClick={() => reject(r.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Rifiuta</button>
                      </>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${r.status === 'APPROVED' ? 'bg-green-100 text-green-800' : r.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <button onClick={() => setVersion(v => v + 1)} className="px-3 py-2 border rounded text-sm hover:bg-gray-50">Aggiorna</button>
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 text-gray-900 rounded text-sm hover:bg-gray-300">Chiudi</button>
        </div>
      </div>
    </div>
  )
}


