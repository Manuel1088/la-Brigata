'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

interface AnalyticsData {
  id: string
  category: 'trends' | 'predictions' | 'benchmarks' | 'insights'
  title: string
  description: string
  value: number | string
  change: number
  period: string
  details: Record<string, number | string | boolean | string[] | number[]>
}

export default function ReportsAnalytics() {
  const { notifyCustom } = useNotifications()
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('month')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const loadAnalyticsData = useCallback(async () => {
    try {
      // Mock data - in produzione verrà dal database
      const mockAnalytics: AnalyticsData[] = [
        {
          id: '1',
          category: 'trends',
          title: 'Crescita Fatturato',
          description: 'Tendenza mensile del fatturato negli ultimi 6 mesi',
          value: '+12.5%',
          change: 12.5,
          period: '2024-10',
          details: {
            currentMonth: 45000,
            previousMonth: 40000,
            averageGrowth: 8.3,
            peakMonth: '2024-08',
            peakValue: 48000,
            trend: 'upward'
          }
        },
        {
          id: '2',
          category: 'predictions',
          title: 'Previsione Prossimo Mese',
          description: 'Stima del fatturato per novembre basata sui trend',
          value: '€47,200',
          change: 4.9,
          period: '2024-11',
          details: {
            predictedRevenue: 47200,
            confidence: 85,
            factors: ['stagionalità', 'eventi locali', 'trend storici'],
            riskFactors: ['meteo avverso', 'crisi economica'],
            recommendation: 'incrementare marketing'
          }
        },
        {
          id: '3',
          category: 'benchmarks',
          title: 'Performance vs Settore',
          description: 'Confronto con la media del settore ristorazione',
          value: '+18%',
          change: 18.0,
          period: '2024-Q3',
          details: {
            industryAverage: 85,
            ourPerformance: 100,
            ranking: 'top 15%',
            keyAdvantages: ['efficienza personale', 'qualità servizio'],
            improvementAreas: ['costi operativi', 'margini']
          }
        },
        {
          id: '4',
          category: 'insights',
          title: 'Ottimizzazione Menu',
          description: 'Analisi delle performance dei piatti e raccomandazioni',
          value: '€2,400',
          change: 15.2,
          period: '2024-10',
          details: {
            potentialIncrease: 2400,
            topPerformers: ['Pasta Carbonara', 'Pizza Margherita', 'Tiramisu'],
            underPerformers: ['Risotto ai Funghi', 'Bistecca'],
            recommendations: ['promuovere piatti top', 'rivedere ricette'],
            impact: 'high'
          }
        },
        {
          id: '5',
          category: 'trends',
          title: 'Soddisfazione Clienti',
          description: 'Evoluzione del rating e feedback nel tempo',
          value: '4.6/5',
          change: 0.2,
          period: '2024-10',
          details: {
            currentRating: 4.6,
            previousRating: 4.4,
            totalReviews: 156,
            positiveTrend: true,
            topCompliments: ['servizio veloce', 'cibo delizioso'],
            improvementAreas: ['rumore ambiente', 'tempi attesa']
          }
        },
        {
          id: '6',
          category: 'predictions',
          title: 'Fabbisogno Personale',
          description: 'Previsione delle necessità di personale per il trimestre',
          value: '+2 dipendenti',
          change: 8.0,
          period: '2024-Q4',
          details: {
            currentStaff: 25,
            predictedNeed: 27,
            roles: ['cameriere', 'cuoco'],
            timeline: 'novembre 2024',
            cost: 3200,
            roi: 180
          }
        }
      ]
      
      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Errore nel caricamento analytics:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Reports Analytics', 'Errore nel caricamento analytics')
    } finally {
      setLoading(false)
    }
  }, [selectedTimeframe, notifyCustom])

  useEffect(() => {
    void loadAnalyticsData()
  }, [loadAnalyticsData])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trends': return '📈'
      case 'predictions': return '🔮'
      case 'benchmarks': return '🏆'
      case 'insights': return '💡'
      default: return '📊'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'trends': return 'Tendenze'
      case 'predictions': return 'Previsioni'
      case 'benchmarks': return 'Confronti'
      case 'insights': return 'Insights'
      default: return category
    }
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return '📈'
    if (change < 0) return '📉'
    return '➡️'
  }

  const filteredAnalytics = analytics.filter(item => {
    return selectedCategory === 'all' || item.category === selectedCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📈</div>
          <div className="text-xl text-gray-700">Caricamento analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Periodo</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Questa Settimana</option>
              <option value="month">Questo Mese</option>
              <option value="quarter">Questo Trimestre</option>
              <option value="year">Quest&apos;Anno</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutte le Categorie</option>
              <option value="trends">Tendenze</option>
              <option value="predictions">Previsioni</option>
              <option value="benchmarks">Confronti</option>
              <option value="insights">Insights</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadAnalyticsData}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Riepilogo KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['trends', 'predictions', 'benchmarks', 'insights'].map(category => {
          const categoryData = analytics.filter(a => a.category === category)
          const avgChange = categoryData.length > 0 
            ? categoryData.reduce((sum, a) => sum + a.change, 0) / categoryData.length 
            : 0
          
          return (
            <div key={category} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl">{getCategoryIcon(category)}</div>
                <div className={`flex items-center gap-1 ${getChangeColor(avgChange)}`}>
                  <span>{getChangeIcon(avgChange)}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-1">{getCategoryLabel(category)}</div>
              <div className="text-2xl font-bold text-gray-900">{categoryData.length}</div>
              <div className="text-xs text-gray-500">
                Analisi disponibili
              </div>
            </div>
          )
        })}
      </div>

      {/* Lista Analytics */}
      <div className="space-y-4">
        {filteredAnalytics.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getCategoryIcon(item.category)}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                  <p className="text-sm text-gray-500">Periodo: {item.period}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className={`flex items-center gap-1 ${getChangeColor(item.change)}`}>
                  <span>{getChangeIcon(item.change)}</span>
                  <span className="text-sm font-medium">
                    {item.change > 0 ? '+' : ''}{item.change}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Dettagli Specifici */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">📊 Dettagli</h4>
              
              {item.category === 'trends' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">€{item.details.currentMonth?.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Mese Corrente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">€{item.details.previousMonth?.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Mese Precedente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{item.details.averageGrowth}%</div>
                    <div className="text-sm text-gray-600">Crescita Media</div>
                  </div>
                </div>
              )}
              
              {item.category === 'predictions' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fiducia:</span>
                    <span className="font-medium">{item.details.confidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fattori:</span>
                    <span className="font-medium">{Array.isArray(item.details.factors) ? item.details.factors.join(', ') : String(item.details.factors || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raccomandazione:</span>
                    <span className="font-medium">{item.details.recommendation}</span>
                  </div>
                </div>
              )}
              
              {item.category === 'benchmarks' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{item.details.ourPerformance}%</div>
                    <div className="text-sm text-gray-600">La Nostra Performance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">{item.details.industryAverage}%</div>
                    <div className="text-sm text-gray-600">Media Settore</div>
                  </div>
                </div>
              )}
              
              {item.category === 'insights' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aumento Potenziale:</span>
                    <span className="font-medium">€{item.details.potentialIncrease}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Top Performers:</span>
                    <span className="font-medium">{Array.isArray(item.details.topPerformers) ? item.details.topPerformers.join(', ') : String(item.details.topPerformers || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raccomandazioni:</span>
                    <span className="font-medium">{Array.isArray(item.details.recommendations) ? item.details.recommendations.join(', ') : String(item.details.recommendations || '')}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Azioni */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Implementa esportazione
                  console.log('Export analytics', item.category)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                📤 Esporta
              </button>
              <button
                onClick={() => {
                  // Implementa visualizzazione dettagli
                  console.log('View analytics details', item.category)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                👁️ Dettagli
              </button>
              <button
                onClick={() => {
                  // Implementa azioni basate su insights
                  console.log('Take action on insights', item.category)
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                🎯 Agisci
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAnalytics.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-gray-500">Nessuna analisi trovata</p>
          <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
        </div>
      )}

      {/* Riepilogo Insights e Raccomandazioni */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">🎯 Insights e Raccomandazioni</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">✅ Punti di Forza</h4>
            <ul className="space-y-1 text-sm">
              <li>• Crescita fatturato costante (+12.5%)</li>
              <li>• Performance superiore alla media del settore</li>
              <li>• Soddisfazione clienti in aumento</li>
              <li>• Efficienza personale ottimale</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🔧 Aree di Miglioramento</h4>
            <ul className="space-y-1 text-sm">
              <li>• Ottimizzazione costi operativi</li>
              <li>• Miglioramento margini di profitto</li>
              <li>• Gestione tempi di attesa</li>
              <li>• Controllo rumore ambiente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
