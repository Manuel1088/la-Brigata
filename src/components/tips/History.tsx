'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'
import { useEmployees } from '@/hooks/useEmployees'

interface TipEntry {
  id: string
  date: string
  location: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
  createdAt?: string
}

export default function TipsHistory() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<TipEntry[]>([])
  const [tipsKey, setTipsKey] = useState<string>('')
  const [waitingCtx, setWaitingCtx] = useState<boolean>(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  // Company data via shared hook
  const { data: companyData, error: companyError } = useCompanyData(session?.user?.id)

  // Risolvi chiave per ristorante
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
    const load = () => {
      try {
        const raw = localStorage.getItem(tipsKey)
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
      } catch { setEntries([]) }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('tip_entries_updated', onUpdate as any) } catch {}
    try { window.addEventListener('storage', onUpdate as any) } catch {}
    return () => {
      try { window.removeEventListener('tip_entries_updated', onUpdate as any) } catch {}
      try { window.removeEventListener('storage', onUpdate as any) } catch {}
    }
  }, [tipsKey])

  // Carica locations per filtro
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    let cancelled = false
    const fiscal: string | undefined = companyData?.company?.fiscalCode
    if (!fiscal) return
    const key = `booking_areas_v1::${fiscal}`
    const load = () => {
      try {
        const raw = localStorage.getItem(key)
        const areas = raw ? JSON.parse(raw) : []
        const locs = (areas || []).map((a: any) => ({ id: a.id, name: a.name }))
        if (!cancelled) setLocations(locs)
      } catch { if (!cancelled) setLocations([]) }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('booking_areas_updated', onUpdate as any) } catch {}
    return () => { try { window.removeEventListener('booking_areas_updated', onUpdate as any) } catch {}; cancelled = true }
  }, [companyData])

  // Filtra entries
  const filteredEntries = entries.filter(entry => {
    if (filterType !== 'all' && entry.type !== filterType) return false
    if (filterLocation !== 'all' && entry.location !== filterLocation) return false
    if (filterDateFrom && entry.date < filterDateFrom) return false
    if (filterDateTo && entry.date > filterDateTo) return false
    return true
  })

  // Calcola statistiche
  const stats = {
    total: filteredEntries.reduce((sum, e) => sum + e.amount, 0),
    count: filteredEntries.length,
    byType: {
      cash: filteredEntries.filter(e => e.type === 'cash').reduce((sum, e) => sum + e.amount, 0),
      card: filteredEntries.filter(e => e.type === 'card').reduce((sum, e) => sum + e.amount, 0),
      foreign: filteredEntries.filter(e => e.type === 'foreign').reduce((sum, e) => sum + e.amount, 0)
    },
    byLocation: locations.reduce((acc, loc) => {
      acc[loc.name] = filteredEntries.filter(e => e.location === loc.name).reduce((sum, e) => sum + e.amount, 0)
      return acc
    }, {} as Record<string, number>)
  }

  if (waitingCtx) return <div className="text-center py-8">Caricamento...</div>

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🔍 Filtri</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Pagamento</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Tutti</option>
              <option value="cash">💵 Contanti</option>
              <option value="card">💳 Carta</option>
              <option value="foreign">🌍 Monete Estere</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Tutte</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Da Data</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">A Data</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Statistiche</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">€{stats.total.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Totale</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
            <div className="text-sm text-gray-600">Transazioni</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">€{stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}</div>
            <div className="text-sm text-gray-600">Media</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">€{stats.byType.cash.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Contanti</div>
          </div>
        </div>
      </div>

      {/* Lista Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">📋 Storico Completo</h3>
          <p className="text-sm text-gray-600">Mostrando {filteredEntries.length} di {entries.length} transazioni</p>
        </div>
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nessuna transazione trovata con i filtri selezionati</p>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString('it-IT')}
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      {entry.location}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${
                      entry.type === 'cash' ? 'bg-green-500' : 
                      entry.type === 'card' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}>
                      {entry.type === 'cash' ? '💵 Contanti' : 
                       entry.type === 'card' ? '💳 Carta' : '🌍 Monete Estere'}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    €{entry.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
