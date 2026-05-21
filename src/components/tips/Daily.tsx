'use client'

import { useCallback, useEffect, useState } from 'react'

type TipEntryRow = {
  id: string
  date: string
  location: string
  locationId: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
  notes?: string | null
  createdAt?: string
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
  isPresent: boolean
}

type ByDayEmployee = {
  date: string
  amount: number
  items: DistributionRow[]
}

type ByDayManager = {
  date: string
  amount: number
  items: TipEntryRow[]
}

type EntriesResponse = {
  view: 'manager' | 'employee'
  month: number
  year: number
  monthLabel: string
  byDay: ByDayEmployee[] | ByDayManager[]
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

const typeLabel = (type: TipEntryRow['type']) =>
  type === 'cash' ? 'Contanti' : type === 'card' ? 'Carta' : 'Monete estere'

const typeColor = (type: TipEntryRow['type']) =>
  type === 'cash'
    ? 'text-green-700'
    : type === 'card'
      ? 'text-blue-700'
      : 'text-purple-700'

export default function TipsDaily() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [data, setData] = useState<EntriesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Caricamento...</div>
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

  const byDay = data?.byDay ?? []
  const isEmployee = data?.view === 'employee'
  const title = isEmployee ? '📅 Le tue mance giornaliere' : '📊 Inserimenti mance del ristorante'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1 capitalize">{data?.monthLabel}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              aria-label="Mese precedente"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              aria-label="Mese successivo"
            >
              →
            </button>
          </div>
        </div>

        <div className="p-6">
          {byDay.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {isEmployee
                ? 'Nessuna distribuzione in questo mese'
                : 'Nessuna mancia registrata in questo mese'}
            </p>
          ) : (
            <div className="space-y-6">
              {byDay.map((day) => (
                <div key={day.date} className="border rounded-lg">
                  <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                    <div className="font-medium">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </div>
                    <div className="text-sm text-gray-700">
                      Totale: <span className="font-semibold">{formatCurrency(day.amount)}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {isEmployee
                      ? (day as ByDayEmployee).items.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-white">
                                {d.locationName}
                              </span>
                              <span className="text-gray-500">
                                Punti {d.employeeScore}/{d.totalPoints} · pool{' '}
                                {formatCurrency(d.totalTips)}
                              </span>
                            </div>
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(d.amount)}
                            </div>
                          </div>
                        ))
                      : (day as ByDayManager).items.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-white">
                                {e.location}
                              </span>
                              <span className={typeColor(e.type)}>{typeLabel(e.type)}</span>
                            </div>
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(e.amount)}
                            </div>
                          </div>
                        ))}
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
