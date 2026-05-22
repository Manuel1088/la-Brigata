'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAutoScheduler } from '@/lib/autoScheduler'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import { getLeaveRequests, LEAVE_TYPES } from '@/lib/leaveSystem'
import { getRestRuleFor } from '@/lib/restRules'
import { type SimpleEmployee } from '@/lib/employees'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import { shiftsToGrid, toDateOnlyIso, type ShiftGridCell } from '@/lib/shifts'
import type { ShiftAssignment } from '@/lib/validations/shifts'
import {
  resolveVisibleShiftDepartments,
  SHIFT_DEPARTMENT_LABELS,
  type ShiftCalendarDepartment,
} from '@/lib/shift-department-access'

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
  const [swapTarget, setSwapTarget] = useState<{
    targetEmployee: string
    targetUserId: string
    targetDepartment: string
    dayIndex: number
    dateISO: string
    targetShiftTime: string
  } | null>(null)
  const [offeredShiftTime, setOfferedShiftTime] = useState<string>('')
  const [swapVersion, setSwapVersion] = useState(0)
  const { notifyCustom } = useNotifications()
  const [customShifts, setCustomShifts] = useState<{[department: string]: Array<{id: string, name: string, time: string, description: string}>}>({})
  const [isAddingCustomShift, setIsAddingCustomShift] = useState(false)
  const [targetDepartment, setTargetDepartment] = useState('')
  const { canCreateShift, canAssignShift, canApproveShift } = usePermissions()
  const userRole = session?.user?.role || ''
  const userName = session?.user?.name || ''
  const [restVersion, setRestVersion] = useState(0)
  const [showCcnlDetails, setShowCcnlDetails] = useState(false)
  const [shifts, setShifts] = useState<{[key: string]: ShiftCell}>({})
  const [employees, setEmployees] = useState<CalendarEmployee[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(false)
  const [isSavingShifts, setIsSavingShifts] = useState(false)
  const { employees: employeesData, mutate: mutateEmployees, isLoading } = useEmployeeContext()
  const [userDepartment, setUserDepartment] = useState<string>('sala')
  const [accessScope, setAccessScope] = useState<'own' | 'department' | 'all' | null>(null)
  const [accessCanEdit, setAccessCanEdit] = useState<boolean | null>(null)

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

        setShifts(shiftsToGrid(data.shifts ?? [], weekDates, new Map()))
      } catch (error) {
        console.error('Errore caricamento turni:', error)
        if (!cancelled) setShifts({})
      } finally {
        if (!cancelled) setIsLoadingShifts(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [currentWeek, viewMode, restaurantId, status, getWeekDates, swapVersion])

  useEffect(() => {
    const onSwapUpdated = () => setSwapVersion((v) => v + 1)
    window.addEventListener('shift_swaps_updated', onSwapUpdated)
    return () => window.removeEventListener('shift_swaps_updated', onSwapUpdated)
  }, [])

  // ✅ Determina accesso utente
  useEffect(() => {
    if (!session?.user) return
    
    const role = session.user.role || ''
    const userDept = session.user?.department || 'sala'
    setUserDepartment(userDept)
    
    const roleDeptFilter = resolveVisibleShiftDepartments(role, allowedDepartments)
    const restrictedDepts =
      roleDeptFilter.length < 6 && !roleDeptFilter.includes('direzione')

    if (['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'FB_MANAGER', 'ADMIN'].includes(role)) {
      setAccessScope('all')
      setAccessCanEdit(true)
    } else if (
      restrictedDepts ||
      [
        'HEAD_CHEF',
        'EXECUTIVE_CHEF',
        'CAPO_PASTICCERE',
        'MAITRE',
        'RESTAURANT_MANAGER',
        'RESPONSABILE_SALA',
        'CASSIERE',
      ].includes(role)
    ) {
      setAccessScope('all')
      setAccessCanEdit(true)
    } else {
      setAccessScope('own')
      setAccessCanEdit(false)
    }
  }, [session, allowedDepartments])

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

  const getISOString = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // ✅ Gestione turni
  const handleCellClick = (employee: string, dayIndex: number) => {
    if (!accessCanEdit) {
      // Se non può modificare, controlla se può fare swap
      const cellKey = `${employee}-${dayIndex}`
      const currentShift = shifts[cellKey]
      
      if (currentShift && currentShift.time && currentShift.time !== 'RIPOSO' && currentShift.time !== 'FERIE') {
        const targetEmp = employees.find((e) => e.name === employee)
        if (!targetEmp?.id) {
          notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', 'Collega non trovato')
          return
        }
        setSwapTarget({
          targetEmployee: employee,
          targetUserId: targetEmp.id,
          targetDepartment: currentShift.department || 'sala',
          dayIndex,
          dateISO: getISOString(getWeekDates(currentWeek)[dayIndex]),
          targetShiftTime: currentShift.time,
        })
        setIsSwapModalOpen(true)
        return
      }
    }

    if (accessScope === 'own' && employee !== userName) return
    if (accessScope === 'department') {
      const emp = employees.find(e => e.name === employee)
      if (emp?.department !== userDepartment) return
    }

    const empForScope = employees.find((e) => e.name === employee)
    if (
      empForScope?.department &&
      !visibleDepartments.includes(empForScope.department as ShiftCalendarDepartment)
    ) {
      return
    }

    // ✅ Determina il dipartimento corretto per il dipendente
    const emp = employees.find(e => e.name === employee)
    const employeeDepartment = emp?.department || 'sala'
    
    setSelectedEmployee({ name: employee, dayIndex, isEdit: !!shifts[`${employee}-${dayIndex}`] })
    setSelectedDepartment(employeeDepartment) // ✅ Imposta il dipartimento corretto
    setIsShiftSelectorOpen(true)
  }

  const handleShiftSelect = (shiftId: string) => {
    if (!selectedEmployee) return

    const { name, dayIndex } = selectedEmployee
    const cellKey = `${name}-${dayIndex}`
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
    if (!swapTarget || !offeredShiftTime || !restaurantId) return

    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
          targetUserId: swapTarget.targetUserId,
          targetDate: swapTarget.dateISO,
          requesterDate: swapTarget.dateISO,
          targetShiftTime: swapTarget.targetShiftTime,
          offeredShiftTime,
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
      setSwapVersion((prev) => prev + 1)
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore nell'invio della richiesta"
      notifyCustom('ERROR', 'SHIFTS', 'Cambio turno', msg)
    }

    setIsSwapModalOpen(false)
    setSwapTarget(null)
    setOfferedShiftTime('')
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

  const weekDates = getWeekDates(currentWeek)

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

          {/* Badge reparto (vista singolo reparto) */}
          {visibleDepartments.length === 1 && (
            <span className="px-3 py-2 rounded-lg font-medium bg-blue-600 text-white shrink-0">
              {SHIFT_DEPARTMENT_LABELS[visibleDepartments[0]].icon}{' '}
              {SHIFT_DEPARTMENT_LABELS[visibleDepartments[0]].label}
            </span>
          )}
        </div>
        
        {/* Pulsanti Reparto e Azioni */}
        <div className="flex items-center justify-between gap-4">
          {/* Pulsanti Reparto */}
          <div className="flex flex-wrap gap-2">
            {visibleDepartments.length > 1 && visibleDepartments.map((dept) => {
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
          
          {/* Azioni */}
          {canCreateShift() && (
            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isGenerating ? 'Generando...' : '🤖 Genera Automatico'}
            </button>
          )}
        </div>
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
                    const cellKey = `${employee.name}-${dayIndex}`
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
                            ${accessCanEdit ? 'cursor-pointer' : 'cursor-default'}
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

      {/* Legenda turni per reparto selezionato */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm font-semibold text-blue-900 mb-1">
          Turni disponibili — {SHIFT_DEPARTMENT_LABELS[selectedDepartment].label}
        </div>
        <ul className="list-disc list-inside text-sm text-blue-800">
          {(
            departmentShifts[selectedDepartment as keyof typeof departmentShifts]
              ?.filter((s) => s.time !== 'RIPOSO' && s.time !== 'custom')
              .map((s) => (
                <li key={s.id}>{s.name} — {s.time}</li>
              ))
          ) || null}
        </ul>
      </div>

      {/* Modal selezione turno */}
      {isShiftSelectorOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Seleziona turno per {selectedEmployee.name}
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

      {/* Modal richiesta swap */}
      {isSwapModalOpen && swapTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Richiedi Cambio Turno</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Vuoi scambiare il turno di:</p>
                <p className="font-medium">{swapTarget.targetEmployee}</p>
                <p className="text-sm text-gray-500">{swapTarget.targetShiftTime}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Con quale turno vuoi scambiare?
                </label>
                <input
                  type="text"
                  value={offeredShiftTime}
                  onChange={(e) => setOfferedShiftTime(e.target.value)}
                  placeholder="es. 09:00-17:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleSwapRequest}
                disabled={!offeredShiftTime}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Invia Richiesta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
