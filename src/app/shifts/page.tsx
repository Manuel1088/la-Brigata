'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMonday, toDateOnlyIso } from '@/lib/shifts'

type ShiftRow = {
  id: string
  date: string
  time: string
  department: string
}

function isWorkingTime(time: string): boolean {
  return time !== 'RIPOSO' && time !== 'FERIE'
}

function hoursFromTimeLabel(time: string): number {
  if (!isWorkingTime(time)) return 0
  const segment = time.split('/')[0].trim()
  const match = segment.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
  if (!match) return 0
  const [, startStr, endStr] = match
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  let hours = eh + em / 60 - (sh + sm / 60)
  if (hours < 0) hours += 24
  return Math.round(hours * 10) / 10
}

function displayLabel(time: string): string {
  if (time === 'RIPOSO') return 'Riposo'
  if (time === 'FERIE') return 'Ferie'
  return time
}

export default function ShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [myShifts, setMyShifts] = useState<ShiftRow[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  const getWeekDays = useCallback(() => {
    const start = getMonday(currentWeek)
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      week.push(day)
    }
    return week
  }, [currentWeek])

  const weekDays = useMemo(() => getWeekDays(), [getWeekDays])

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftRow>()
    for (const s of myShifts) {
      map.set(s.date, s)
    }
    return map
  }, [myShifts])

  const loadMyShifts = useCallback(async () => {
    const restaurantId = session?.user?.restaurantId
    const userId = session?.user?.id
    if (!restaurantId || !userId) {
      setMyShifts([])
      setLoadingShifts(false)
      return
    }

    setLoadingShifts(true)
    try {
      const fromDate = toDateOnlyIso(weekDays[0])
      const params = new URLSearchParams({
        restaurantId,
        date: fromDate,
        days: '7',
        userId,
      })
      const res = await fetch(`/api/shifts?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore caricamento turni')
      }
      const rows = (data.shifts ?? []) as Array<{
        id: string
        date: string
        time: string
        department: string
      }>
      setMyShifts(
        rows.map((r) => ({
          id: r.id,
          date: r.date,
          time: r.time,
          department: r.department,
        }))
      )
    } catch (error) {
      console.error('Errore caricamento turni:', error)
      setMyShifts([])
    } finally {
      setLoadingShifts(false)
    }
  }, [session?.user?.restaurantId, session?.user?.id, weekDays])

  useEffect(() => {
    if (status !== 'authenticated') return
    void loadMyShifts()
  }, [status, loadMyShifts])

  const getShiftForDay = (date: Date) => shiftsByDate.get(toDateOnlyIso(date))

  const weekStats = useMemo(() => {
    let workingDays = 0
    let totalHours = 0
    for (const day of weekDays) {
      const shift = getShiftForDay(day)
      if (!shift || !isWorkingTime(shift.time)) continue
      workingDays += 1
      totalHours += hoursFromTimeLabel(shift.time)
    }
    return {
      workingDays,
      totalHours: Math.round(totalHours * 10) / 10,
      restDays: 7 - workingDays,
    }
  }, [weekDays, shiftsByDate])

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

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
  const formatShort = (d: Date) =>
    d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  const weekRangeLabel = `${formatShort(weekDays[0])} - ${formatShort(weekDays[6])}`
  const today = new Date()
  const startOfWeek = new Date(weekDays[0])
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(weekDays[6])
  endOfWeek.setHours(23, 59, 59, 999)
  const todayOnly = new Date(today)
  todayOnly.setHours(0, 0, 0, 0)
  const isCurrentWeek = todayOnly >= startOfWeek && todayOnly <= endOfWeek

  const deptShiftCatalog: Record<string, Array<{ name: string; time: string }>> = {
    cucina: [
      { name: 'Prep Mattino', time: '06:00-14:00' },
      { name: 'Servizio Giorno', time: '08:00-16:00' },
      { name: 'Servizio Sera', time: '15:00-23:00' },
      { name: 'Spezzato Chef', time: '09:00-15:00 / 18:00-24:00' },
    ],
    sala: [
      { name: 'Apertura', time: '07:00-15:00' },
      { name: 'Pranzo', time: '11:00-16:00' },
      { name: 'Cena', time: '17:00-01:00' },
      { name: 'Spezzato Sala', time: '11:00-15:00 / 19:00-23:00' },
    ],
    beverage: [
      { name: 'Apertura Bar', time: '07:00-15:00' },
      { name: 'Aperitivo', time: '17:00-21:00' },
      { name: 'Dopocena', time: '20:00-02:00' },
      { name: 'Spezzato Bar', time: '07:00-11:00 / 17:00-01:00' },
    ],
    accoglienza: [
      { name: 'Apertura Accoglienza', time: '10:00-16:00' },
      { name: 'Serale Accoglienza', time: '18:00-24:00' },
    ],
  }
  const sessionDeptRaw = session?.user?.department || 'sala'
  const userDepartment = sessionDeptRaw === 'bar' ? 'beverage' : sessionDeptRaw
  const deptShifts = deptShiftCatalog[userDepartment] || deptShiftCatalog['sala']

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
              <p className="text-gray-600 mt-2">
                Visualizza i tuoi turni lavorativi della settimana
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="relative flex items-center">
              <div className="flex items-center justify-start gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  title="Settimana precedente"
                >
                  ←
                </button>
                <button
                  onClick={goToNextWeek}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  title="Settimana successiva"
                >
                  →
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span
                  className={`text-sm font-semibold ${isCurrentWeek ? 'text-red-600' : 'text-gray-700'}`}
                >
                  {weekRangeLabel}
                </span>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <button
                  onClick={goToToday}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  title="Torna alla settimana corrente"
                >
                  Oggi
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loadingShifts ? (
              <div className="p-8 text-center text-gray-500">
                Caricamento turni...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0">
                {weekDays.map((day, index) => {
                  const shift = getShiftForDay(day)
                  const isToday =
                    day.toDateString() === new Date().toDateString()
                  const hasWork = shift && isWorkingTime(shift.time)

                  return (
                    <div
                      key={index}
                      className="border-r border-b last:border-r-0"
                    >
                      <div className="p-3 text-center border-b bg-gray-50">
                        <div className="text-xs font-medium">{dayNames[index]}</div>
                        <div
                          className={`text-lg font-bold ${isToday ? 'text-red-600' : 'text-gray-900'}`}
                        >
                          {day.getDate()}
                        </div>
                      </div>

                      <div className="p-3 min-h-[120px] flex items-center justify-center">
                        {hasWork ? (
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">
                              {shift.time}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 capitalize">
                              {shift.department}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 text-center">
                            {shift ? displayLabel(shift.time) : 'Riposo'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Turni questa settimana</div>
              <div className="text-2xl font-bold text-blue-600">
                {weekStats.workingDays}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Ore totali</div>
              <div className="text-2xl font-bold text-green-600">
                {weekStats.totalHours}h
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Giorni di riposo</div>
              <div className="text-2xl font-bold text-purple-600">
                {weekStats.restDays}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm">
              <div className="font-semibold text-blue-900 mb-1">
                Turni disponibili nel tuo reparto
              </div>
              <ul className="list-disc list-inside text-blue-800">
                {deptShifts.map((s, idx) => (
                  <li key={idx}>
                    {s.name} — {s.time}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
