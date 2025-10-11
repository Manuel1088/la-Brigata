'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  role: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export default function ShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [myShifts, setMyShifts] = useState<Shift[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  useEffect(() => {
    // Carica SOLO i turni del dipendente loggato
    loadMyShifts()
  }, [currentWeek])

  const loadMyShifts = () => {
    // TODO: Fetch da API /api/shifts/me
    // Per ora mostra turni di esempio
    const mockShifts: Shift[] = [
      {
        id: '1',
        date: '2025-10-13',
        startTime: '12:00',
        endTime: '20:00',
        role: 'Servizio Pranzo',
        status: 'scheduled'
      },
      {
        id: '2',
        date: '2025-10-14',
        startTime: '18:00',
        endTime: '23:00',
        role: 'Servizio Cena',
        status: 'scheduled'
      },
      {
        id: '3',
        date: '2025-10-16',
        startTime: '12:00',
        endTime: '23:00',
        role: 'Doppio Turno',
        status: 'scheduled'
      }
    ]
    setMyShifts(mockShifts)
  }

  const getWeekDays = () => {
    const week = []
    const start = new Date(currentWeek)
    start.setDate(start.getDate() - start.getDay() + 1) // Lunedì
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      week.push(day)
    }
    return week
  }

  const getShiftForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return myShifts.find(s => s.date === dateStr)
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const weekDays = getWeekDays()
  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📅 I Miei Turni</h1>
              <p className="text-gray-600 mt-2">Visualizza i tuoi turni lavorativi della settimana</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          
          {/* Navigation Settimana */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousWeek}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                ← Settimana Precedente
              </button>
              
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📅 Questa Settimana
              </button>
              
              <button
                onClick={goToNextWeek}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Settimana Successiva →
              </button>
            </div>
          </div>

          {/* Calendario Settimanale Personale */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-7 gap-0">
              {weekDays.map((day, index) => {
                const shift = getShiftForDay(day)
                const isToday = day.toDateString() === new Date().toDateString()
                
                return (
                  <div
                    key={index}
                    className={`border-r border-b last:border-r-0 ${
                      isToday ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Giorno Header */}
                    <div className={`p-3 text-center border-b ${
                      isToday ? 'bg-blue-500 text-white' : 'bg-gray-50'
                    }`}>
                      <div className="text-xs font-medium">{dayNames[index]}</div>
                      <div className={`text-lg font-bold ${
                        isToday ? 'text-white' : 'text-gray-900'
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>
                    
                    {/* Turno Content */}
                    <div className="p-3 min-h-[120px]">
                      {shift ? (
                        <div className={`rounded-lg p-3 h-full ${
                          shift.status === 'scheduled' ? 'bg-blue-100 border-2 border-blue-300' :
                          shift.status === 'completed' ? 'bg-green-100 border-2 border-green-300' :
                          'bg-gray-100 border-2 border-gray-300'
                        }`}>
                          <div className="text-xs font-semibold text-gray-900 mb-1">
                            {shift.role}
                          </div>
                          <div className="text-sm font-bold text-blue-700">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          {shift.status === 'completed' && (
                            <div className="text-xs text-green-600 mt-1">✓ Completato</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          <div className="text-2xl">⚪</div>
                          <div className="text-xs mt-1">Riposo</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Riepilogo Settimana */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Turni questa settimana</div>
              <div className="text-2xl font-bold text-blue-600">{myShifts.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Ore totali</div>
              <div className="text-2xl font-bold text-green-600">
                {myShifts.reduce((total, shift) => {
                  const start = parseInt(shift.startTime.split(':')[0])
                  const end = parseInt(shift.endTime.split(':')[0])
                  return total + (end > start ? end - start : 24 - start + end)
                }, 0)}h
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Giorni di riposo</div>
              <div className="text-2xl font-bold text-purple-600">{7 - myShifts.length}</div>
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              🔵 Turno Lavorativo | ⚪ Riposo | 🟢 Ferie | 🟣 Evento Aziendale
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}


