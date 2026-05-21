'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type TipsMyResponse = {
  employee: { id: string; name: string; score: number } | null
  month: number
  year: number
  monthLabel: string
  summary: {
    total: number
    daysWithTips: number
    averageDaily: number
  }
  byDay: Array<{
    date: string
    amount: number
    locations: Array<{ locationId: string; locationName: string; amount: number }>
  }>
  byLocation: Array<{ locationId: string; locationName: string; total: number }>
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(amount) ? amount : 0
  )

export default function TipsOverview() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [data, setData] = useState<TipsMyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const loadTips = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tips/my?year=${year}&month=${month}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Errore caricamento mance')
      }
      const json = (await res.json()) as TipsMyResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void loadTips()
  }, [loadTips])

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() - 1)
      return d
    })
    setExpandedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() + 1)
      return d
    })
    setExpandedDate(null)
  }

  const monthName = useMemo(
    () =>
      currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    [currentMonth]
  )

  const now = new Date()
  const isCurrentMonth =
    now.getFullYear() === currentMonth.getFullYear() &&
    now.getMonth() === currentMonth.getMonth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl text-gray-700">Caricamento mance...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button
          type="button"
          onClick={() => void loadTips()}
          className="block mt-2 text-sm underline"
        >
          Riprova
        </button>
      </div>
    )
  }

  const summary = data?.summary ?? { total: 0, daysWithTips: 0, averageDaily: 0 }
  const byDay = data?.byDay ?? []
  const byLocation = data?.byLocation ?? []

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-3 items-center">
          <div className="text-left text-sm text-gray-700">mese</div>
          <div className="text-center">
            <h2
              className={`text-2xl font-semibold capitalize mb-1 ${
                isCurrentMonth ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {data?.monthLabel ?? monthName}
            </h2>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              aria-label="Mese precedente"
            >
              <span className="text-xl">←</span>
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              aria-label="Mese successivo"
            >
              <span className="text-xl">→</span>
            </button>
          </div>
        </div>

        {!data?.employee && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Nessun profilo Employee collegato al tuo account. Le mance compaiono quando nome utente e
            dipendente coincidono.
          </p>
        )}

        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-orange-50 text-center">
            <div className="text-sm text-gray-600 mb-1">Totale mese</div>
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(summary.total)}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-green-50 text-center">
            <div className="text-sm text-gray-600 mb-1">Giorni con mance</div>
            <div className="text-2xl font-bold text-green-700">{summary.daysWithTips}</div>
          </div>
          <div className="p-4 rounded-lg border bg-blue-50 text-center">
            <div className="text-sm text-gray-600 mb-1">Media giornaliera</div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(summary.averageDaily)}
            </div>
          </div>
        </div>

        {byLocation.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Per location</h3>
            <div className="flex flex-wrap gap-2">
              {byLocation.map((loc) => (
                <span
                  key={loc.locationId}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                >
                  <span className="text-gray-600">{loc.locationName}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(loc.total)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Dettaglio giornaliero</h3>
          <p className="text-sm text-gray-500 mt-1">
            Le tue quote giornaliere per location
          </p>
        </div>

        {byDay.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">Nessuna mancia distribuita in questo mese</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {byDay.map((day) => {
              const isOpen = expandedDate === day.date
              return (
                <li key={day.date}>
                  <button
                    type="button"
                    onClick={() => setExpandedDate(isOpen ? null : day.date)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition text-left"
                  >
                    <span className="text-gray-800 font-medium">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(day.amount)}
                      </span>
                      <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                    </span>
                  </button>
                  {isOpen && day.locations.length > 0 && (
                    <div className="px-6 pb-4 space-y-2">
                      {day.locations.map((loc) => (
                        <div
                          key={`${day.date}-${loc.locationId}`}
                          className="flex justify-between text-sm py-2 px-3 bg-gray-50 rounded"
                        >
                          <span className="text-gray-600">{loc.locationName}</span>
                          <span className="font-medium">{formatCurrency(loc.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
