'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAutoScheduler } from '@/lib/autoScheduler'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import { getRestRuleFor } from '@/lib/restRules'
import {
  applyApprovedLeavesToShiftGrid,
  fetchApprovedLeavesForMonths,
  monthsInDateRange,
} from '@/lib/leaves-calendar'
import { type SimpleEmployee } from '@/lib/employees'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import {
  findShiftCalendarEmployee,
  getShiftAtDay,
  isShiftCalendarCurrentUser,
  shiftCellKey,
  shiftsToGrid,
  toDateOnlyIso,
  type ShiftGridCell,
} from '@/lib/shifts'
import type { ShiftAssignment } from '@/lib/validations/shifts'
import {
  normalizeUserDepartmentToShiftDept,
  resolveVisibleShiftDepartments,
  SHIFT_DEPARTMENT_LABELS,
  type ShiftCalendarDepartment,
} from '@/lib/shift-department-access'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { CCNLLevel } from '@/lib/ccnl'

type CalendarEmployee = Omit<SimpleEmployee, 'department'> & {
  id: string
  department: ShiftCalendarDepartment
}

type ShiftCell = ShiftGridCell

type ShiftsCalendarProps = {
  /** Se impostato, limita i reparti visibili (da pagina team turni). */
  allowedDepartments?: ShiftCalendarDepartment[] | null
}

export default function ShiftsCalendar({ allowedDepartments }: ShiftsCalendarProps = {}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] =
    useState<ShiftCalendarDepartment>('sala')
  const [viewMode, setViewMode] = useState<'week' | 'twoWeeks' | 'month'>('week')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isShiftSelectorOpen, setIsShiftSelectorOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{name: string, dayIndex: number, isEdit?: boolean} | null>(null)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)
  const [swapStep, setSwapStep] = useState<'intro' | 'pick'>('intro')
  const [swapSource, setSwapSource] = useState<{
    dayIndex: number
    dateISO: string
    offeredShiftTime: string
  } | null>(null)
  const [swapTarget, setSwapTarget] = useState<{
    targetEmployee: string
    targetUserId: string
    targetShiftTime: string
    dateISO: string
  } | null>(null)
  const [swapVersion, setSwapVersion] = useState(0)
  const { notifyCustom } = useNotifications()
  const [customShifts, setCustomShifts] = useState<{[department: string]: Array<{id: string, name: string, time: string, description: string}>}>({})
  const [isAddingCustomShift, setIsAddingCustomShift] = useState(false)
  const [targetDepartment, setTargetDepartment] = useState('')
  const {
    canCreateShift,
    canGestioneTurni,
    canRequestShiftSwap,
  } = usePermissions()
  const userRole = session?.user?.role || ''
  const userName = session?.user?.name || ''
  const userId = session?.user?.id
  const userCcnl = session?.user?.ccnlLevel ?? null
  const canRequestVerticalSwap = !ccnlMeetsMinimum(userCcnl, CCNLLevel.LIVELLO_3)
  const [restVersion, setRestVersion] = useState(0)
  const [showCcnlDetails, setShowCcnlDetails] = useState(false)
  const [shifts, setShifts] = useState<{[key: string]: ShiftCell}>({})
  const [employees, setEmployees] = useState<CalendarEmployee[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(false)
  const [isSavingShifts, setIsSavingShifts] = useState(false)
  const { employees: employeesData, mutate: mutateEmployees, isLoading } = useEmployeeContext()

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees) {
      map.set(e.id, e.name)
    }
    return map
  }, [employees])
  const userDepartment = normalizeUserDepartmentToShiftDept(
    session?.user?.department
  )

  // ✅ Turni predefiniti memoizzati
  const departmentShifts = useMemo(() => ({
    cucina: [
      { id: 'prep_mattino', name: '🌄 Prep Mattino', time: '06:00-14:00', description: 'Preparazione e pranzo' },
      { id: 'cuoco_giorno', name: '🔥 Servizio Giorno', time: '08:00-16:00', description: 'Apertura e pranzo completo' },
      { id: 'cuoco_sera', name: '🌙 Servizio Sera', time: '15:00-23:00', description: 'Cena e chiusura cucina' },
      { id: 'chef_completo', name: '👨‍🍳 Chef Completo', time: '10:00-22:00', description: 'Supervisione completa' },
      { id: 'spezzato_cucina', name: '⚡ Spezzato Chef', time: '09:00-15:00 / 18:00-24:00', description: 'Pranzo e cena separati' },
      { id: 'weekend_cucina', name: '🎉 Weekend Chef', time: '08:00-24:00', description: 'Giornata completa weekend' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ],
    sala: [
      { id: 'apertura_sala', name: '🌅 Apertura', time: '07:00-15:00', description: 'Apertura e pranzo' },
      { id: 'servizio_pranzo', name: '☀️ Pranzo', time: '11:00-16:00', description: 'Solo servizio pranzo' },
      { id: 'servizio_cena', name: '🌙 Cena', time: '17:00-01:00', description: 'Solo servizio cena' },
      { id: 'full_service', name: '🍽️ Servizio Completo', time: '11:00-23:00', description: 'Pranzo e cena' },
      { id: 'spezzato_sala', name: '⚡ Spezzato Sala', time: '11:00-15:00 / 19:00-23:00', description: 'Due servizi separati' },
      { id: 'responsabile_sala', name: '👨‍💼 Responsabile', time: '10:00-22:00', description: 'Supervisione completa' },
      { id: 'weekend_sala', name: '🎉 Weekend Sala', time: '10:00-24:00', description: 'Giornata completa weekend' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ],
    beverage: [
      { id: 'apertura_bar', name: '🌅 Apertura Bar', time: '07:00-15:00', description: 'Caffè e colazioni' },
      { id: 'aperitivo', name: '🍸 Aperitivo', time: '17:00-21:00', description: 'Solo aperitivi' },
      { id: 'dopocena_bar', name: '🍷 Dopocena', time: '20:00-02:00', description: 'Bar serale e cocktail' },
      { id: 'bar_completo', name: '🍹 Servizio Completo', time: '16:00-02:00', description: 'Aperitivo e dopocena' },
      { id: 'weekend_bar', name: '🎉 Weekend Bar', time: '15:00-03:00', description: 'Weekend lungo' },
      { id: 'barista_mattino', name: '☕ Barista Mattino', time: '06:00-14:00', description: 'Caffè e colazioni' },
      { id: 'spezzato_bar', name: '⚡ Spezzato Bar', time: '07:00-11:00 / 17:00-01:00', description: 'Colazioni e sera' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ],
    accoglienza: [
      { id: 'apertura_accoglienza', name: '🛎️ Apertura Accoglienza', time: '10:00-16:00', description: 'Accoglienza e cassa' },
      { id: 'serale_accoglienza', name: '🌙 Serale Accoglienza', time: '18:00-24:00', description: 'Serale con gestione ingressi' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ],
    pasticceria: [
      { id: 'prep_pasticceria', name: '🌄 Prep Pasticceria', time: '06:00-14:00', description: 'Preparazione pasticceria' },
      { id: 'pasticcere_giorno', name: '☀️ Servizio Giorno', time: '08:00-16:00', description: 'Produzione diurna' },
      { id: 'pasticcere_sera', name: '🌙 Servizio Sera', time: '15:00-23:00', description: 'Chiusura pasticceria' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ],
  }), [])

  // ✅ Configurazione riposi memoizzata
  type DeptConfig = { mode: 'fixed' | 'rotating'; weeklyRestDays: 1 | 2; baseStartDate?: string; rotateDirection?: 'forward'|'backward' }
  const [deptConfigs, setDeptConfigs] = useState<
    Record<'cucina' | 'pasticceria' | 'sala' | 'beverage' | 'accoglienza', DeptConfig>
  >({
    cucina: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    pasticceria: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    sala: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    beverage: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    accoglienza: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
  })

  const visibleDepartments = useMemo(
    () => resolveVisibleShiftDepartments(userRole, allowedDepartments),
    [userRole, allowedDepartments]
  )

  useEffect(() => {
    if (!visibleDepartments.includes(selectedDepartment)) {
      setSelectedDepartment(visibleDepartments[0] ?? 'sala')
    }
  }, [visibleDepartments, selectedDepartment])

  // ✅ Carica dipendenti OPERATIVI (esclusi proprietari non lavoratori)
  useEffect(() => {
    if (employeesData) {
      // Filtra solo dipendenti REALI (escludi PROPRIETARIO non lavoratore e ADMIN)
      const operativeEmployees = employeesData.filter((e) => {
        const role = (e as SimpleEmployee & { role?: string }).role || ''
        // Escludi SOLO:
        // - PROPRIETARIO (non lavoratore, solo gestione)
        // - ADMIN (team La Brigata, non dipendente dell'azienda)
        return ![
          'PROPRIETARIO',  // Proprietario NON lavoratore
          'ADMIN'          // Team La Brigata
        ].includes(role)
        // INCLUDE:
        // - PROPRIETARIO_OPERATIVO (lavora)
        // - DIRETTORE_GENERALE (dipendente della proprietà)
        // - Tutti gli altri ruoli operativi
      })
      
      const normalize = (d?: string): ShiftCalendarDepartment => {
        if (d === 'bar' || d === 'beverage') return 'beverage'
        if (d === 'accoglienza') return 'accoglienza'
        if (d === 'cucina') return 'cucina'
        if (d === 'pasticceria') return 'pasticceria'
        if (d === 'dirigenti' || d === 'direzione') return 'direzione'
        return 'sala'
      }
      setEmployees(operativeEmployees.map((e) => ({
        id: (e as SimpleEmployee & { id: string }).id,
        name: (e as SimpleEmployee).name,
        department: normalize((e as SimpleEmployee & { department?: string }).department),
        role: (e as SimpleEmployee & { role?: string }).role || 'DIPENDENTE_SALA'
      })))
    }
  }, [employeesData])

  // ✅ Carica configurazioni riposi
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rest_rules_department_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        setDeptConfigs(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  // ✅ Carica turni personalizzati
  useEffect(() => {
    try {
      const raw = localStorage.getItem('custom_shifts_v1')
      if (raw) {
        setCustomShifts(JSON.parse(raw))
      }
    } catch {}
  }, [])

  const restaurantId = session?.user?.restaurantId as string | undefined
  const { generateSchedule } = useAutoScheduler(restaurantId)

  const getWeekDates = useCallback((date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)

    let numDays = 7
    if (viewMode === 'twoWeeks') numDays = 14
    if (viewMode === 'month') {
      const year = start.getFullYear()
      const month = start.getMonth()
      numDays = new Date(year, month + 1, 0).getDate()
      start.setDate(1)
    }

    const dates: Date[] = []
    for (let i = 0; i < numDays; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [viewMode])

  // ✅ Carica turni da API
  useEffect(() => {
    if (!restaurantId || status !== 'authenticated') return

    const weekDates = getWeekDates(currentWeek)
    const fromDate = toDateOnlyIso(weekDates[0])
    const numDays = weekDates.length

    let cancelled = false
    const load = async () => {
      setIsLoadingShifts(true)
      try {
        const params = new URLSearchParams({
          restaurantId,
          date: fromDate,
          days: String(numDays),
        })
        const res = await fetch(`/api/shifts?${params}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load shifts')
        const data = await res.json()
        if (cancelled) return

        let grid = shiftsToGrid(data.shifts ?? [], weekDates, nameByUserId)
        const months = monthsInDateRange(
          weekDates[0],
          weekDates[weekDates.length - 1]
        )
        const approvedLeaves = await fetchApprovedLeavesForMonths(months)
        if (!cancelled) {
          grid = applyApprovedLeavesToShiftGrid(
            grid,
            approvedLeaves,
            weekDates,
            nameByUserId
          )
        }
        setShifts(grid)
      } catch (error) {
        console.error('Errore caricamento turni:', error)
        if (!cancelled) setShifts({})
      } finally {
        if (!cancelled) setIsLoadingShifts(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [currentWeek, viewMode, restaurantId, status, getWeekDates, swapVersion, nameByUserId])

  useEffect(() => {
    const onSwapUpdated = () => setSwapVersion((v) => v + 1)
    window.addEventListener('shift_swaps_updated', onSwapUpdated)
    return () => window.removeEventListener('shift_swaps_updated', onSwapUpdated)
  }, [])

  const canEditShifts = canGestioneTurni()

  // ✅ Helper functions
  
  // Formato data in base a viewMode
  const getDateRangeLabel = (dates: Date[]) => {
    if (viewMode === 'month') {
      // Mensile: solo "Ottobre 2025"
      return dates[0].toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    } else {
      // Settimana o 2 settimane: "13 - 19 Ott 2025"
      const start = dates[0]
      const end = dates[dates.length - 1]
      return `${start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('it-IT', { weekday: 'short' })
  }

  const getDateString = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  const getISOString = (date: Date) => toDateOnlyIso(date)

  const isWorkingShift = (time: string | undefined) =>
    !!time && time !== 'RIPOSO' && time !== 'FERIE'

  const closeSwapModal = () => {
    setIsSwapModalOpen(false)
    setSwapStep('intro')
    setSwapSource(null)
    setSwapTarget(null)
  }

  const openSwapFlow = (dayIndex: number, offeredShiftTime: string) => {
    const dateISO = getISOString(getWeekDates(currentWeek)[dayIndex])
    setSwapSource({ dayIndex, dateISO, offeredShiftTime })
    setSwapTarget(null)
    setSwapStep('intro')
    setIsSwapModalOpen(true)
  }

  const sessionIdentity = useMemo(
    () => ({ userId, name: userName }),
    [userId, userName]
  )

  const openSwapOnColleagueShift = (
    colleagueName: string,
    dayIndex: number,
    targetShiftTime: string
  ) => {
    const myShift = getShiftAtDay(shifts, employees, dayIndex, sessionIdentity)
    const myShiftTime = myShift?.time
    if (!myShiftTime || !isWorkingShift(myShiftTime)) {
      notifyCustom(
        'WARNING',
        'SHIFTS',
        'Cambio turno',
        'Per richiedere il cambio devi avere un turno lavorativo lo stesso giorno'
      )
      return
    }
    const colleague = findShiftCalendarEmployee(employees, { name: colleagueName })
    if (!colleague) {
      notifyCustom(
        'WARNING',
        'SHIFTS',
        'Cambio turno',
        'Collega non trovato nel calendario turni'
      )
      return
    }
    const dateISO = getISOString(getWeekDates(currentWeek)[dayIndex])
    setSwapSource({
      dayIndex,
      dateISO,
      offeredShiftTime: myShiftTime,
    })
    setSwapTarget({
      targetUserId: colleague.id,
      targetEmployee: colleagueName,
      targetShiftTime,
      dateISO,
    })
    setSwapStep('intro')
    setIsSwapModalOpen(true)
  }

  const canInteractWithCell = (
    employee: string,
    shift: ShiftCell | undefined
  ): boolean => {
    if (canEditShifts) return true
    const row = findShiftCalendarEmployee(employees, { name: employee })
    const isOwnCell = row
      ? isShiftCalendarCurrentUser(row, sessionIdentity)
      : employee === userName
    if (
      canRequestVerticalSwap &&
      isOwnCell &&
      isWorkingShift(shift?.time)
    ) {
      return true
    }
    if (
      canRequestShiftSwap() &&
      !isOwnCell &&
      isWorkingShift(shift?.time)
    ) {
      return true
    }
    return false
  }

  // ✅ Gestione turni
  const handleCellClick = (employee: string, dayIndex: number) => {
    const cellKey = shiftCellKey(employee, dayIndex)
    const currentShift = shifts[cellKey]
    const row = findShiftCalendarEmployee(employees, { name: employee })
    const isOwnCell = row
      ? isShiftCalendarCurrentUser(row, sessionIdentity)
      : employee === userName

    if (
      canRequestVerticalSwap &&
      isOwnCell &&
      isWorkingShift(currentShift?.time)
    ) {
      openSwapFlow(dayIndex, currentShift.time as string)
      return
    }

    if (
      !canEditShifts &&
      !isOwnCell &&
      canRequestShiftSwap() &&
      isWorkingShift(currentShift?.time)
    ) {
      openSwapOnColleagueShift(
        employee,
        dayIndex,
        currentShift.time as string
      )
      return
    }

    if (!canEditShifts) {
      if (
        !isOwnCell &&
        canRequestShiftSwap() &&
        !isWorkingShift(currentShift?.time)
      ) {
        notifyCustom(
          'INFO',
          'SHIFTS',
          'Cambio turno',
          'Seleziona una cella con turno lavorativo di un collega'
        )
      } else if (!canRequestShiftSwap() && !isOwnCell) {
        notifyCustom(
          'WARNING',
          'SHIFTS',
          'Cambio turno',
          'Il cambio turno con colleghi è disponibile dal livello CCNL 4 in su'
        )
      }
      return
    }

    const empForScope = employees.find((e) => e.name === employee)
    if (
      empForScope?.department &&
      !visibleDepartments.includes(empForScope.department as ShiftCalendarDepartment)
    ) {
      return
    }

    const emp = employees.find((e) => e.name === employee)
    const employeeDepartment = emp?.department || userDepartment
    const isEmpty = !currentShift?.time

    if (isEmpty) {
      setSelectedEmployee({ name: employee, dayIndex, isEdit: false })
      setSelectedDepartment(employeeDepartment)
      setIsShiftSelectorOpen(true)
      return
    }

    setSelectedEmployee({ name: employee, dayIndex, isEdit: true })
    setSelectedDepartment(employeeDepartment)
    setIsShiftSelectorOpen(true)
  }

  const handleShiftSelect = (shiftId: string) => {
    if (!selectedEmployee) return

    const { name, dayIndex } = selectedEmployee
    const cellKey = shiftCellKey(name, dayIndex)
    const shift = departmentShifts[selectedDepartment as keyof typeof departmentShifts]?.find(s => s.id === shiftId)
    
    if (!shift) return

    const newShifts = { ...shifts }
    if (shift.time === 'RIPOSO') {
      newShifts[cellKey] = { employee: name, time: 'RIPOSO', department: selectedDepartment }
    } else if (shift.time === 'custom') {
      const customTime = prompt('Inserisci orario personalizzato (es. 09:00-17:00):')
      if (customTime) {
        newShifts[cellKey] = { employee: name, time: customTime, department: selectedDepartment }
      }
    } else {
      newShifts[cellKey] = { employee: name, time: shift.time, department: selectedDepartment }
    }

    setShifts(newShifts)
    void saveShifts(newShifts)
    setIsShiftSelectorOpen(false)
    setSelectedEmployee(null)
  }

  const gridToAssignments = useCallback(
    (grid: Record<string, ShiftCell>, weekDates: Date[]): ShiftAssignment[] => {
      const byName = new Map(employees.map((e) => [e.name, e]))
      const assignments: ShiftAssignment[] = []

      for (const [key, cell] of Object.entries(grid)) {
        if (!cell.time) continue
        const lastDash = key.lastIndexOf('-')
        if (lastDash === -1) continue
        const name = key.slice(0, lastDash)
        const dayIndex = parseInt(key.slice(lastDash + 1), 10)
        const emp = byName.get(name)
        const date = weekDates[dayIndex]
        if (!emp || !date) continue

        const dept = (cell.department || emp.department) as ShiftAssignment['department']
        assignments.push({
          userId: emp.id,
          date: toDateOnlyIso(date),
          department: dept === 'direzione' ? 'sala' : dept,
          time: cell.time,
        })
      }

      return assignments
    },
    [employees]
  )

  const saveShifts = async (newShifts: Record<string, ShiftCell>) => {
    if (!restaurantId) {
      notifyCustom('ERROR', 'SHIFTS', 'Salvataggio', 'Ristorante non configurato')
      return
    }

    const weekDates = getWeekDates(currentWeek)
    const assignments = gridToAssignments(newShifts, weekDates)

    setIsSavingShifts(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
          rangeFrom: toDateOnlyIso(weekDates[0]),
          rangeTo: toDateOnlyIso(weekDates[weekDates.length - 1]),
          assignments,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Salvataggio fallito')
      }
    } catch (error) {
      console.error('Errore nel salvataggio turni:', error)
      notifyCustom('ERROR', 'SHIFTS', 'Salvataggio', 'Errore nel salvataggio turni')
    } finally {
      setIsSavingShifts(false)
    }
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
      notifyCustom(
        'SUCCESS',
        'SHIFTS',
        'Cambio turno',
        'Richiesta inviata al collega. Riceverai aggiornamento dopo la sua risposta.'
      )
      setSwapVersion((prev) => prev + 1)
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore nell'invio della richiesta"
      notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', msg)
    }

    closeSwapModal()
  }

  // ✅ Generazione automatica
  const handleGenerateSchedule = async () => {
    setIsGenerating(true)
    try {
      const result = await generateSchedule(getWeekDates(currentWeek)[0])
      if (result.success && result.schedule) {
        setShifts(result.schedule)
        notifyCustom('SUCCESS','SHIFTS','Auto-scheduler','Turni generati e salvati su database!')
      } else {
        notifyCustom('ERROR','SHIFTS','Auto-scheduler','Errore nella generazione automatica')
      }
    } catch (error) {
      notifyCustom('ERROR','SHIFTS','Auto-scheduler','Errore nella generazione automatica')
    } finally {
      setIsGenerating(false)
    }
  }

  // ✅ Filtri dipendenti
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === 'direzione') {
      // Dirigenti: chi ha department 'direzione' o ruoli dirigenziali
      return employees.filter(emp => 
        // i dirigenti sono filtrati per ruolo
        ['PROPRIETARIO_OPERATIVO', 'DIRETTORE_GENERALE', 'DIRETTORE', 'MANAGER', 'RESTAURANT_MANAGER'].includes(emp.role)
      )
    }
    return employees.filter(emp => emp.department === selectedDepartment)
  }, [employees, selectedDepartment])

  const getColleaguesOnDay = useCallback(
    (dayIndex: number) => {
      const colleagues: Array<{
        userId: string
        name: string
        time: string
      }> = []
      for (const emp of filteredEmployees) {
        if (emp.id === userId) continue
        const cellKey = shiftCellKey(emp.name, dayIndex)
        const shift = shifts[cellKey]
        const time = shift?.time
        if (!time || !isWorkingShift(time)) continue
        colleagues.push({
          userId: emp.id,
          name: emp.name,
          time,
        })
      }
      return colleagues
    },
    [filteredEmployees, shifts, userId]
  )

  const weekDates = getWeekDates(currentWeek)
  const swapColleagues =
    swapSource != null ? getColleaguesOnDay(swapSource.dayIndex) : []

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Navigazione settimana */}
        <div className="flex items-center justify-between mb-6 flex-nowrap gap-2">
          {/* Frecce Sinistra */}
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              →
            </button>
          </div>
          
          {/* Data Centro */}
          <span className="text-lg font-medium flex-1 text-center">
            {getDateRangeLabel(weekDates)}
          </span>

          {canCreateShift() && (
            <button
              type="button"
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              title="Genera turni automaticamente"
              aria-label="Genera turni automaticamente"
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 text-lg"
            >
              {isGenerating ? '…' : '🧠'}
            </button>
          )}

          {/* Badge reparto (vista singolo reparto) */}
          {visibleDepartments.length === 1 && (
            <span className="px-3 py-2 rounded-lg font-medium bg-blue-600 text-white shrink-0">
              {SHIFT_DEPARTMENT_LABELS[visibleDepartments[0]].icon}{' '}
              {SHIFT_DEPARTMENT_LABELS[visibleDepartments[0]].label}
            </span>
          )}
        </div>
        
        {/* Pulsanti Reparto */}
        {visibleDepartments.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {visibleDepartments.map((dept) => {
              const meta = SHIFT_DEPARTMENT_LABELS[dept]
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedDepartment === dept
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {meta.icon} {meta.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {(isLoadingShifts || isSavingShifts) && (
        <p className="text-sm text-gray-500 text-center">
          {isSavingShifts ? 'Salvataggio turni...' : 'Caricamento turni...'}
        </p>
      )}

      {/* Tabella turni */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Dipendente</th>
                {weekDates.map((date, index) => (
                  <th key={index} className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                    <div>{getDayName(date)}</div>
                    <div className="text-xs text-gray-500">{getDateString(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map(employee => (
                <tr key={employee.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{employee.name}</span>
                    </div>
                  </td>
                  {weekDates.map((date, dayIndex) => {
                    const cellKey = shiftCellKey(employee.name, dayIndex)
                    const shift = shifts[cellKey]
                    const isToday = date.toDateString() === new Date().toDateString()
                    
                    return (
                      <td key={dayIndex} className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleCellClick(employee.name, dayIndex)}
                          className={`
                            w-full px-3 py-2 rounded-lg text-sm font-medium transition
                            ${shift?.time === 'RIPOSO' 
                              ? 'bg-gray-100 text-gray-600' 
                              : shift?.time === 'FERIE'
                              ? 'bg-red-100 text-red-600'
                              : shift?.time
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                            }
                            ${isToday ? 'ring-2 ring-orange-400' : ''}
                            ${
                              canInteractWithCell(employee.name, shift)
                                ? 'cursor-pointer'
                                : 'cursor-default'
                            }
                          `}
                        >
                          {shift?.time || 'Vuoto'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal selezione turno */}
      {isShiftSelectorOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {selectedEmployee.isEdit
                ? `Modifica turno — ${selectedEmployee.name}`
                : `Assegna turno — ${selectedEmployee.name}`}
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {departmentShifts[selectedDepartment as keyof typeof departmentShifts]?.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => handleShiftSelect(shift.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition"
                >
                  <div className="font-medium">{shift.name}</div>
                  <div className="text-sm text-gray-600">{shift.time}</div>
                  <div className="text-xs text-gray-500">{shift.description}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsShiftSelectorOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal richiesta cambio verticale */}
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
                  {swapTarget && (
                    <>
                      <p className="text-gray-600">
                        Collega:{' '}
                        <span className="font-medium text-gray-900">
                          {swapTarget.targetEmployee}
                        </span>
                      </p>
                      <p className="text-gray-600">
                        Turno richiesto:{' '}
                        <span className="font-medium text-gray-900">
                          {swapTarget.targetShiftTime}
                        </span>
                      </p>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={closeSwapModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Annulla
                  </button>
                  {swapTarget ? (
                    <button
                      type="button"
                      onClick={() => void handleSwapRequest()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Invia richiesta
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSwapStep('pick')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Richiedi Cambio
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Scegli un collega</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Solo chi lavora lo stesso giorno ({swapSource.dateISO})
                </p>
                {swapColleagues.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Nessun collega in turno in questa data
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
    </div>
  )
}
