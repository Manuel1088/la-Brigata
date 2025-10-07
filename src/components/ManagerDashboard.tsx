'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface ManagerDashboardProps {
  userId: string
  userName: string
  userRole: string
}

interface Booking {
  id: string
  date: string
  time: string
  guests: number
  customerName: string
  phone: string
  status: string
  table: string
}

interface Shift {
  id: string
  date: string
  employee: string
  startTime: string
  endTime: string
  department: string
  status: string
}

interface TipReport {
  date: string
  totalTips: number
  employeeTips: { [key: string]: number }
  departmentBreakdown: { [key: string]: number }
}

interface LeaveRequest {
  id: string
  employee: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: string
  reason: string
  isUrgent: boolean
}

interface AISuggestion {
  id: string
  date: string
  suggestions: {
    employee: string
    department: string
    startTime: string
    endTime: string
    confidence: number
    reason: string
  }[]
}

export default function ManagerDashboard({ userId, userName, userRole }: ManagerDashboardProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [tipReports, setTipReports] = useState<TipReport[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day')

  // Carica dati del manager
  useEffect(() => {
    loadManagerData()
  }, [userId])

  const loadManagerData = () => {
    // Dati mock per demo - in produzione verranno caricati dal database
    setBookings([
      {
        id: '1',
        date: '2024-01-15',
        time: '19:30',
        guests: 4,
        customerName: 'Rossi',
        phone: '+39 123 456 7890',
        status: 'confirmed',
        table: 'Tavolo 5'
      },
      {
        id: '2',
        date: '2024-01-15',
        time: '20:00',
        guests: 2,
        customerName: 'Bianchi',
        phone: '+39 098 765 4321',
        status: 'confirmed',
        table: 'Tavolo 3'
      },
      {
        id: '3',
        date: '2024-01-16',
        time: '19:00',
        guests: 6,
        customerName: 'Verdi',
        phone: '+39 555 123 4567',
        status: 'pending',
        table: 'Tavolo 8'
      }
    ])

    setShifts([
      {
        id: '1',
        date: '2024-01-15',
        employee: 'Maria Cameriera',
        startTime: '09:00',
        endTime: '17:00',
        department: 'Sala',
        status: 'scheduled'
      },
      {
        id: '2',
        date: '2024-01-15',
        employee: 'Luca Barista',
        startTime: '14:00',
        endTime: '22:00',
        department: 'Bar',
        status: 'scheduled'
      },
      {
        id: '3',
        date: '2024-01-15',
        employee: 'Giuseppe Chef',
        startTime: '10:00',
        endTime: '22:00',
        department: 'Cucina',
        status: 'scheduled'
      }
    ])

    setTipReports([
      {
        date: '2024-01-15',
        totalTips: 90.60,
        employeeTips: {
          'Maria Cameriera': 45.30,
          'Luca Barista': 30.20,
          'Giuseppe Chef': 15.10
        },
        departmentBreakdown: {
          'Sala': 50.30,
          'Bar': 25.20,
          'Cucina': 15.10
        }
      }
    ])

    setLeaveRequests([
      {
        id: '1',
        employee: 'Anna Sous Chef',
        type: 'Ferie',
        startDate: '2024-03-15',
        endDate: '2024-03-20',
        days: 5,
        status: 'pending',
        reason: 'Vacanze di famiglia',
        isUrgent: false
      },
      {
        id: '2',
        employee: 'Marco Cameriere',
        type: 'ROL',
        startDate: '2024-01-20',
        endDate: '2024-01-20',
        days: 0.5,
        status: 'pending',
        reason: 'Visita medica',
        isUrgent: true
      }
    ])

    setAiSuggestions([
      {
        id: '1',
        date: '2024-01-16',
        suggestions: [
          {
            employee: 'Maria Cameriera',
            department: 'Sala',
            startTime: '09:00',
            endTime: '17:00',
            confidence: 95,
            reason: 'Storico turni + prenotazioni elevate'
          },
          {
            employee: 'Luca Barista',
            department: 'Bar',
            startTime: '14:00',
            endTime: '22:00',
            confidence: 90,
            reason: 'Copertura serale richiesta'
          }
        ]
      }
    ])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const getTotalBookings = () => {
    return bookings.length
  }

  const getConfirmedBookings = () => {
    return bookings.filter(b => b.status === 'confirmed').length
  }

  const getTotalGuests = () => {
    return bookings.reduce((sum, booking) => sum + booking.guests, 0)
  }

  const getTotalTips = () => {
    return tipReports.reduce((sum, report) => sum + report.totalTips, 0)
  }

  const getPendingLeaves = () => {
    return leaveRequests.filter(l => l.status === 'pending').length
  }

  const getUrgentLeaves = () => {
    return leaveRequests.filter(l => l.isUrgent && l.status === 'pending').length
  }

  const handleApproveLeave = (leaveId: string) => {
    setLeaveRequests(leaveRequests.map(leave => 
      leave.id === leaveId ? { ...leave, status: 'approved' } : leave
    ))
  }

  const handleRejectLeave = (leaveId: string) => {
    setLeaveRequests(leaveRequests.map(leave => 
      leave.id === leaveId ? { ...leave, status: 'rejected' } : leave
    ))
  }


  return (
    <div className="space-y-6">
      {/* Statistiche Manager */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">📅</div>
          <h3 className="text-lg font-semibold mb-2">Prenotazioni Oggi</h3>
          <p className="text-2xl font-bold text-blue-600">{getTotalBookings()}</p>
          <p className="text-sm text-gray-500">{getTotalGuests()} coperti</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-lg font-semibold mb-2">Mance Oggi</h3>
          <p className="text-2xl font-bold text-green-600">€{getTotalTips().toFixed(2)}</p>
          <p className="text-sm text-gray-500">Totale giornaliero</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">Personale Oggi</h3>
          <p className="text-2xl font-bold text-orange-600">{shifts.length}</p>
          <p className="text-sm text-gray-500">Dipendenti in servizio</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">🏖️</div>
          <h3 className="text-lg font-semibold mb-2">Richieste Ferie</h3>
          <p className="text-2xl font-bold text-purple-600">{getPendingLeaves()}</p>
          <p className="text-sm text-gray-500">{getUrgentLeaves()} urgenti</p>
        </div>
      </div>

      {/* Sezioni Principali */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Panoramica Prenotazioni */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📅 Panoramica Prenotazioni</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setSelectedPeriod('day')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedPeriod === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Giorno
              </button>
              <button 
                onClick={() => setSelectedPeriod('week')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedPeriod === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Settimana
              </button>
              <button 
                onClick={() => setSelectedPeriod('month')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Mese
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(booking.date)} - {booking.time} | {booking.guests} persone
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status === 'confirmed' ? 'Confermata' : 'In Attesa'}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">{booking.table}</p>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nessuna prenotazione</p>
            )}
          </div>
        </div>

        {/* Panoramica Turni Personale */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">👥 Panoramica Turni Personale</h3>
            <button 
              onClick={() => router.push('/shifts/ai')}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm"
            >
              🤖 Suggerimenti AI
            </button>
          </div>
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div key={shift.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{shift.employee}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(shift.date)} - {shift.startTime} / {shift.endTime}
                  </p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {shift.department}
                </span>
              </div>
            ))}
            {shifts.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nessun turno programmato</p>
            )}
          </div>
        </div>
      </div>

      {/* Report Mance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">💰 Report Mance</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => router.push('/tips')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm"
            >
              📊 Report Completo
            </button>
            <button 
              onClick={() => router.push('/tips/manage')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
            >
              📈 Analisi Avanzata
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <h4 className="font-semibold text-gray-700 mb-2">Giornaliero</h4>
            <p className="text-2xl font-bold text-green-600">€{getTotalTips().toFixed(2)}</p>
            <p className="text-sm text-gray-500">Oggi</p>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-gray-700 mb-2">Mensile</h4>
            <p className="text-2xl font-bold text-blue-600">€{(getTotalTips() * 30).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Stima mensile</p>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-gray-700 mb-2">Per Dipendente</h4>
            <p className="text-2xl font-bold text-purple-600">€{shifts.length > 0 ? (getTotalTips() / shifts.length).toFixed(2) : '0.00'}</p>
            <p className="text-sm text-gray-500">Media giornaliera</p>
          </div>
        </div>
      </div>

      {/* Gestione Ferie/Permessi */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🏖️ Gestione Ferie/ROL/Permessi</h3>
        </div>
        <div className="space-y-3">
          {leaveRequests.map((request) => (
            <div key={request.id} className={`flex justify-between items-center p-3 rounded ${
              request.isUrgent ? 'bg-red-50 border-l-4 border-red-400' : 'bg-gray-50'
            }`}>
              <div>
                <p className="font-medium">{request.employee}</p>
                <p className="text-sm text-gray-600">
                  {request.type} - {request.days} {request.days === 1 ? 'giorno' : 'giorni'} | {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </p>
                <p className="text-sm text-gray-500">{request.reason}</p>
              </div>
              <div className="flex items-center space-x-2">
                {request.isUrgent && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">URGENTE</span>
                )}
                <span className={`px-2 py-1 rounded text-xs ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                  request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {request.status === 'pending' ? 'In Attesa' : 
                   request.status === 'approved' ? 'Approvata' : 'Rifiutata'}
                </span>
                {request.status === 'pending' && (
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleApproveLeave(request.id)}
                      className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition text-xs"
                    >
                      ✓
                    </button>
                    <button 
                      onClick={() => handleRejectLeave(request.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition text-xs"
                    >
                      ✗
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {leaveRequests.length === 0 && (
            <p className="text-gray-500 text-center py-4">Nessuna richiesta in attesa</p>
          )}
        </div>
      </div>

      

    </div>
  )
}

