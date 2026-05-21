'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatCurrency, safeSum, safeAverage } from '@/lib/formatNumber'

type TipEntryRow = {
  id: string
  date: string
  location: string
  locationId: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
}

type DistributionRow = {
  id: string
  date: string
  locationId: string
  locationName: string
  amount: number
  employeeScore: number
  totalTips: number
  totalPoints: number
}

type LocationOption = { id: string; name: string }

type EntriesResponse = {
  view: 'manager' | 'employee'
  month: number
  year: number
  monthLabel: string
  locations: LocationOption[]
  entries: TipEntryRow[]
  distributions: DistributionRow[]
}

export default function TipsHistory() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [data, setData] = useState<EntriesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tips/entries?year=${year}&month=${month}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Errore caricamento')
      }
      setData((await res.json()) as EntriesResponse)
      setFilterType('all')
      setFilterLocation('all')
      setFilterDateFrom('')
      setFilterDateTo('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void load()
  }, [load])

  const isEmployee = data?.view === 'employee'
  const locations = data?.locations ?? []

  const filteredEntries = useMemo(() => {
    if (!data || isEmployee) return []
    return data.entries.filter((entry) => {
      if (filterType !== 'all' && entry.type !== filterType) return false
      if (filterLocation !== 'all' && entry.location !== filterLocation) return false
      if (filterDateFrom && entry.date < filterDateFrom) return false
      if (filterDateTo && entry.date > filterDateTo) return false
      return true
    })
  }, [data, isEmployee, filterType, filterLocation, filterDateFrom, filterDateTo])

  const filteredDistributions = useMemo(() => {
    if (!data || !isEmployee) return []
    return data.distributions.filter((d) => {
      if (filterLocation !== 'all' && d.locationName !== filterLocation) return false
      if (filterDateFrom && d.date < filterDateFrom) return false
      if (filterDateTo && d.date > filterDateTo) return false
      return true
    })
  }, [data, isEmployee, filterLocation, filterDateFrom, filterDateTo])

  const stats = useMemo(() => {
    if (isEmployee) {
      const amounts = filteredDistributions.map((d) => d.amount)
      const byLocation = locations.reduce(
        (acc, loc) => {
          acc[loc.name] = safeSum(
            ...filteredDistributions.filter((d) => d.locationName === loc.name).map((d) => d.amount)
          )
          return acc
        },
        {} as Record<string, number>
      )
      const uniqueDays = new Set(filteredDistributions.map((d) => d.date)).size
      return {
        total: amounts.length > 0 ? safeSum(...amounts) : 0,
        count: filteredDistributions.length,
        days: uniqueDays,
        average: amounts.length > 0 ? safeAverage(amounts) : 0,
        byType: { cash: 0, card: 0, foreign: 0 },
        byLocation,
      }
    }

    const amounts = filteredEntries.map((e) => e.amount)
    const byType = {
      cash: safeSum(...filteredEntries.filter((e) => e.type === 'cash').map((e) => e.amount)),
      card: safeSum(...filteredEntries.filter((e) => e.type === 'card').map((e) => e.amount)),
      foreign: safeSum(
        ...filteredEntries.filter((e) => e.type === 'foreign').map((e) => e.amount)
      ),
    }
    const byLocation = locations.reduce(
      (acc, loc) => {
        acc[loc.name] = safeSum(
          ...filteredEntries.filter((e) => e.location === loc.name).map((e) => e.amount)
        )
        return acc
      },
      {} as Record<string, number>
    )
    return {
      total: amounts.length > 0 ? safeSum(...amounts) : 0,
      count: filteredEntries.length,
      days: new Set(filteredEntries.map((e) => e.date)).size,
      average: amounts.length > 0 ? safeAverage(amounts) : 0,
      byType,
      byLocation,
    }
  }, [isEmployee, filteredEntries, filteredDistributions, locations])

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() - 1)
      return d
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() + 1)
      return d
    })
  }

  const resetFilters = () => {
    setFilterType('all')
    setFilterLocation('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const hasActiveFilters =
    filterType !== 'all' || filterLocation !== 'all' || filterDateFrom || filterDateTo

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
        <p className="text-gray-600">Caricamento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button type="button" onClick={() => void load()} className="block mt-2 text-sm underline">
          Riprova
        </button>
      </div>
    )
  }

  const listCount = isEmployee ? filteredDistributions.length : filteredEntries.length
  const totalCount = isEmployee
    ? (data?.distributions.length ?? 0)
    : (data?.entries.length ?? 0)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold capitalize">{data?.monthLabel}</h3>
            <p className="text-sm text-gray-500">
              {isEmployee ? 'Storico quote distribuite' : 'Storico inserimenti ristorante'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🔍 Filtri</h3>
        <div className={`grid gap-4 ${isEmployee ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          {!isEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo pagamento</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Tutti</option>
                <option value="cash">💵 Contanti</option>
                <option value="card">💳 Carta</option>
                <option value="foreign">🌍 Monete estere</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Tutte</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Da data</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">A data</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            🔄 Reset filtri
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Statistiche</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</div>
            <div className="text-sm text-gray-600">Totale</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{stats.count}</div>
            <div className="text-sm text-blue-700">
              {isEmployee ? 'Quote' : 'Transazioni'}
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{stats.days}</div>
            <div className="text-sm text-green-700">Giorni</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">
              {formatCurrency(stats.average)}
            </div>
            <div className="text-sm text-orange-700">
              {isEmployee ? 'Media per quota' : 'Media per transazione'}
            </div>
          </div>
        </div>

        {!isEmployee && (
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex justify-between">
              <span className="text-sm font-medium text-green-800">💵 Contanti</span>
              <span className="text-lg font-bold text-green-900">
                {formatCurrency(stats.byType.cash)}
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex justify-between">
              <span className="text-sm font-medium text-blue-800">💳 Carta</span>
              <span className="text-lg font-bold text-blue-900">
                {formatCurrency(stats.byType.card)}
              </span>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex justify-between">
              <span className="text-sm font-medium text-purple-800">🌍 Estere</span>
              <span className="text-lg font-bold text-purple-900">
                {formatCurrency(stats.byType.foreign)}
              </span>
            </div>
          </div>
        )}

        {Object.values(stats.byLocation).some((v) => v > 0) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {locations.map((loc) =>
              stats.byLocation[loc.name] > 0 ? (
                <span
                  key={loc.id}
                  className="inline-flex gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                >
                  <span className="text-gray-600">{loc.name}</span>
                  <span className="font-semibold">{formatCurrency(stats.byLocation[loc.name])}</span>
                </span>
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">📋 Storico completo</h3>
          <p className="text-sm text-gray-600">
            Mostrando {listCount} di {totalCount}{' '}
            {isEmployee ? 'quote' : 'transazioni'}
          </p>
        </div>
        <div className="p-6">
          {listCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>Nessun risultato con i filtri selezionati</p>
            </div>
          ) : isEmployee ? (
            <div className="space-y-3">
              {filteredDistributions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 min-w-[100px]">
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      📍 {d.locationName}
                    </span>
                    <span className="text-xs text-gray-500">
                      Punti {d.employeeScore}/{d.totalPoints}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">{formatCurrency(d.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900 min-w-[100px]">
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      📍 {entry.location}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                        entry.type === 'cash'
                          ? 'bg-green-500'
                          : entry.type === 'card'
                            ? 'bg-blue-500'
                            : 'bg-purple-500'
                      }`}
                    >
                      {entry.type === 'cash'
                        ? '💵 Contanti'
                        : entry.type === 'card'
                          ? '💳 Carta'
                          : '🌍 Estere'}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">{formatCurrency(entry.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
