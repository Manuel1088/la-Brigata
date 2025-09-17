'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

// Definizione dei tipi
type Employee = {
  name: string
  role: string
  department: string
}

type DailyTip = {
  date: string
  amount: number
  location?: string
  distributions?: {
    [department: string]: number
  }
}

type Distributions = {
  [department: string]: number
}

// Array dei dipendenti
const employees: Employee[] = [
  { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
  { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
  { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
  { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
]

type TipEntry = {
  id: string
  date: string
  location: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
  createdAt?: string
}

export default function DailyTipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [entries, setEntries] = useState<TipEntry[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [editingId, setEditingId] = useState<string>('')
  const [editMap, setEditMap] = useState<Record<string, TipEntry>>({})

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    const canManage = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'CASSIERE', 'RESPONSABILE_SALA'].includes(session.user?.role || '')
    if (!canManage) router.push('/tips')
  }, [session, status, router])

  // Carica storico da tipEntries e aggiorna su evento
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('tipEntries')
        const list: TipEntry[] = raw ? JSON.parse(raw) : []
        list.sort((a, b) => {
          const db = new Date(b.date).getTime()
          const da = new Date(a.date).getTime()
          if (db !== da) return db - da
          const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
          return cb - ca
        })
        setEntries(list)
      } catch {
        setEntries([])
      }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('tip_entries_updated', onUpdate as any) } catch {}
    return () => { try { window.removeEventListener('tip_entries_updated', onUpdate as any) } catch {} }
  }, [])

  // Carica sale esistenti per editing location
  useEffect(() => {
    try {
      const raw = localStorage.getItem('booking_areas_v1')
      const areas = raw ? JSON.parse(raw) : []
      const locs = (areas || []).map((a: any) => ({ id: a.id, name: a.name }))
      setLocations(locs)
    } catch {
      setLocations([])
    }
  }, [])

  const startEdit = (e: TipEntry) => {
    setEditingId(e.id)
    setEditMap(prev => ({ ...prev, [e.id]: { ...e } }))
  }

  const cancelEdit = () => {
    setEditingId('')
  }

  const saveEdit = (id: string) => {
    const payload = editMap[id]
    if (!payload) return
    try {
      const raw = localStorage.getItem('tipEntries')
      const list: TipEntry[] = raw ? JSON.parse(raw) : []
      const next = list.map(x => x.id === id ? {
        ...x,
        date: payload.date,
        location: payload.location,
        type: payload.type,
        amount: Number(payload.amount) || 0,
      } : x)
      localStorage.setItem('tipEntries', JSON.stringify(next))
      setEntries(next)
      try { window.dispatchEvent(new CustomEvent('tip_entries_updated')) } catch {}
      setEditingId('')
    } catch {}
  }

  const removeEntry = (id: string) => {
    try {
      const raw = localStorage.getItem('tipEntries')
      const list: TipEntry[] = raw ? JSON.parse(raw) : []
      const next = list.filter(x => x.id !== id)
      localStorage.setItem('tipEntries', JSON.stringify(next))
      setEntries(next)
      try { window.dispatchEvent(new CustomEvent('tip_entries_updated')) } catch {}
    } catch {}
  }

  const groupedByDate = useMemo(() => {
    const map = new Map<string, TipEntry[]>()
    entries.forEach(e => {
      const key = e.date
      const arr = map.get(key) || []
      arr.push(e)
      map.set(key, arr)
    })
    return Array.from(map.entries()).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  }, [entries])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/tips')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Torna al Riepilogo Mance</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 Storico Mance
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Storico mance */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">📊 Storico Mance</h2>
            </div>
            <div className="p-6">
              {entries.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nessuna mancia registrata</p>
              ) : (
                <div className="space-y-6">
                  {groupedByDate.map(([dateStr, list]) => {
                    const total = list.reduce((s, e) => s + (Number(e.amount) || 0), 0)
                    return (
                      <div key={dateStr} className="border rounded-lg">
                        <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                          <div className="font-medium">{new Date(dateStr).toLocaleDateString('it-IT')}</div>
                          <div className="text-sm text-gray-700">Totale: <span className="font-semibold">€{total.toFixed(2)}</span></div>
                        </div>
                        <div className="p-4 space-y-2">
                          {list.map(e => {
                            const isEd = editingId === e.id
                            const current = isEd ? (editMap[e.id] || e) : e
                            return (
                              <div key={e.id} className="flex items-center justify-between text-sm">
                                {!isEd ? (
                                  <>
                                    <div className="flex items-center gap-3">
                                      <span className="px-2 py-0.5 rounded-full text-white text-xs bg-gray-700">{e.location}</span>
                                      <span className={e.type==='cash' ? 'text-green-700' : e.type==='card' ? 'text-blue-700' : 'text-purple-700'}>
                                        {e.type === 'cash' ? 'Contanti' : e.type === 'card' ? 'Carta' : 'Monete Estere'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="font-semibold">€{Number(e.amount).toFixed(2)}</div>
                                      <button onClick={() => startEdit(e)} className="px-2 py-1 border rounded hover:bg-gray-50">Modifica</button>
                                      <button onClick={() => removeEntry(e.id)} className="px-2 py-1 border rounded text-red-600 hover:bg-red-50">Cancella</button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full grid md:grid-cols-5 gap-2 items-center">
                                    <div className="md:col-span-2">
                                      <select
                                        value={current.location}
                                        onChange={(ev) => setEditMap(prev => ({ ...prev, [e.id]: { ...(prev[e.id] || e), location: ev.target.value } }))}
                                        className="w-full px-2 py-1 border rounded"
                                      >
                                        {[{ id: current.location, name: current.location }, ...locations].reduce((acc, l) => {
                                          // evita duplicati se il nome coincide
                                          if (!acc.find(x => x.name === l.name)) acc.push(l)
                                          return acc
                                        }, [] as {id:string;name:string}[]).map(l => (
                                          <option key={l.name} value={l.name}>{l.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <select
                                        value={current.type}
                                        onChange={(ev) => setEditMap(prev => ({ ...prev, [e.id]: { ...(prev[e.id] || e), type: ev.target.value as TipEntry['type'] } }))}
                                        className="w-full px-2 py-1 border rounded"
                                      >
                                        <option value="cash">Contanti</option>
                                        <option value="card">Carta</option>
                                        <option value="foreign">Monete Estere</option>
                                      </select>
                                    </div>
                                    <div>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={current.amount}
                                        onChange={(ev) => setEditMap(prev => ({ ...prev, [e.id]: { ...(prev[e.id] || e), amount: parseFloat(ev.target.value || '0') } }))}
                                        className="w-full px-2 py-1 border rounded"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => saveEdit(e.id)} className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Salva</button>
                                      <button onClick={cancelEdit} className="px-2 py-1 border rounded hover:bg-gray-50">Annulla</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
