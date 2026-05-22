'use client'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { CCNLLevel } from '@/lib/ccnl'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { getMonday, hoursFromShiftTimeLabel, toDateOnlyIso } from '@/lib/shifts'

type ShiftRow = {
  id: string
  date: string
  time: string
  department: string
}

type DeptShiftRow = {
  userId: string
  userName: string
  date: string
  time: string
  department: string
}

function isWorkingTime(time: string): boolean {
  return time !== 'RIPOSO' && time !== 'FERIE'
}

function displayLabel(time: string): string {
  if (time === 'RIPOSO') return 'Riposo'
  if (time === 'FERIE') return 'Ferie'
  return time
}

function normalizeDept(department: string): string {
  const d = department.trim().toLowerCase()
  if (d === 'bar') return 'beverage'
  return d
}

export default function PersonalWeekShifts() {
  const { data: session, status } = useSession()
  const { notifyCustom } = useNotifications()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [myShifts, setMyShifts] = useState<ShiftRow[]>([])
  const [deptWeekShifts, setDeptWeekShifts] = useState<DeptShiftRow[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)
  const [swapStep, setSwapStep] = useState<'intro' | 'pick'>('intro')
  const [swapSource, setSwapSource] = useState<{
    dateISO: string
    offeredShiftTime: string
  } | null>(null)
  const [swapTarget, setSwapTarget] = useState<{
    targetUserId: string
    targetEmployee: string
    targetShiftTime: string
    dateISO: string
  } | null>(null)

  const userId = session?.user?.id
  const userCcnl = session?.user?.ccnlLevel ?? null
  const restaurantId = session?.user?.restaurantId
  const canRequestVerticalSwap = !ccnlMeetsMinimum(userCcnl, CCNLLevel.LIVELLO_3)

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

  const sessionDeptRaw = session?.user?.department || 'sala'
  const userDepartment = sessionDeptRaw === 'bar' ? 'beverage' : sessionDeptRaw

  const loadWeekShifts = useCallback(async () => {
    if (!restaurantId || !userId) {
      setMyShifts([])
      setDeptWeekShifts([])
      setLoadingShifts(false)
      return
    }

    setLoadingShifts(true)
    try {
      const fromDate = toDateOnlyIso(weekDays[0])
      const baseParams = {
        restaurantId,
        date: fromDate,
        days: '7',
      }

      const [myRes, deptRes] = await Promise.all([
        fetch(
          `/api/shifts?${new URLSearchParams({ ...baseParams, userId })}`,
          { credentials: 'include' }
        ),
        fetch(`/api/shifts?${new URLSearchParams(baseParams)}`, {
          credentials: 'include',
        }),
      ])

      const myData = await myRes.json()
      if (!myRes.ok) {
        throw new Error(myData.error || 'Errore caricamento turni')
      }
      const rows = (myData.shifts ?? []) as Array<{
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

      if (deptRes.ok) {
        const deptData = await deptRes.json()
        const deptRows = (deptData.shifts ?? []) as Array<{
          userId: string
          userName: string
          date: string
          time: string
          department: string
        }>
        setDeptWeekShifts(
          deptRows.map((r) => ({
            userId: r.userId,
            userName: r.userName,
            date: r.date,
            time: r.time,
            department: r.department,
          }))
        )
      } else {
        setDeptWeekShifts([])
      }
    } catch (error) {
      console.error('Errore caricamento turni:', error)
      setMyShifts([])
      setDeptWeekShifts([])
    } finally {
      setLoadingShifts(false)
    }
  }, [restaurantId, userId, weekDays])

  useEffect(() => {
    if (status !== 'authenticated') return
    void loadWeekShifts()
  }, [status, loadWeekShifts])

  useEffect(() => {
    const onSwapUpdated = () => void loadWeekShifts()
    window.addEventListener('shift_swaps_updated', onSwapUpdated)
    return () => window.removeEventListener('shift_swaps_updated', onSwapUpdated)
  }, [loadWeekShifts])

  const getShiftForDay = (date: Date) => shiftsByDate.get(toDateOnlyIso(date))

  const getColleaguesOnDay = useCallback(
    (dateISO: string) => {
      const colleagues: Array<{
        userId: string
        name: string
        time: string
      }> = []
      const myDept = normalizeDept(userDepartment)

      for (const row of deptWeekShifts) {
        if (row.userId === userId) continue
        if (row.date !== dateISO) continue
        if (normalizeDept(row.department) !== myDept) continue
        if (!isWorkingTime(row.time)) continue
        colleagues.push({
          userId: row.userId,
          name: row.userName,
          time: row.time,
        })
      }

      return colleagues
    },
    [deptWeekShifts, userId, userDepartment]
  )

  const swapColleagues =
    swapSource != null ? getColleaguesOnDay(swapSource.dateISO) : []

  const closeSwapModal = () => {
    setIsSwapModalOpen(false)
    setSwapStep('intro')
    setSwapSource(null)
    setSwapTarget(null)
  }

  const openSwapFlow = (dateISO: string, offeredShiftTime: string) => {
    setSwapSource({ dateISO, offeredShiftTime })
    setSwapTarget(null)
    setSwapStep('intro')
    setIsSwapModalOpen(true)
  }

  const handleDayClick = (day: Date) => {
    if (!canRequestVerticalSwap) return
    const shift = getShiftForDay(day)
    if (!shift || !isWorkingTime(shift.time)) return
    openSwapFlow(toDateOnlyIso(day), shift.time)
  }

  const handleSwapRequest = async () => {
    if (!swapTarget || !swapSource || !restaurantId) return

    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
          targetUserId: swapTarget.targetUserId,
          targetDate: swapSource.dateISO,
          requesterDate: swapSource.dateISO,
          targetShiftTime: swapTarget.targetShiftTime,
          offeredShiftTime: swapSource.offeredShiftTime,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error || 'Invio richiesta fallito'
        )
      }

      window.dispatchEvent(new CustomEvent('approvals_updated'))
      window.dispatchEvent(new CustomEvent('shift_swaps_updated'))
      notifyCustom('SUCCESS', 'SHIFTS', 'Cambio turno', 'Richiesta inviata!')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore nell'invio della richiesta"
      notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', msg)
    }

    closeSwapModal()
  }

  const weekStats = useMemo(() => {
    let workingDays = 0
    let totalHours = 0
    for (const day of weekDays) {
      const shift = getShiftForDay(day)
      if (!shift || !isWorkingTime(shift.time)) continue
      workingDays += 1
      totalHours += hoursFromShiftTimeLabel(shift.time)
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
    pasticceria: [
      { name: 'Prep Pasticceria', time: '06:00-14:00' },
      { name: 'Servizio Giorno', time: '08:00-16:00' },
      { name: 'Servizio Sera', time: '15:00-23:00' },
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
  const deptShifts = deptShiftCatalog[userDepartment] || deptShiftCatalog['sala']

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative flex items-center">
          <div className="flex items-center justify-start gap-2">
            <button
              type="button"
              onClick={goToPreviousWeek}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              title="Settimana precedente"
            >
              ←
            </button>
            <button
              type="button"
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
              type="button"
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
          <div className="p-8 text-center text-gray-500">Caricamento turni...</div>
        ) : (
          <div className="grid grid-cols-7 gap-0">
            {weekDays.map((day, index) => {
              const shift = getShiftForDay(day)
              const isToday = day.toDateString() === new Date().toDateString()
              const hasWork = shift && isWorkingTime(shift.time)

              return (
                <div key={index} className="border-r border-b last:border-r-0">
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
                      <button
                        type="button"
                        onClick={() => handleDayClick(day)}
                        disabled={!canRequestVerticalSwap}
                        className={`text-center w-full rounded-lg p-2 transition ${
                          canRequestVerticalSwap
                            ? 'hover:bg-blue-50 cursor-pointer'
                            : 'cursor-default'
                        } ${isToday ? 'ring-2 ring-orange-400' : ''}`}
                        title={
                          canRequestVerticalSwap
                            ? 'Richiedi cambio turno'
                            : undefined
                        }
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {shift.time}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {shift.department}
                        </div>
                      </button>
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
          <div className="text-2xl font-bold text-blue-600">{weekStats.workingDays}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ore totali</div>
          <div className="text-2xl font-bold text-green-600">{weekStats.totalHours}h</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Giorni di riposo</div>
          <div className="text-2xl font-bold text-purple-600">{weekStats.restDays}</div>
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

      {isSwapModalOpen && swapSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {swapStep === 'intro' ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Cambio turno</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-600">
                    Giorno:{' '}
                    <span className="font-medium text-gray-900">
                      {new Date(`${swapSource.dateISO}T12:00:00`).toLocaleDateString(
                        'it-IT',
                        { weekday: 'long', day: 'numeric', month: 'long' }
                      )}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Il tuo turno:{' '}
                    <span className="font-medium text-gray-900">
                      {swapSource.offeredShiftTime}
                    </span>
                  </p>
                  <p className="text-gray-500 text-xs">
                    Reparto: {userDepartment}
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={closeSwapModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwapStep('pick')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Richiedi Cambio
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Scegli un collega</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Colleghi del tuo reparto in turno il{' '}
                  {new Date(`${swapSource.dateISO}T12:00:00`).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                {swapColleagues.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Nessun collega del reparto in turno in questa data
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {swapColleagues.map((colleague) => (
                      <button
                        key={colleague.userId}
                        type="button"
                        onClick={() =>
                          setSwapTarget({
                            targetUserId: colleague.userId,
                            targetEmployee: colleague.name,
                            targetShiftTime: colleague.time,
                            dateISO: swapSource.dateISO,
                          })
                        }
                        className={`w-full text-left p-3 rounded-lg border transition ${
                          swapTarget?.targetUserId === colleague.userId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{colleague.name}</div>
                        <div className="text-sm text-gray-600">{colleague.time}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setSwapStep('intro')
                      setSwapTarget(null)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSwapRequest()}
                    disabled={!swapTarget}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Invia Richiesta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
