'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

interface PersonnelReport {
  id: string
  type: 'attendance' | 'performance' | 'training' | 'satisfaction'
  period: string
  metric: string
  value: number
  target: number
  trend: 'up' | 'down' | 'stable'
  details: Record<string, any>
}

export default function ReportsPersonnel() {
  const { notifyCustom } = useNotifications()
  const [reports, setReports] = useState<PersonnelReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  useEffect(() => {
    loadPersonnelReports()
  }, [selectedPeriod])

  const loadPersonnelReports = async () => {
    try {
      // Mock data - in produzione verrà dal database
      const mockReports: PersonnelReport[] = [
        {
          id: '1',
          type: 'attendance',
          period: '2024-10',
          metric: 'Presenze',
          value: 94,
          target: 95,
          trend: 'up',
          details: {
            totalEmployees: 25,
            averageAttendance: 94,
            lateArrivals: 8,
            earlyDepartures: 3,
            sickDays: 12,
            vacationDays: 45
          }
        },
        {
          id: '2',
          type: 'performance',
          period: '2024-10',
          metric: 'Performance Media',
          value: 87,
          target: 85,
          trend: 'up',
          details: {
            excellentPerformers: 8,
            goodPerformers: 12,
            averagePerformers: 4,
            belowAveragePerformers: 1,
            averageRating: 4.2,
            totalEvaluations: 25
          }
        },
        {
          id: '3',
          type: 'training',
          period: '2024-10',
          metric: 'Formazione Completata',
          value: 76,
          target: 80,
          trend: 'up',
          details: {
            completedTraining: 19,
            pendingTraining: 6,
            totalTrainingHours: 156,
            averageTrainingHours: 6.24,
            certificationsEarned: 12
          }
        },
        {
          id: '4',
          type: 'satisfaction',
          period: '2024-10',
          metric: 'Soddisfazione',
          value: 4.3,
          target: 4.0,
          trend: 'stable',
          details: {
            averageSatisfaction: 4.3,
            verySatisfied: 18,
            satisfied: 6,
            neutral: 1,
            dissatisfied: 0,
            responseRate: 92
          }
        }
      ]
      
      setReports(mockReports)
    } catch (error) {
      console.error('Errore nel caricamento report personale:', error)
      notifyCustom('Errore nel caricamento report personale', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'attendance': return '👥'
      case 'performance': return '⭐'
      case 'training': return '🎓'
      case 'satisfaction': return '😊'
      default: return '📊'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'attendance': return 'Presenze'
      case 'performance': return 'Performance'
      case 'training': return 'Formazione'
      case 'satisfaction': return 'Soddisfazione'
      default: return type
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

  const getPerformanceColor = (value: number, target: number) => {
    if (value >= target) return 'text-green-600'
    if (value >= target * 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">👥</div>
          <div className="text-xl text-gray-700">Caricamento report personale...</div>
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
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Questa Settimana</option>
              <option value="month">Questo Mese</option>
              <option value="quarter">Questo Trimestre</option>
              <option value="year">Quest\'Anno</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reparto</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti i Reparti</option>
              <option value="kitchen">Cucina</option>
              <option value="service">Sala</option>
              <option value="bar">Bar</option>
              <option value="management">Management</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadPersonnelReports}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Riepilogo KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map(report => (
          <div key={report.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">{getTypeIcon(report.type)}</div>
              <div className={`flex items-center gap-1 ${getTrendColor(report.trend)}`}>
                <span>{getTrendIcon(report.trend)}</span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">{report.metric}</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(report.value, report.target)}`}>
              {report.value}{report.type === 'satisfaction' ? '/5' : '%'}
            </div>
            <div className="text-xs text-gray-500">
              Target: {report.target}{report.type === 'satisfaction' ? '/5' : '%'}
            </div>
          </div>
        ))}
      </div>

      {/* Lista Report Dettagliati */}
      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getTypeIcon(report.type)}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getTypeLabel(report.type)} - {report.metric}
                  </h3>
                  <p className="text-gray-600">Periodo: {report.period}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${getPerformanceColor(report.value, report.target)}`}>
                  {report.value}{report.type === 'satisfaction' ? '/5' : '%'}
                </div>
                <div className={`flex items-center gap-1 ${getTrendColor(report.trend)}`}>
                  <span>{getTrendIcon(report.trend)}</span>
                  <span className="text-sm">vs target</span>
                </div>
              </div>
            </div>
            
            {/* Dettagli Specifici */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {report.type === 'attendance' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.totalEmployees}</div>
                    <div className="text-sm text-gray-600">Dipendenti Totali</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.averageAttendance}%</div>
                    <div className="text-sm text-gray-600">Presenze Medie</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.details.lateArrivals}</div>
                    <div className="text-sm text-gray-600">Ritardi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.sickDays}</div>
                    <div className="text-sm text-gray-600">Giorni Malattia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{report.details.vacationDays}</div>
                    <div className="text-sm text-gray-600">Giorni Ferie</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{report.details.earlyDepartures}</div>
                    <div className="text-sm text-gray-600">Uscite Anticipate</div>
                  </div>
                </>
              )}
              
              {report.type === 'performance' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.totalEvaluations}</div>
                    <div className="text-sm text-gray-600">Valutazioni</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.excellentPerformers}</div>
                    <div className="text-sm text-gray-600">Eccellenti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.goodPerformers}</div>
                    <div className="text-sm text-gray-600">Buoni</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{report.details.averagePerformers}</div>
                    <div className="text-sm text-gray-600">Medi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.details.belowAveragePerformers}</div>
                    <div className="text-sm text-gray-600">Sotto Media</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{report.details.averageRating}</div>
                    <div className="text-sm text-gray-600">Rating Medio</div>
                  </div>
                </>
              )}
              
              {report.type === 'training' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.completedTraining}</div>
                    <div className="text-sm text-gray-600">Completati</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.pendingTraining}</div>
                    <div className="text-sm text-gray-600">In Corso</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.totalTrainingHours}h</div>
                    <div className="text-sm text-gray-600">Ore Totali</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{report.details.averageTrainingHours}h</div>
                    <div className="text-sm text-gray-600">Ore Medie/Dipendente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{report.details.certificationsEarned}</div>
                    <div className="text-sm text-gray-600">Certificazioni</div>
                  </div>
                </>
              )}
              
              {report.type === 'satisfaction' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.responseRate}%</div>
                    <div className="text-sm text-gray-600">Tasso Risposta</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.verySatisfied}</div>
                    <div className="text-sm text-gray-600">Molto Soddisfatti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.satisfied}</div>
                    <div className="text-sm text-gray-600">Soddisfatti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{report.details.neutral}</div>
                    <div className="text-sm text-gray-600">Neutri</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.details.dissatisfied}</div>
                    <div className="text-sm text-gray-600">Insoddisfatti</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Azioni */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Implementa esportazione
                  console.log('Export personnel report', report.type)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                📤 Esporta
              </button>
              <button
                onClick={() => {
                  // Implementa visualizzazione dettagli
                  console.log('View personnel details', report.type)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                👁️ Dettagli
              </button>
              <button
                onClick={() => {
                  // Implementa azioni correttive
                  console.log('Take action on', report.type)
                }}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                🔧 Azioni
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Riepilogo Azioni Raccomandate */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">🎯 Azioni Raccomandate</h3>
        <div className="space-y-2">
          {reports.filter(r => r.value < r.target).map(report => (
            <div key={report.id} className="flex items-center justify-between bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span>{getTypeIcon(report.type)}</span>
                <span className="font-medium">{getTypeLabel(report.type)}</span>
                <span className="text-sm opacity-90">
                  (Attuale: {report.value}{report.type === 'satisfaction' ? '/5' : '%'}, Target: {report.target}{report.type === 'satisfaction' ? '/5' : '%'})
                </span>
              </div>
              <button
                onClick={() => {
                  console.log('Take action on', report.type)
                }}
                className="px-3 py-1 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition text-sm"
              >
                Agisci
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
