'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

interface OperationalReport {
  id: string
  type: 'shifts' | 'bookings' | 'performance' | 'efficiency'
  period: string
  metric: string
  value: number
  target: number
  status: 'good' | 'warning' | 'critical'
  details: Record<string, number | string>
}

export default function ReportsOperational() {
  const { notifyCustom } = useNotifications()
  const [reports, setReports] = useState<OperationalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('week')

  const loadOperationalReports = useCallback(async () => {
    try {
      // Mock data - in produzione verrà dal database
      const mockReports: OperationalReport[] = [
        {
          id: '1',
          type: 'shifts',
          period: '2024-W41',
          metric: 'Copertura Turni',
          value: 95,
          target: 100,
          status: 'good',
          details: {
            totalShifts: 140,
            coveredShifts: 133,
            uncoveredShifts: 7,
            lastMinuteChanges: 3,
            swapRequests: 12
          }
        },
        {
          id: '2',
          type: 'bookings',
          period: '2024-W41',
          metric: 'Occupazione Media',
          value: 78,
          target: 85,
          status: 'warning',
          details: {
            totalBookings: 156,
            noShows: 12,
            cancellations: 8,
            walkIns: 23,
            averagePartySize: 3.2
          }
        },
        {
          id: '3',
          type: 'performance',
          period: '2024-W41',
          metric: 'Tempo Servizio',
          value: 42,
          target: 35,
          status: 'warning',
          details: {
            averageServiceTime: 42,
            targetServiceTime: 35,
            slowestService: 68,
            fastestService: 28,
            complaints: 2
          }
        },
        {
          id: '4',
          type: 'efficiency',
          period: '2024-W41',
          metric: 'Produttività',
          value: 88,
          target: 90,
          status: 'good',
          details: {
            revenuePerHour: 145.50,
            revenuePerEmployee: 890.00,
            tableTurnover: 2.3,
            kitchenEfficiency: 92
          }
        }
      ]
      
      setReports(mockReports)
    } catch (error) {
      console.error('Errore nel caricamento report operativi:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Reports Operativi', 'Errore nel caricamento report operativi')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, notifyCustom])

  useEffect(() => {
    void loadOperationalReports()
  }, [loadOperationalReports])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shifts': return '⏰'
      case 'bookings': return '📅'
      case 'performance': return '🎯'
      case 'efficiency': return '⚡'
      default: return '📊'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'shifts': return 'Turni'
      case 'bookings': return 'Prenotazioni'
      case 'performance': return 'Performance'
      case 'efficiency': return 'Efficienza'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'good': return 'Buono'
      case 'warning': return 'Attenzione'
      case 'critical': return 'Critico'
      default: return status
    }
  }

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl text-gray-700">Caricamento report operativi...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadOperationalReports}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Riepilogo Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reports.map(report => (
          <div key={report.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">{getTypeIcon(report.type)}</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                {getStatusLabel(report.status)}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-1">{report.metric}</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {report.value}{report.type === 'shifts' || report.type === 'bookings' ? '%' : report.type === 'performance' ? 'min' : '%'}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressColor(report.value, report.target)}`}
                style={{ width: `${Math.min((report.value / report.target) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Target: {report.target}{report.type === 'shifts' || report.type === 'bookings' ? '%' : report.type === 'performance' ? 'min' : '%'}
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
                <div className="text-2xl font-bold text-gray-900">
                  {report.value}{report.type === 'shifts' || report.type === 'bookings' ? '%' : report.type === 'performance' ? 'min' : '%'}
                </div>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                  {getStatusLabel(report.status)}
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progresso</span>
                <span>{Math.round((report.value / report.target) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${getProgressColor(report.value, report.target)}`}
                  style={{ width: `${Math.min((report.value / report.target) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Dettagli Specifici */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {report.type === 'shifts' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.totalShifts}</div>
                    <div className="text-sm text-gray-600">Turni Totali</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.coveredShifts}</div>
                    <div className="text-sm text-gray-600">Coperti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.details.uncoveredShifts}</div>
                    <div className="text-sm text-gray-600">Scoperti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.swapRequests}</div>
                    <div className="text-sm text-gray-600">Cambi Richiesti</div>
                  </div>
                </>
              )}
              
              {report.type === 'bookings' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.totalBookings}</div>
                    <div className="text-sm text-gray-600">Prenotazioni</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.details.noShows}</div>
                    <div className="text-sm text-gray-600">No Show</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.cancellations}</div>
                    <div className="text-sm text-gray-600">Cancellazioni</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.walkIns}</div>
                    <div className="text-sm text-gray-600">Walk-in</div>
                  </div>
                </>
              )}
              
              {report.type === 'performance' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{report.details.averageServiceTime}min</div>
                    <div className="text-sm text-gray-600">Tempo Medio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.details.fastestService}min</div>
                    <div className="text-sm text-gray-600">Più Veloce</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.details.slowestService}min</div>
                    <div className="text-sm text-gray-600">Più Lento</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.details.complaints}</div>
                    <div className="text-sm text-gray-600">Reclami</div>
                  </div>
                </>
              )}
              
              {report.type === 'efficiency' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">€{report.details.revenuePerHour}</div>
                    <div className="text-sm text-gray-600">Fatturato/Ora</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">€{report.details.revenuePerEmployee}</div>
                    <div className="text-sm text-gray-600">Fatturato/Dipendente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{report.details.tableTurnover}</div>
                    <div className="text-sm text-gray-600">Giri Tavolo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{report.details.kitchenEfficiency}%</div>
                    <div className="text-sm text-gray-600">Efficienza Cucina</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Azioni */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Implementa esportazione
                  console.log('Export operational report', report.type)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                📤 Esporta
              </button>
              <button
                onClick={() => {
                  // Implementa visualizzazione dettagli
                  console.log('View operational details', report.type)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                👁️ Dettagli
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
