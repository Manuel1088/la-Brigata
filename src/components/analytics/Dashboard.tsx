'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

interface DashboardMetric {
  id: string
  title: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  icon: string
  color: string
  details: Record<string, any>
}

export default function AnalyticsDashboard() {
  const { notifyCustom } = useNotifications()
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  useEffect(() => {
    loadDashboardMetrics()
  }, [selectedPeriod])

  const loadDashboardMetrics = async () => {
    try {
      // Mock data - in produzione verrà dal database
      const mockMetrics: DashboardMetric[] = [
        {
          id: '1',
          title: 'Fatturato Totale',
          value: 45200,
          change: 12.5,
          trend: 'up',
          icon: '💰',
          color: 'green',
          details: {
            previous: 40200,
            target: 45000,
            dailyAverage: 1458,
            peakDay: 2100
          }
        },
        {
          id: '2',
          title: 'Clienti Unici',
          value: 1248,
          change: 8.3,
          trend: 'up',
          icon: '👥',
          color: 'blue',
          details: {
            newCustomers: 156,
            returningCustomers: 1092,
            averageVisits: 2.3,
            retentionRate: 78
          }
        },
        {
          id: '3',
          title: 'Efficienza Operativa',
          value: 87,
          change: -2.1,
          trend: 'down',
          icon: '⚡',
          color: 'yellow',
          details: {
            tableTurnover: 2.3,
            serviceTime: 42,
            kitchenEfficiency: 92,
            staffUtilization: 89
          }
        },
        {
          id: '4',
          title: 'Soddisfazione Clienti',
          value: 4.6,
          change: 0.2,
          trend: 'up',
          icon: '⭐',
          color: 'purple',
          details: {
            totalReviews: 156,
            fiveStar: 89,
            fourStar: 45,
            threeStar: 18,
            complaints: 4
          }
        },
        {
          id: '5',
          title: 'Margine di Profitto',
          value: 18.5,
          change: 1.8,
          trend: 'up',
          icon: '📈',
          color: 'green',
          details: {
            grossMargin: 32.4,
            netMargin: 18.5,
            foodCost: 28.6,
            laborCost: 35.2
          }
        },
        {
          id: '6',
          title: 'Crescita Mensile',
          value: 15.2,
          change: 3.4,
          trend: 'up',
          icon: '🚀',
          color: 'blue',
          details: {
            revenueGrowth: 15.2,
            customerGrowth: 12.8,
            orderGrowth: 18.6,
            profitGrowth: 22.1
          }
        }
      ]
      
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Errore nel caricamento metriche dashboard:', error)
      notifyCustom('Errore nel caricamento metriche dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      case 'stable': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➡️'
      default: return '➡️'
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200'
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatValue = (value: number, title: string) => {
    if (title.includes('Fatturato') || title.includes('Profitto')) {
      return `€${value.toLocaleString()}`
    }
    if (title.includes('Soddisfazione')) {
      return `${value}/5`
    }
    if (title.includes('Efficienza') || title.includes('Crescita') || title.includes('Margine')) {
      return `${value}%`
    }
    return value.toLocaleString()
  }

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
      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Periodo</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="week">Questa Settimana</option>
                <option value="month">Questo Mese</option>
                <option value="quarter">Questo Trimestre</option>
                <option value="year">Quest\'Anno</option>
              </select>
            </div>
            
            <button
              onClick={loadDashboardMetrics}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">Ultimo aggiornamento</div>
            <div className="font-medium">{new Date().toLocaleString('it-IT')}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map(metric => (
          <div key={metric.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg border-2 ${getColorClasses(metric.color)}`}>
                <div className="text-2xl">{metric.icon}</div>
              </div>
              <div className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
                <span>{getTrendIcon(metric.trend)}</span>
                <span className="text-sm font-medium">
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{metric.title}</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatValue(metric.value, metric.title)}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className={`h-2 rounded-full ${
                    metric.color === 'green' ? 'bg-green-500' :
                    metric.color === 'blue' ? 'bg-blue-500' :
                    metric.color === 'yellow' ? 'bg-yellow-500' :
                    metric.color === 'purple' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}
                  style={{ width: `${Math.min(Math.abs(metric.change) * 10, 100)}%` }}
                ></div>
              </div>
              
              {/* Dettagli Rapidi */}
              <div className="space-y-1 text-sm text-gray-600">
                {metric.title === 'Fatturato Totale' && (
                  <>
                    <div>Media giornaliera: €{metric.details.dailyAverage}</div>
                    <div>Giorno migliore: €{metric.details.peakDay}</div>
                  </>
                )}
                {metric.title === 'Clienti Unici' && (
                  <>
                    <div>Nuovi clienti: {metric.details.newCustomers}</div>
                    <div>Tasso ritenzione: {metric.details.retentionRate}%</div>
                  </>
                )}
                {metric.title === 'Efficienza Operativa' && (
                  <>
                    <div>Giri tavolo: {metric.details.tableTurnover}</div>
                    <div>Tempo servizio: {metric.details.serviceTime}min</div>
                  </>
                )}
                {metric.title === 'Soddisfazione Clienti' && (
                  <>
                    <div>Recensioni totali: {metric.details.totalReviews}</div>
                    <div>5 stelle: {metric.details.fiveStar}</div>
                  </>
                )}
                {metric.title === 'Margine di Profitto' && (
                  <>
                    <div>Costo cibo: {metric.details.foodCost}%</div>
                    <div>Costo personale: {metric.details.laborCost}%</div>
                  </>
                )}
                {metric.title === 'Crescita Mensile' && (
                  <>
                    <div>Crescita clienti: {metric.details.customerGrowth}%</div>
                    <div>Crescita ordini: {metric.details.orderGrowth}%</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grafici e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Trend Fatturato</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <div>Grafico Trend (da implementare)</div>
              <div className="text-sm">Integrazione con libreria grafici</div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Insights Performance</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✅</span>
                <span className="font-semibold text-green-800">Punto di Forza</span>
              </div>
              <p className="text-green-700 text-sm">
                Il fatturato è cresciuto del 12.5% questo mese, superando l'obiettivo del 10%.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="font-semibold text-yellow-800">Attenzione</span>
              </div>
              <p className="text-yellow-700 text-sm">
                L'efficienza operativa è scesa del 2.1%. Rivedere i processi di servizio.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600">🎯</span>
                <span className="font-semibold text-blue-800">Opportunità</span>
              </div>
              <p className="text-blue-700 text-sm">
                La soddisfazione clienti è in crescita. Sfruttare per aumentare il retention rate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni Rapide */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">🚀 Azioni Rapide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => console.log('Generate report')}
            className="p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition text-left"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold">Genera Report</div>
            <div className="text-sm opacity-90">Crea report dettagliato</div>
          </button>
          
          <button
            onClick={() => console.log('View predictions')}
            className="p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition text-left"
          >
            <div className="text-2xl mb-2">🔮</div>
            <div className="font-semibold">Previsioni</div>
            <div className="text-sm opacity-90">Analisi predittiva</div>
          </button>
          
          <button
            onClick={() => console.log('Export data')}
            className="p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition text-left"
          >
            <div className="text-2xl mb-2">📤</div>
            <div className="font-semibold">Esporta Dati</div>
            <div className="text-sm opacity-90">Download analytics</div>
          </button>
        </div>
      </div>
    </div>
  )
}
