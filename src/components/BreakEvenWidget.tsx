'use client'
import { useState, useEffect } from 'react'
import { 
  calculateDailyForecast, 
  getBreakEvenAnalysis,
  getWeeklyForecast,
  getAllCompanyEvents,
  DailyForecast,
  CompanyEvent
} from '@/lib/breakEvenCalculator'

interface BreakEvenWidgetProps {
  userId?: string
  userRole?: string
}

export function BreakEvenWidget({ userId, userRole }: BreakEvenWidgetProps) {
  const [todayForecast, setTodayForecast] = useState<DailyForecast | null>(null)
  const [breakEvenAnalysis, setBreakEvenAnalysis] = useState<any>(null)
  const [weeklyForecast, setWeeklyForecast] = useState<DailyForecast[]>([])
  const [companyEvents, setCompanyEvents] = useState<CompanyEvent[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = () => {
    const today = new Date().toISOString().split('T')[0]
    const forecast = calculateDailyForecast(selectedDate)
    const analysis = getBreakEvenAnalysis(selectedDate)
    const weekly = getWeeklyForecast(today)
    const events = getAllCompanyEvents()
    
    setTodayForecast(forecast)
    setBreakEvenAnalysis(analysis)
    setWeeklyForecast(weekly)
    setCompanyEvents(events)
  }

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '€0,00'
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'profitable': return 'text-green-600 bg-green-100'
      case 'break-even': return 'text-yellow-600 bg-yellow-100'
      case 'loss': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'profitable': return '📈'
      case 'break-even': return '⚖️'
      case 'loss': return '📉'
      default: return '📊'
    }
  }

  if (!todayForecast || !breakEvenAnalysis) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">💰 Break-Even Point</h3>
          <p className="text-sm text-gray-600">
            {new Date(selectedDate).toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(breakEvenAnalysis.currentStatus)}`}>
          {getStatusIcon(breakEvenAnalysis.currentStatus)} {breakEvenAnalysis.currentStatus.toUpperCase()}
        </div>
      </div>

      {/* Eventi del giorno */}
      {todayForecast.isEventDay && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-blue-600 text-lg mr-2">🎉</span>
            <div>
              <p className="text-sm font-medium text-blue-800">Giorno Evento Speciale</p>
              <p className="text-xs text-blue-600">
                Moltiplicatore coperti: {todayForecast.eventMultiplier}x
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metriche principali */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {todayForecast.breakEvenCovers}
          </div>
          <div className="text-xs text-gray-500">Coperti per Break-Even</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(todayForecast.breakEvenRevenue)}
          </div>
          <div className="text-xs text-gray-500">Ricavi Break-Even</div>
        </div>
      </div>

      {/* Previsioni vs Break-Even */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Previsioni Oggi</span>
          <span className="text-sm text-gray-500">
            {todayForecast.expectedCovers} coperti
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              todayForecast.expectedCovers >= todayForecast.breakEvenCovers 
                ? 'bg-green-500' 
                : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.min((todayForecast.expectedCovers / todayForecast.breakEvenCovers) * 100, 100)}%` 
            }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{formatCurrency(todayForecast.expectedRevenue)}</span>
        </div>
      </div>

      {/* Analisi dettagliata */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Costi Dipendenti</span>
          <span className="text-sm font-medium">{formatCurrency(todayForecast.totalEmployeeCost)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Costi Fissi</span>
          <span className="text-sm font-medium">{formatCurrency(todayForecast.fixedCosts)}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-sm font-medium text-gray-900">Totale Costi</span>
          <span className="text-sm font-bold">{formatCurrency((todayForecast.totalEmployeeCost || 0) + (todayForecast.fixedCosts || 0))}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Ticket Medio</span>
          <span className="text-sm font-medium">{formatCurrency(todayForecast.averageTicket)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Margine Profitto</span>
          <span className={`text-sm font-medium ${
            todayForecast.profitMargin > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {isNaN(todayForecast.profitMargin) ? '0.0' : todayForecast.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Raccomandazioni */}
      {breakEvenAnalysis.recommendations.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 Raccomandazioni</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            {breakEvenAnalysis.recommendations.map((rec: string, index: number) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Previsione settimanale (solo per Direttore e Manager) */}
      {(userRole === 'DIRETTORE' || userRole === 'MANAGER') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">📅 Previsione Settimanale</h4>
          <div className="space-y-2">
            {weeklyForecast.slice(0, 3).map((day, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className="text-gray-600">
                  {new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                </span>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded ${
                    day.expectedCovers >= day.breakEvenCovers 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {day.expectedCovers}/{day.breakEvenCovers}
                  </span>
                  <span className="text-gray-500">
                    {formatCurrency(day.expectedRevenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
