'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'
import { formatCurrency, safeSum, safeAverage } from '@/lib/formatNumber'

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
      } catch (error) {
        console.error('Error loading tips:', error)
        setEntries([])
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
      } catch {
        if (!cancelled) setLocations([])
      }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('booking_areas_updated', onUpdate as any) } catch {}
    return () => {
      try { window.removeEventListener('booking_areas_updated', onUpdate as any) } catch {}
      cancelled = true
    }
  }, [companyData])

  // Filtra entries
  const filteredEntries = entries.filter(entry => {
    if (filterType !== 'all' && entry.type !== filterType) return false
    if (filterLocation !== 'all' && entry.location !== filterLocation) return false
    if (filterDateFrom && entry.date < filterDateFrom) return false
    if (filterDateTo && entry.date > filterDateTo) return false
    return true
  })

  // ✅ Calcola statistiche con helper functions sicure
  const calculateTipsByType = (type: 'cash' | 'card' | 'foreign'): number => {
    const filtered = filteredEntries.filter(e => e.type === type)
    if (filtered.length === 0) return 0
    return safeSum(...filtered.map(e => e.amount))
  }

  const calculateTipsByLocation = (locationName: string): number => {
    const filtered = filteredEntries.filter(e => e.location === locationName)
    if (filtered.length === 0) return 0
    return safeSum(...filtered.map(e => e.amount))
  }

  const stats = {
    total: filteredEntries.length > 0 ? safeSum(...filteredEntries.map(e => e.amount)) : 0,
    count: filteredEntries.length,
    average: filteredEntries.length > 0 
      ? safeAverage(filteredEntries.map(e => e.amount))
      : 0,
    byType: {
      cash: calculateTipsByType('cash'),
      card: calculateTipsByType('card'),
      foreign: calculateTipsByType('foreign')
    },
    byLocation: locations.reduce((acc, loc) => {
      acc[loc.name] = calculateTipsByLocation(loc.name)
      return acc
    }, {} as Record<string, number>)
  }

  const getPaymentTypeLabel = (type: string): string => {
    switch (type) {
      case 'cash': return '💵 Contanti'
      case 'card': return '💳 Carta'
      case 'foreign': return '🌍 Monete Estere'
      default: return type
    }
  }

  const getPaymentTypeBadgeClass = (type: string): string => {
    switch (type) {
      case 'cash': return 'bg-green-500'
      case 'card': return 'bg-blue-500'
      case 'foreign': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  if (waitingCtx) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
        <p className="text-gray-600">Caricamento...</p>
      </div>
    )
  }

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

        {/* Pulsante Reset Filtri */}
        {(filterType !== 'all' || filterLocation !== 'all' || filterDateFrom || filterDateTo) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilterType('all')
                setFilterLocation('all')
                setFilterDateFrom('')
                setFilterDateTo('')
              }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              🔄 Reset Filtri
            </button>
          </div>
        )}
      </div>

      {/* Statistiche */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Statistiche</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</div>
            <div className="text-sm text-gray-600">Totale</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{stats.count}</div>
            <div className="text-sm text-blue-700">Transazioni</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{formatCurrency(stats.average)}</div>
            <div className="text-sm text-green-700">Media per Transazione</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(stats.byType.cash)}</div>
            <div className="text-sm text-orange-700">Contanti</div>
          </div>
        </div>

        {/* Breakdown per Tipo */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">💵 Contanti</span>
              <span className="text-lg font-bold text-green-900">{formatCurrency(stats.byType.cash)}</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">💳 Carta</span>
              <span className="text-lg font-bold text-blue-900">{formatCurrency(stats.byType.card)}</span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-800">🌍 Estere</span>
              <span className="text-lg font-bold text-purple-900">{formatCurrency(stats.byType.foreign)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">📋 Storico Completo</h3>
          <p className="text-sm text-gray-600">
            Mostrando {filteredEntries.length} di {entries.length} transazioni
          </p>
        </div>
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-500">Nessuna transazione trovata con i filtri selezionati</p>
              <p className="text-sm text-gray-400 mt-1">Prova a modificare i criteri di ricerca</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-900 min-w-[100px]">
                      {new Date(entry.date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      📍 {entry.location}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getPaymentTypeBadgeClass(entry.type)}`}>
                      {getPaymentTypeLabel(entry.type)}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {formatCurrency(entry.amount)}
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