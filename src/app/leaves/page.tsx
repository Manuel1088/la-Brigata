'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactElement } from 'react'
import { LEAVE_TYPE_DEFINITIONS } from '@/lib/leave-types'
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from '@/lib/leaves'

type LeaveBalance = {
  type: string
  total: number
  used: number
  remaining: number
  percentage: number
}

type LeaveRequestRow = {
  id: string
  userId: string
  type: string
  startDate: string
  endDate: string
  reason: string | null
  status: string
  createdAt: string
  rejectionReason: string | null
}

export default function LeavesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeView, setActiveView] = useState('my-requests')
  const [form, setForm] = useState<{ type: string; startDate: string; endDate: string; reason: string }>({ type: 'VACATION', startDate: '', endDate: '', reason: '' })
  const userId: string = session?.user?.id || ''
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Calendario
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
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
  const getMondayIndex = (d: Date) => {
    const jsDay = d.getDay() // 0=Sun..6=Sat
    return (jsDay + 6) % 7 // 0=Mon..6=Sun
  }
  const [myRequests, setMyRequests] = useState<LeaveRequestRow[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  const loadMine = async () => {
    if (!userId) {
      setMyRequests([])
      setBalances([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/leaves?includeBalances=true')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyRequests((data.requests ?? []) as LeaveRequestRow[])
      setBalances((data.balances ?? []) as LeaveBalance[])
    } catch {
      setMyRequests([])
      setBalances([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMine()
    const onUpdate = () => {
      loadMine()
    }
    window.addEventListener('approvals_updated', onUpdate)
    return () => window.removeEventListener('approvals_updated', onUpdate)
  }, [userId])

  // Costruisce stato giorni del mese corrente in base alle MIE richieste
  useEffect(() => {
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const totalDays = new Date(year, month + 1, 0).getDate()
      const statuses: Record<string, 'pending' | 'approved' | null> = {}
      // Inizializza tutti i giorni del mese a null
      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(year, month, day)
        statuses[formatISO(d)] = null
      }
      // Integra solo le richieste dell'utente corrente
      for (const req of myRequests) {
        if (req.status === 'CANCELLED' || req.status === 'REJECTED') continue
        const start = new Date(req.startDate)
        const end = new Date(req.endDate)
        for (let day = 1; day <= totalDays; day++) {
          const d = new Date(year, month, day)
          const key = formatISO(d)
          if (
            d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
            d <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
          ) {
            if (req.status === 'PENDING') statuses[key] = 'pending'
            else if (req.status === 'APPROVED' && !statuses[key]) statuses[key] = 'approved'
          }
        }
      }
      setDayStatuses(statuses)
    } catch {
      setDayStatuses({})
    }
  }, [currentMonth, myRequests])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* VISTA: Le Mie Richieste */}
        {activeView === 'my-requests' && (
          <div className="space-y-6">
            {/* Calendario mese corrente (solo richieste personali) */}
            <div className="bg-white rounded-lg shadow">
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
                <div className="grid grid-cols-7 text-xs text-gray-500 mb-2 px-1">
                  {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
                    <div key={d} className="text-center">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentMonth.getFullYear()
                    const month = currentMonth.getMonth()
                    const total = new Date(year, month + 1, 0).getDate()
                    const firstDay = new Date(year, month, 1)
                    const leading = getMondayIndex(firstDay)
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
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Approvato</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span> In attesa</div>
                </div>
              </div>
            </div>

            {/* Riquadri Ferie e ROL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ferie */}
              {(() => {
                const vac = balances.find(b => b.type === 'VACATION')
                const maturate = vac?.total ?? 0
                const godute = vac?.used ?? 0
                const residue = vac?.remaining ?? 0
                return (
                  <div className="bg-white rounded-lg p-5 border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xl font-semibold text-gray-900">🏖️ Ferie</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Giorni</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-700">{maturate}</div>
                        <div className="text-xs text-blue-700 mt-1">Maturate</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-700">{residue}</div>
                        <div className="text-xs text-green-700 mt-1">Residue</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-orange-700">{godute}</div>
                        <div className="text-xs text-orange-700 mt-1">Godute</div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ROL */}
              {(() => {
                const rol = balances.find(b => b.type === 'ROL')
                const maturate = rol?.total ?? 0
                const godute = rol?.used ?? 0
                const residue = rol?.remaining ?? 0
                return (
                  <div className="bg-white rounded-lg p-5 border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xl font-semibold text-gray-900">⏰ ROL</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">Ore</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-700">{maturate}</div>
                        <div className="text-xs text-blue-700 mt-1">Maturate</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-700">{residue}</div>
                        <div className="text-xs text-green-700 mt-1">Residue</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-orange-700">{godute}</div>
                        <div className="text-xs text-orange-700 mt-1">Godute</div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Nuova Richiesta sempre visibile */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuova Richiesta</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tipo</label>
                    <div className="relative">
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full px-3 h-10 border border-gray-300 rounded-lg bg-white appearance-none pr-8"
                      >
                      {LEAVE_TYPE_DEFINITIONS.map((def) => (
                        <option key={def.id} value={def.id}>
                          {def.label}
                        </option>
                      ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Dal</label>
                    <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 h-10 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Al</label>
                    <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 h-10 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm text-gray-700 mb-1">Motivo (opzionale)</label>
                  <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Es. Vacanza famiglia" />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' })} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Annulla</button>
                  <button
                    disabled={submitting}
                    onClick={async () => {
                      if (!form.startDate || !form.endDate) {
                        alert('Seleziona date')
                        return
                      }
                      setSubmitting(true)
                      try {
                        const res = await fetch('/api/leaves', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: form.type,
                            startDate: form.startDate,
                            endDate: form.endDate,
                            reason: form.reason || undefined,
                          }),
                        })
                        const data = await res.json()
                        if (!res.ok) {
                          alert(data.error || 'Invio non riuscito')
                          return
                        }
                        await loadMine()
                        setForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' })
                        window.dispatchEvent(new CustomEvent('approvals_updated'))
                      } catch {
                        alert('Errore di rete')
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? 'Invio...' : 'Invia'}
                  </button>
                </div>
            </div>

            {/* Le Tue Richieste */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Le Tue Richieste</h3>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="text-sm text-gray-500">Caricamento...</div>
                ) : !myRequests || myRequests.length === 0 ? (
                  <div className="text-sm text-gray-500">Nessuna richiesta inviata.</div>
                ) : (
                  myRequests
                    .slice()
                    .reverse()
                    .map((req) => (
                    <div key={req.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-sm text-gray-600">
                            {LEAVE_TYPE_LABELS[req.type] ?? req.type}
                          </div>
                          <div className="font-semibold">
                            {new Date(req.startDate).toLocaleDateString('it-IT')} -{' '}
                            {new Date(req.endDate).toLocaleDateString('it-IT')}
                          </div>
                          {req.reason && (
                            <div className="text-sm text-gray-600 mt-1">{req.reason}</div>
                          )}
                          {req.rejectionReason && req.status === 'REJECTED' && (
                            <div className="text-sm text-red-600 mt-1">
                              Motivo rifiuto: {req.rejectionReason}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              req.status === 'PENDING'
                                ? 'bg-blue-100 text-blue-800'
                                : req.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : req.status === 'CANCELLED'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {LEAVE_STATUS_LABELS[req.status] ?? req.status}
                          </span>
                          {req.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Annullare questa richiesta?')) return
                                try {
                                  const res = await fetch(`/api/leaves/${req.id}`, {
                                    method: 'DELETE',
                                  })
                                  const data = await res.json()
                                  if (!res.ok) {
                                    alert(data.error || 'Annullamento non riuscito')
                                    return
                                  }
                                  await loadMine()
                                  window.dispatchEvent(new CustomEvent('approvals_updated'))
                                } catch {
                                  alert('Errore di rete')
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Annulla
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              {/* Richiesta Modificata dal Manager */}
              {/* Esempi statici mantenuti per UI */}
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                    ⚠️ MODIFICATA DAL MANAGER
                  </span>
                  <span className="text-xs text-gray-500">5 Ottobre 2025</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div>
                    <span className="text-sm text-gray-600">Date richieste:</span>
                    <div className="font-medium line-through text-gray-500">10-15 Dicembre</div>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Proposte dal manager:</span>
                    <div className="font-bold text-green-700">12-17 Dicembre</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-4 p-3 bg-white rounded">
                  <strong>Motivazione:</strong> &quot;Abbiamo già 2 persone in ferie dal 10-12. Le date 12-17 vanno meglio.&quot;
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    ✅ Accetto
                  </button>
                  <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                    ❌ Rifiuto
                  </button>
                  <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    ✏️ Altre Date
                  </button>
                </div>
              </div>

              {/* Richiesta Pending */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hidden">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                      ⏳ IN ATTESA
                    </span>
                    <div className="mt-2 font-semibold">5-10 Gennaio 2026</div>
                    <div className="text-sm text-gray-600">5 giorni • Richiesta del 8 Ottobre</div>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                    🗑️ Annulla
                  </button>
                </div>
              </div>

              {/* Richiesta Approvata */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 hidden">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                      ✅ APPROVATA
                    </span>
                    <div className="mt-2 font-semibold">20-25 Agosto 2025</div>
                    <div className="text-sm text-gray-600">5 giorni • Approvata da Marco Rossi il 1 Agosto</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Vista approvazioni rimossa: usare pagina /approvals */}
      </main>
    </div>
  )
}

