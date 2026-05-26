'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatEuro } from '@/lib/utils'

type TipsMyResponse = {
  employee: { id: string; name: string; score: number } | null
  month: number
  year: number
  monthLabel: string
  summary: {
    total: number
    cash: number
    card: number
    foreign: number
    daysWithTips: number
    averageDaily: number
  }
  byDay: Array<{
    date: string
    amount: number
    locations: Array<{ locationId: string; locationName: string; amount: number }>
  }>
}

const statCardClass = 'bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col'

type MyTipsTabProps = {
  currentMonth: Date
}

export default function MyTipsTab({ currentMonth }: MyTipsTabProps) {
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
      setData((await res.json()) as TipsMyResponse)
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

  useEffect(() => {
    setExpandedDate(null)
  }, [year, month])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-600">Caricamento mance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button type="button" onClick={() => void loadTips()} className="block mt-2 text-sm underline">
          Riprova
        </button>
      </div>
    )
  }

  const summary = data?.summary ?? {
    total: 0,
    cash: 0,
    card: 0,
    foreign: 0,
    daysWithTips: 0,
    averageDaily: 0,
  }
  const byDay = data?.byDay ?? []
  const cashTotal = summary.cash + summary.foreign

  return (
    <div className="space-y-6">
      {!data?.employee && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Nessun profilo Employee collegato al tuo account. Le mance compaiono quando nome utente e
          dipendente coincidono.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${statCardClass} border-t-4 border-emerald-500`}>
          <p className="text-sm text-gray-600">Contanti</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatEuro(cashTotal)}</p>
          {summary.foreign > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              incl. estere {formatEuro(summary.foreign)}
            </p>
          )}
        </div>
        <div className={`${statCardClass} border-t-4 border-blue-500`}>
          <p className="text-sm text-gray-600">Carta</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatEuro(summary.card)}</p>
        </div>
        <div className={`${statCardClass} border-t-4 border-orange-500`}>
          <p className="text-sm text-gray-600">Totale</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatEuro(summary.total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.daysWithTips} giorn{summary.daysWithTips === 1 ? 'o' : 'i'} con mance
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Dettaglio giornaliero</h3>
          <p className="text-sm text-gray-500 mt-1">Le tue quote per giorno e location</p>
        </div>
        {byDay.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">
            Nessuna mancia distribuita in questo mese
          </p>
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
                        {formatEuro(day.amount)}
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
                          <span className="font-medium">{formatEuro(loc.amount)}</span>
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
