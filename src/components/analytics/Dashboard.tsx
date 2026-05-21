'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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
  dailySeries: Array<{
    date: string
    label: string
    card: number
    cash: number
    foreign: number
    total: number
  }>
  comparison: {
    changePercent: number
    trend: 'up' | 'down' | 'stable'
  }
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b']

export default function AnalyticsDashboard() {
  const { notifyCustom } = useNotifications()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [report, setReport] = useState<TipsReport | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboardMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports/tips?year=${year}&month=${month}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore caricamento')
      }
      setReport(data as TipsReport)
    } catch (error) {
      console.error('Errore nel caricamento metriche dashboard:', error)
      setReport(null)
      notifyCustom('ERROR', 'SYSTEM', 'Analytics', 'Errore nel caricamento dati mance')
    } finally {
      setLoading(false)
    }
  }, [year, month, notifyCustom])

  useEffect(() => {
    void loadDashboardMetrics()
  }, [loadDashboardMetrics])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)

  const pieData = useMemo(() => {
    if (!report) return []
    const { card, cash, foreign } = report.totals.byType
    return [
      { name: 'Carta', value: card },
      { name: 'Contanti', value: cash },
      { name: 'Estere', value: foreign },
    ].filter((d) => d.value > 0)
  }, [report])

  const barData = useMemo(() => {
    if (!report) return []
    return report.dailySeries.filter((d) => d.total > 0)
  }, [report])

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: new Date(2000, i, 1).toLocaleDateString('it-IT', { month: 'long' }),
      })),
    []
  )

  const trendColor =
    report?.comparison.trend === 'up'
      ? 'text-green-600'
      : report?.comparison.trend === 'down'
        ? 'text-red-600'
        : 'text-gray-600'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl text-gray-700">Caricamento dashboard analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mese
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => void loadDashboardMetrics()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition self-end"
            >
              Aggiorna
            </button>
          </div>
          <div className="text-right text-sm text-gray-600">
            Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}
          </div>
        </div>
      </div>

      {!report ? (
        <div className="text-center py-12 text-gray-500">
          Impossibile caricare i dati analytics.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Totale mance</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(report.totals.total)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{report.monthLabel}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Media giornaliera</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(report.stats.dailyAverage)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {report.stats.daysWithTips} giorni con mance
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
              <div className="text-sm text-gray-600">Giorno migliore</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {report.stats.bestDay
                  ? formatCurrency(report.stats.bestDay.amount)
                  : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {report.stats.bestDay
                  ? new Date(report.stats.bestDay.date).toLocaleDateString('it-IT')
                  : 'Nessun dato'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-orange-500">
              <div className="text-sm text-gray-600">Vs mese precedente</div>
              <div className={`text-2xl font-bold mt-1 ${trendColor}`}>
                {report.comparison.changePercent > 0 ? '+' : ''}
                {report.comparison.changePercent}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {report.comparison.trend === 'up'
                  ? 'In crescita'
                  : report.comparison.trend === 'down'
                    ? 'In calo'
                    : 'Stabile'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mance per giorno
              </h3>
              {barData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  Nessuna mancia nel periodo selezionato
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `€${v}`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        formatCurrency(Number(value ?? 0))
                      }
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { date?: string }
                        return p?.date
                          ? new Date(p.date).toLocaleDateString('it-IT', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })
                          : ''
                      }}
                    />
                    <Bar dataKey="total" name="Totale" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ripartizione per tipo pagamento
              </h3>
              {pieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  Nessuna mancia nel periodo selezionato
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
