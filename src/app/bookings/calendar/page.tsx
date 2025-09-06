'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'

interface Booking {
  id: string
  customerName: string
  customerPhone: string
  date: string
  time: string
  partySize: number
  tableNumber: number | null
  status: string
  notes: string
}

interface CalendarDay {
  date: string
  bookings: Booking[]
  totalGuests: number
  occupancy: number
}

export default function BookingCalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Carica dati
  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    generateCalendar()
  }, [bookings, currentMonth])

  const loadBookings = () => {
    // Dati mock per demo - in produzione verranno caricati dal database
    setBookings([
      {
        id: '1',
        customerName: 'Rossi',
        customerPhone: '+39 123 456 7890',
        date: '2024-01-15',
        time: '19:30',
        partySize: 4,
        tableNumber: 5,
        status: 'confirmed',
        notes: 'Anniversario di matrimonio'
      },
      {
        id: '2',
        customerName: 'Bianchi',
        customerPhone: '+39 098 765 4321',
        date: '2024-01-15',
        time: '20:00',
        partySize: 2,
        tableNumber: 3,
        status: 'confirmed',
        notes: ''
      },
      {
        id: '3',
        customerName: 'Verdi',
        customerPhone: '+39 555 123 4567',
        date: '2024-01-16',
        time: '19:00',
        partySize: 6,
        tableNumber: 8,
        status: 'pending',
        notes: 'Cena di lavoro'
      },
      {
        id: '4',
        customerName: 'Neri',
        customerPhone: '+39 333 987 6543',
        date: '2024-01-16',
        time: '20:30',
        partySize: 3,
        tableNumber: null,
        status: 'waiting',
        notes: 'In attesa di tavolo libero'
      },
      {
        id: '5',
        customerName: 'Gialli',
        customerPhone: '+39 444 555 6666',
        date: '2024-01-17',
        time: '19:30',
        partySize: 8,
        tableNumber: 7,
        status: 'confirmed',
        notes: 'Cena di gruppo'
      },
      {
        id: '6',
        customerName: 'Blu',
        customerPhone: '+39 777 888 9999',
        date: '2024-01-18',
        time: '20:00',
        partySize: 2,
        tableNumber: 1,
        status: 'confirmed',
        notes: 'Cena romantica'
      }
    ])
  }

  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    const calendar: CalendarDay[] = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateString = date.toISOString().split('T')[0]
      const dayBookings = bookings.filter(booking => booking.date === dateString)
      const totalGuests = dayBookings.reduce((sum, booking) => sum + booking.partySize, 0)
      
      // Calcola occupazione (mock - in produzione basato su tavoli disponibili)
      const maxCapacity = 50 // Capacità massima del ristorante
      const occupancy = Math.round((totalGuests / maxCapacity) * 100)
      
      calendar.push({
        date: dateString,
        bookings: dayBookings,
        totalGuests,
        occupancy
      })
    }
    
    setCalendarDays(calendar)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'waiting':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata'
      case 'pending':
        return 'In Attesa'
      case 'waiting':
        return 'In Attesa Tavolo'
      case 'cancelled':
        return 'Cancellata'
      default:
        return status
    }
  }

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 80) return 'bg-red-100 text-red-800'
    if (occupancy >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const getBookingsForDate = (date: string) => {
    return bookings.filter(booking => booking.date === date)
  }

  const getTotalBookings = () => {
    return calendarDays.reduce((sum, day) => sum + day.bookings.length, 0)
  }

  const getTotalGuests = () => {
    return calendarDays.reduce((sum, day) => sum + day.totalGuests, 0)
  }

  const getAverageOccupancy = () => {
    const totalOccupancy = calendarDays.reduce((sum, day) => sum + day.occupancy, 0)
    return Math.round(totalOccupancy / calendarDays.length)
  }

  return (
    <PermissionGuard permission="turni_manage">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  📅 Calendario Prenotazioni
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/bookings')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  📋 Lista Prenotazioni
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Statistiche Mensili */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📅</div>
                <h3 className="text-lg font-semibold mb-2">Prenotazioni Totali</h3>
                <p className="text-2xl font-bold text-blue-600">{getTotalBookings()}</p>
                <p className="text-sm text-gray-500">Questo mese</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="text-lg font-semibold mb-2">Coperti Totali</h3>
                <p className="text-2xl font-bold text-green-600">{getTotalGuests()}</p>
                <p className="text-sm text-gray-500">Questo mese</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">Occupazione Media</h3>
                <p className="text-2xl font-bold text-orange-600">{getAverageOccupancy()}%</p>
                <p className="text-sm text-gray-500">Questo mese</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="text-lg font-semibold mb-2">Media Giornaliera</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(getTotalBookings() / calendarDays.length)}
                </p>
                <p className="text-sm text-gray-500">Prenotazioni/giorno</p>
              </div>
            </div>

            {/* Navigazione Mese */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  ← Mese Precedente
                </button>
                <h2 className="text-xl font-semibold">
                  {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  Mese Successivo →
                </button>
              </div>
            </div>

            {/* Calendario */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Calendario Mensile</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {calendarDays.map((day) => (
                    <div
                      key={day.date}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedDate === day.date ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(day.date).getDate()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getOccupancyColor(day.occupancy)}`}>
                          {day.occupancy}%
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">
                          📅 {day.bookings.length} prenotazioni
                        </div>
                        <div className="text-sm text-gray-600">
                          👥 {day.totalGuests} coperti
                        </div>
                      </div>
                      
                      {day.bookings.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {day.bookings.slice(0, 2).map((booking) => (
                            <div key={booking.id} className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">{booking.customerName}</span>
                                <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(booking.status)}`}>
                                  {getStatusText(booking.status).charAt(0)}
                                </span>
                              </div>
                              <div className="text-gray-500">
                                {formatTime(booking.time)} - {booking.partySize}p
                              </div>
                            </div>
                          ))}
                          {day.bookings.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{day.bookings.length - 2} altre...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dettagli Giorno Selezionato */}
            {selectedDate && (
              <div className="mt-6 bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">
                    Prenotazioni per {formatDate(selectedDate)}
                  </h3>
                </div>
                <div className="p-6">
                  {getBookingsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-4">
                      {getBookingsForDate(selectedDate).map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-lg font-medium text-gray-900">
                                {booking.customerName}
                              </h4>
                              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}>
                                {getStatusText(booking.status)}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Ora:</span> {formatTime(booking.time)}
                              </div>
                              <div>
                                <span className="font-medium">Persone:</span> {booking.partySize}
                              </div>
                              <div>
                                <span className="font-medium">Tavolo:</span> {booking.tableNumber || 'Non assegnato'}
                              </div>
                              <div>
                                <span className="font-medium">Telefono:</span> {booking.customerPhone}
                              </div>
                            </div>
                            {booking.notes && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Note:</span> {booking.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Nessuna prenotazione per questa data
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
