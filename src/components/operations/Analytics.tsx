'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useCompanyData } from '@/hooks/useCompanyData'

interface BookingStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  averagePartySize: number
  peakHours: { hour: string; count: number }[]
  popularDays: { day: string; count: number }[]
  revenueByDay: { date: string; revenue: number }[]
}

interface CustomerStats {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  vipCustomers: number
  averageVisitsPerCustomer: number
}

interface AreaStats {
  areaName: string
  bookings: number
  utilization: number
  averagePartySize: number
}

export default function OperationsAnalytics() {
  const { data: session } = useSession()
  const { data: companyData } = useCompanyData(session?.user?.id)
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    averagePartySize: 0,
    peakHours: [],
    popularDays: [],
    revenueByDay: []
  })
  const [customerStats, setCustomerStats] = useState<CustomerStats>({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    vipCustomers: 0,
    averageVisitsPerCustomer: 0
  })
  const [areaStats, setAreaStats] = useState<AreaStats[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [selectedPeriod, companyData])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      // Simula caricamento dati (in produzione sarebbe una chiamata API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Genera dati mock per demo
      generateMockData()
    } catch (error) {
      console.error('Errore nel caricamento analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockData = () => {
    // Mock booking stats
    setBookingStats({
      totalBookings: 247,
      confirmedBookings: 198,
      pendingBookings: 32,
      cancelledBookings: 17,
      averagePartySize: 3.2,
      peakHours: [
        { hour: '19:00', count: 45 },
        { hour: '20:00', count: 52 },
        { hour: '21:00', count: 38 },
        { hour: '12:30', count: 28 },
        { hour: '13:00', count: 35 }
      ],
      popularDays: [
        { day: 'Sabato', count: 89 },
        { day: 'Venerdì', count: 76 },
        { day: 'Domenica', count: 68 },
        { day: 'Giovedì', count: 45 },
        { day: 'Mercoledì', count: 38 }
      ],
      revenueByDay: [
        { date: '2025-01-01', revenue: 1250 },
        { date: '2025-01-02', revenue: 980 },
        { date: '2025-01-03', revenue: 1450 },
        { date: '2025-01-04', revenue: 1680 },
        { date: '2025-01-05', revenue: 2100 }
      ]
    })

    // Mock customer stats
    setCustomerStats({
      totalCustomers: 156,
      newCustomers: 23,
      returningCustomers: 133,
      vipCustomers: 12,
      averageVisitsPerCustomer: 4.2
    })

    // Mock area stats
    setAreaStats([
      { areaName: 'Sala Principale', bookings: 89, utilization: 85, averagePartySize: 3.5 },
      { areaName: 'Terrazza', bookings: 67, utilization: 72, averagePartySize: 2.8 },
      { areaName: 'Bar', bookings: 45, utilization: 60, averagePartySize: 2.1 },
      { areaName: 'Privé', bookings: 23, utilization: 45, averagePartySize: 6.2 }
    ])
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'week': return 'Ultima settimana'
      case 'month': return 'Ultimo mese'
      case 'quarter': return 'Ultimo trimestre'
      case 'year': return 'Ultimo anno'
      default: return 'Periodo'
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-green-600'
    if (utilization >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-2xl">📊</div>
            <div className="ml-4 text-lg text-gray-600">Caricamento analytics...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📊 Analytics Operazioni</h2>
            <p className="text-gray-600 mt-1">Analisi dettagliata delle performance del ristorante</p>
          </div>
          
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Ultima settimana</option>
            <option value="month">Ultimo mese</option>
            <option value="quarter">Ultimo trimestre</option>
            <option value="year">Ultimo anno</option>
          </select>
        </div>
      </div>

      {/* Statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{bookingStats.totalBookings}</div>
          <div className="text-sm text-blue-700">Prenotazioni Totali</div>
          <div className="text-xs text-blue-600 mt-1">{getPeriodLabel(selectedPeriod)}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{bookingStats.confirmedBookings}</div>
          <div className="text-sm text-green-700">Confermate</div>
          <div className="text-xs text-green-600 mt-1">
            {Math.round((bookingStats.confirmedBookings / bookingStats.totalBookings) * 100)}% del totale
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">{customerStats.totalCustomers}</div>
          <div className="text-sm text-purple-700">Clienti Totali</div>
          <div className="text-xs text-purple-600 mt-1">
            {customerStats.newCustomers} nuovi questo mese
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-orange-600">{bookingStats.averagePartySize}</div>
          <div className="text-sm text-orange-700">Persone/Media</div>
          <div className="text-xs text-orange-600 mt-1">per prenotazione</div>
        </div>
      </div>

      {/* Grafici e analisi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orari di punta */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🕐 Orari di Punta</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {bookingStats.peakHours.map((item, index) => (
                <div key={item.hour} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.hour}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(item.count / Math.max(...bookingStats.peakHours.map(h => h.count))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Giorni popolari */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">📅 Giorni Popolari</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {bookingStats.popularDays.map((item, index) => (
                <div key={item.day} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.day}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(item.count / Math.max(...bookingStats.popularDays.map(d => d.count))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche clienti */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">👥 Analisi Clienti</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{customerStats.totalCustomers}</div>
              <div className="text-sm text-gray-600">Clienti Totali</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{customerStats.newCustomers}</div>
              <div className="text-sm text-gray-600">Nuovi Clienti</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{customerStats.returningCustomers}</div>
              <div className="text-sm text-gray-600">Clienti Fedeli</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{customerStats.vipCustomers}</div>
              <div className="text-sm text-gray-600">Clienti VIP</div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <div className="text-lg font-medium text-gray-700">
              Media visite per cliente: <span className="text-blue-600 font-bold">{customerStats.averageVisitsPerCustomer}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance aree */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">🏢 Performance Aree</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {areaStats.map((area, index) => (
              <div key={area.areaName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{area.areaName}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{area.bookings} prenotazioni</span>
                    <span className={`font-medium ${getUtilizationColor(area.utilization)}`}>
                      {area.utilization}% utilizzo
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        area.utilization >= 80 ? 'bg-green-500' : 
                        area.utilization >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${area.utilization}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    Media {area.averagePartySize} persone
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue trend */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">💰 Trend Ricavi</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {bookingStats.revenueByDay.map((item, index) => (
              <div key={item.date} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">
                    {new Date(item.date).toLocaleDateString('it-IT', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(item.revenue / Math.max(...bookingStats.revenueByDay.map(r => r.revenue))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-20 text-right">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
