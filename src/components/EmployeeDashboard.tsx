'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/utils'

interface EmployeeDashboardProps {
  userId: string
  userName: string
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  department: string
  status: string
}

interface TipData {
  today: number
  thisWeek: number
  thisMonth: number
  dailyAverage: number
}

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  status: string
  days: number
}

export default function EmployeeDashboard({ userId, userName }: EmployeeDashboardProps) {
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [tipData, setTipData] = useState<TipData>({
    today: 32.50,
    thisWeek: 156.80,
    thisMonth: 247.50,
    dailyAverage: 12.40
  })
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalance, setLeaveBalance] = useState(18)

  // Carica dati del dipendente
  useEffect(() => {
    // Simula caricamento dati dal database
    loadEmployeeData()
  }, [userId])

  const loadEmployeeData = () => {
    // Dati mock per demo - in produzione verranno caricati dal database
    setShifts([
      {
        id: '1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '17:00',
        department: 'Sala',
        status: 'scheduled'
      },
      {
        id: '2',
        date: '2024-01-16',
        startTime: '14:00',
        endTime: '22:00',
        department: 'Sala',
        status: 'scheduled'
      },
      {
        id: '3',
        date: '2024-01-17',
        startTime: '09:00',
        endTime: '17:00',
        department: 'Sala',
        status: 'scheduled'
      }
    ])

    setLeaveRequests([
      {
        id: '1',
        type: 'Ferie',
        startDate: '2024-03-15',
        endDate: '2024-03-20',
        status: 'pending',
        days: 5
      },
      {
        id: '2',
        type: 'ROL',
        startDate: '2024-01-10',
        endDate: '2024-01-10',
        status: 'approved',
        days: 0.5
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa'
      case 'approved':
        return 'Approvata'
      case 'rejected':
        return 'Rifiutata'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistiche Personali */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">📅</div>
          <h3 className="text-lg font-semibold mb-2">Turni di Questa Settimana</h3>
          <p className="text-2xl font-bold text-blue-600">{shifts.length}</p>
          <p className="text-sm text-gray-500">Ore totali: {shifts.length * 8}h</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-lg font-semibold mb-2">Mance di Questo Mese</h3>
          <p className="text-2xl font-bold text-green-600">{formatEuro(tipData.thisMonth)}</p>
          <p className="text-sm text-gray-500">+12% vs mese scorso</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">🏖️</div>
          <h3 className="text-lg font-semibold mb-2">Ferie Rimanenti</h3>
          <p className="text-2xl font-bold text-orange-600">{leaveBalance} giorni</p>
          <p className="text-sm text-gray-500">Anno 2024</p>
        </div>
      </div>

      {/* Sezioni Principali */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Turni Assegnati */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📅 I Miei Turni</h3>
            <button 
              onClick={() => router.push('/shifts')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Vedi Tutti
            </button>
          </div>
          <div className="space-y-3">
            {shifts.slice(0, 3).map((shift) => (
              <div key={shift.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{formatDate(shift.date)}</p>
                  <p className="text-sm text-gray-600">{shift.startTime} - {shift.endTime}</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {shift.department}
                </span>
              </div>
            ))}
            {shifts.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nessun turno assegnato</p>
            )}
          </div>
        </div>

        {/* Mance Personali */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💰 Le Mie Mance</h3>
            <button 
              onClick={() => router.push('/tips')}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Vedi Dettaglio
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Oggi</span>
              <span className="font-semibold">{formatEuro(tipData.today)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Questa Settimana</span>
              <span className="font-semibold">{formatEuro(tipData.thisWeek)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Questo Mese</span>
              <span className="font-semibold text-green-600">{formatEuro(tipData.thisMonth)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Media Giornaliera</span>
                <span className="font-semibold">{formatEuro(tipData.dailyAverage)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Richieste Ferie/Permessi */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🏖️ Le Mie Richieste</h3>
          <button 
            onClick={() => router.push('/leaves/new')}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition text-sm"
          >
            Nuova Richiesta
          </button>
        </div>
        <div className="space-y-3">
          {leaveRequests.map((request) => (
            <div key={request.id} className={`flex justify-between items-center p-3 rounded ${
              request.status === 'pending' ? 'bg-yellow-50' : 
              request.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div>
                <p className="font-medium">
                  {request.type} - {request.days} {request.days === 1 ? 'giorno' : 'giorni'}
                </p>
                <p className="text-sm text-gray-600">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                {getStatusText(request.status)}
              </span>
            </div>
          ))}
          {leaveRequests.length === 0 && (
            <p className="text-gray-500 text-center py-4">Nessuna richiesta presente</p>
          )}
        </div>
      </div>

      
    </div>
  )
}
