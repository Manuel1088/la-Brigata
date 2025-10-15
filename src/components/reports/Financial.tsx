'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { safeSum } from '@/lib/formatNumber'

interface FinancialReport {
  id: string
  type: 'tips' | 'sales' | 'payroll' | 'expenses'
  period: string
  amount: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
  details: Record<string, number | string>
}

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year'
type ReportType = 'all' | 'tips' | 'sales' | 'payroll' | 'expenses'

export default function ReportsFinancial() {
  const { notifyCustom } = useNotifications()
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month')
  const [selectedType, setSelectedType] = useState<ReportType>('all')

  const loadFinancialReports = useCallback(async () => {
    try {
      setLoading(true)
      // TODO: Sostituire con chiamata API reale
      // const response = await fetch(`/api/reports/financial?period=${selectedPeriod}`)
      // const data = await response.json()
      // setReports(data.reports)
      
      // Mock data temporaneo
      await new Promise(resolve => setTimeout(resolve, 500))
      const mockReports: FinancialReport[] = [
        {
          id: '1',
          type: 'tips',
          period: '2024-10',
          amount: 12500.00,
          trend: 'up',
          percentage: 12.5,
          details: {
            dailyAverage: 403.23,
            totalEntries: 31,
            topDay: '2024-10-15',
            topDayAmount: 650.00
          }
        },
        {
          id: '2',
          type: 'sales',
          period: '2024-10',
          amount: 45000.00,
          trend: 'up',
          percentage: 8.3,
          details: {
            dailyAverage: 1451.61,
            totalOrders: 312,
            averageOrder: 144.23,
            peakHour: '20:00'
          }
        },
        {
          id: '3',
          type: 'payroll',
          period: '2024-10',
          amount: 18500.00,
          trend: 'stable',
          percentage: 0.0,
          details: {
            totalHours: 740,
            averageHourlyRate: 25.00,
            overtimeHours: 45,
            overtimeAmount: 1687.50
          }
        },
        {
          id: '4',
          type: 'expenses',
          period: '2024-10',
          amount: 8500.00,
          trend: 'down',
          percentage: -5.2,
          details: {
            supplies: 3200.00,
            utilities: 1200.00,
            maintenance: 800.00,
            other: 3300.00
          }
        }
      ]
      
      setReports(mockReports)
    } catch (error) {
      console.error('Errore nel caricamento report finanziari:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Errore', 'Errore nel caricamento report finanziari')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, notifyCustom])

  useEffect(() => {
    void loadFinancialReports()
  }, [loadFinancialReports])

  const handleExport = async (reportType: string, format: 'csv' | 'pdf' = 'csv') => {
    try {
      // TODO: Implementare export reale
      // const response = await fetch(`/api/reports/export`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type: reportType, period: selectedPeriod, format })
      // })
      // const blob = await response.blob()
      // const url = window.URL.createObjectURL(blob)
      // const a = document.createElement('a')
      // a.href = url
      // a.download = `report-${reportType}-${selectedPeriod}.${format}`
      // a.click()
      // window.URL.revokeObjectURL(url)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      notifyCustom('SUCCESS', 'SYSTEM', 'Export Completato', `Report ${reportType} esportato con successo`)
    } catch (error) {
      console.error('Export error:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Errore Export', 'Errore nell\'esportazione del report')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tips': return '💰'
      case 'sales': return '💳'
      case 'payroll': return '👥'
      case 'expenses': return '📉'
      default: return '📊'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tips': return 'Mance'
      case 'sales': return 'Vendite'
      case 'payroll': return 'Stipendi'
      case 'expenses': return 'Spese'
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

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '€0,00'
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  // Memoized calculations
  const filteredReports = useMemo(() => 
    reports.filter(report => 
      selectedType === 'all' || report.type === selectedType
    ), 
    [reports, selectedType]
  )

  const totalAmount = useMemo(() => 
    safeSum(...filteredReports.map(report => report.amount)),
    [filteredReports]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl text-gray-700">Caricamento report finanziari...</div>
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
              onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Questa Settimana</option>
              <option value="month">Questo Mese</option>
              <option value="quarter">Questo Trimestre</option>
              <option value="year">Quest&apos;Anno</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ReportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="tips">Mance</option>
              <option value="sales">Vendite</option>
              <option value="payroll">Stipendi</option>
              <option value="expenses">Spese</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadFinancialReports}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Riepilogo Totale */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Totale Finanziario</h3>
            <p className="text-green-100">
              Periodo selezionato: {selectedPeriod}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
            <div className="text-green-100">Totale {getTypeLabel(selectedType)}</div>
          </div>
        </div>
      </div>

      {/* Lista Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReports.map(report => (
          <div key={report.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getTypeIcon(report.type)}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getTypeLabel(report.type)}
                  </h3>
                  <p className="text-gray-600">Periodo: {report.period}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(report.amount)}
                </div>
                <div className={`flex items-center gap-1 ${getTrendColor(report.trend)}`}>
                  <span>{getTrendIcon(report.trend)}</span>
                  <span className="text-sm font-medium">
                    {report.percentage > 0 ? '+' : ''}{report.percentage}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Dettagli */}
            <div className="space-y-3 mb-4">
              {report.type === 'tips' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Media giornaliera:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.dailyAverage))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giorno migliore:</span>
                    <span className="font-medium">{report.details.topDay} ({formatCurrency(Number(report.details.topDayAmount))})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Totale entrate:</span>
                    <span className="font-medium">{report.details.totalEntries}</span>
                  </div>
                </>
              )}
              
              {report.type === 'sales' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Media giornaliera:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.dailyAverage))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ordini totali:</span>
                    <span className="font-medium">{report.details.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ticket medio:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.averageOrder))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ora di punta:</span>
                    <span className="font-medium">{report.details.peakHour}</span>
                  </div>
                </>
              )}
              
              {report.type === 'payroll' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ore totali:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.totalHours))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tariffa media:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.averageHourlyRate))}/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ore straordinarie:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.overtimeHours))}h ({formatCurrency(Number(report.details.overtimeAmount))})</span>
                  </div>
                </>
              )}
              
              {report.type === 'expenses' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Forniture:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.supplies))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilità:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.utilities))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manutenzione:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.maintenance))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Altro:</span>
                    <span className="font-medium">{formatCurrency(Number(report.details.other))}</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Azioni */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(report.type)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                📤 Esporta
              </button>
              <button
                onClick={() => {
                  // TODO: Implementa visualizzazione dettagli
                  console.log('View details for', report.type)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                👁️ Dettagli
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">💰</div>
          <p className="text-gray-500">Nessun report finanziario trovato</p>
          <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
        </div>
      )}
    </div>
  )
}