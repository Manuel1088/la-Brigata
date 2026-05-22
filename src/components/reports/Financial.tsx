'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatEuro } from '@/lib/utils'

type TipsReport = {
  year: number
  month: number
  monthLabel: string
  totals: {
    total: number
    byType: { card: number; cash: number; foreign: number }
    byLocation: Array<{ locationId: string; locationName: string; total: number }>
  }
  stats: {
    dailyAverage: number
    daysWithTips: number
    bestDay: { date: string; amount: number } | null
  }
  comparison: {
    previousMonth: { year: number; month: number; total: number }
    changeAmount: number
    changePercent: number
    trend: 'up' | 'down' | 'stable'
  }
}

export default function ReportsFinancial() {
  const { notifyCustom } = useNotifications()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [report, setReport] = useState<TipsReport | null>(null)
  const [loading, setLoading] = useState(true)

  const loadFinancialReports = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports/tips?year=${year}&month=${month}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore caricamento report')
      }
      setReport(data as TipsReport)
    } catch (error) {
      console.error('Errore nel caricamento report finanziari:', error)
      setReport(null)
      notifyCustom('ERROR', 'SYSTEM', 'Errore', 'Errore nel caricamento report mance')
    } finally {
      setLoading(false)
    }
  }, [year, month, notifyCustom])

  useEffect(() => {
    void loadFinancialReports()
  }, [loadFinancialReports])

  const trendLabel = useMemo(() => {
    if (!report) return ''
    const { trend, changePercent } = report.comparison
    const sign = changePercent > 0 ? '+' : ''
    if (trend === 'up') return `${sign}${changePercent}% vs mese precedente`
    if (trend === 'down') return `${sign}${changePercent}% vs mese precedente`
    return 'Stabile vs mese precedente'
  }, [report])

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: new Date(2000, i, 1).toLocaleDateString('it-IT', { month: 'long' }),
    }))
  }, [])

  const yearOptions = useMemo(() => {
    const y = now.getFullYear()
    return [y - 1, y, y + 1]
  }, [now])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl text-gray-700">Caricamento report mance...</div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nessun dato disponibile per il periodo selezionato.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mese
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anno
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => void loadFinancialReports()}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Aggiorna
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-bold mb-1">Mance — {report.monthLabel}</h3>
            <p className="text-green-100">{trendLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {formatEuro(report.totals.total)}
            </div>
            <div className="text-green-100">Totale mese</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Per tipo di pagamento
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Carta</span>
              <span className="font-medium">
                {formatEuro(report.totals.byType.card)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contanti</span>
              <span className="font-medium">
                {formatEuro(report.totals.byType.cash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valuta estera</span>
              <span className="font-medium">
                {formatEuro(report.totals.byType.foreign)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Media giornaliera</span>
              <span className="font-medium">
                {formatEuro(report.stats.dailyAverage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Giorni con mance</span>
              <span className="font-medium">{report.stats.daysWithTips}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Giorno migliore</span>
              <span className="font-medium">
                {report.stats.bestDay
                  ? `${new Date(report.stats.bestDay.date).toLocaleDateString('it-IT')} (${formatEuro(report.stats.bestDay.amount)})`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mese precedente</span>
              <span className="font-medium">
                {formatEuro(report.comparison.previousMonth.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {report.totals.byLocation.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Per location
          </h3>
          <div className="space-y-2">
            {report.totals.byLocation.map((loc) => (
              <div
                key={loc.locationId}
                className="flex justify-between border-b border-gray-100 pb-2 last:border-0"
              >
                <span className="text-gray-700">{loc.locationName}</span>
                <span className="font-medium">{formatEuro(loc.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.totals.total === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nessuna mancia registrata per questo periodo.
        </div>
      )}
    </div>
  )
}
