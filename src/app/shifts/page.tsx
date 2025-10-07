/// src/app/shifts/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAutoScheduler } from '@/lib/autoScheduler'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import { ShiftSwapManager } from '@/components/ShiftSwapManager'
import { getLeaveRequests, LEAVE_TYPES } from '@/lib/leaveSystem'
import { getRestRuleFor } from '@/lib/restRules'
import { type SimpleEmployee } from '@/lib/employees'
import { useEmployees } from '@/hooks/useEmployees'

interface ShiftCell {
  employee: string
  time?: string
  department?: string
  role?: string
}

export default function ShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const { generateSchedule } = useAutoScheduler()
  const [isShiftSelectorOpen, setIsShiftSelectorOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{name: string, dayIndex: number, isEdit?: boolean} | null>(null)
  const [isSwapManagerOpen, setIsSwapManagerOpen] = useState(false)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)
  const [swapTarget, setSwapTarget] = useState<{
    targetEmployee: string
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
  const userRole = (session?.user as any)?.role || ''
  const userName = session?.user?.name || ''
  const [restVersion, setRestVersion] = useState(0)
  const [showCcnlDetails, setShowCcnlDetails] = useState(false)
  const [shifts, setShifts] = useState<{[key: string]: ShiftCell}>({})
  const [employees, setEmployees] = useState<SimpleEmployee[]>([])
  const { data: employeesData, mutate: mutateEmployees } = useEmployees((session?.user as any)?.companyId, true)
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
    bar: [
      { id: 'apertura_bar', name: '🌅 Apertura Bar', time: '07:00-15:00', description: 'Caffè e colazioni' },
      { id: 'aperitivo', name: '🍸 Aperitivo', time: '17:00-21:00', description: 'Solo aperitivi' },
      { id: 'dopocena_bar', name: '🍷 Dopocena', time: '20:00-02:00', description: 'Bar serale e cocktail' },
      { id: 'bar_completo', name: '🍹 Servizio Completo', time: '16:00-02:00', description: 'Aperitivo e dopocena' },
      { id: 'weekend_bar', name: '🎉 Weekend Bar', time: '15:00-03:00', description: 'Weekend lungo' },
      { id: 'barista_mattino', name: '☕ Barista Mattino', time: '06:00-14:00', description: 'Caffè e colazioni' },
      { id: 'spezzato_bar', name: '⚡ Spezzato Bar', time: '07:00-11:00 / 17:00-01:00', description: 'Colazioni e sera' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ]
  }), [])

  // ✅ Configurazione riposi memoizzata
  type DeptConfig = { mode: 'fixed' | 'rotating'; weeklyRestDays: 1 | 2; baseStartDate?: string; rotateDirection?: 'forward'|'backward' }
  const [deptConfigs, setDeptConfigs] = useState<Record<'cucina'|'sala'|'bar', DeptConfig>>({
    cucina: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    sala: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    bar: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' }
  })

  // ✅ Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // ✅ Carica dipendenti (ottimizzato)
  useEffect(() => {
    if (employeesData) {
      setEmployees(employeesData.map((e: any) => ({ 
        name: e.name, 
        role: e.role, 
        department: (e as any).department || 'sala' 
      })))
    }
  }, [employeesData])

  // ✅ Event listeners ottimizzati
  useEffect(() => {
    const reload = () => mutateEmployees()
    const reloadRest = () => setRestVersion(v => v + 1)
    const onUpd = () => setSwapVersion(v => v + 1)
    
    window.addEventListener('employees_updated', reload)
    window.addEventListener('rest_rules_updated', reloadRest)
    window.addEventListener('shift_swaps_updated', onUpd)
    
    return () => {
      window.removeEventListener('employees_updated', reload)
      window.removeEventListener('rest_rules_updated', reloadRest)
      window.removeEventListener('shift_swaps_updated', onUpd)
    }
  }, [mutateEmployees])

  // ✅ Carica configurazione riposi
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rest_rules_department_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<'cucina'|'sala'|'bar', DeptConfig>
        setDeptConfigs(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  // ✅ Carica permessi da localStorage
  useEffect(() => {
    try {
      const userId = (session?.user?.id as string) || ''
      const raw = localStorage.getItem('user_access_controls_v1')
      const map = raw ? JSON.parse(raw) as Record<string, { shifts?: { viewScope?: 'own'|'department'|'all', canEdit?: boolean } }> : {}
      const cfg = map[userId]?.shifts
      if (cfg) {
        setAccessScope(cfg.viewScope || null)
        setAccessCanEdit(typeof cfg.canEdit === 'boolean' ? cfg.canEdit : null)
        return
      }
      const rawOld = localStorage.getItem('user_access_config_v1')
      if (rawOld) {
        const oldMap = JSON.parse(rawOld) as Record<string, { shiftPermissions?: { viewOwnShifts?: boolean; manageOwnDepartmentShifts?: boolean; manageAllShifts?: boolean } }>
        const oldCfg = oldMap[userId]?.shiftPermissions
        if (oldCfg) {
          if (oldCfg.manageAllShifts) {
            setAccessScope('all')
            setAccessCanEdit(true)
          } else if (oldCfg.manageOwnDepartmentShifts) {
            setAccessScope('department')
            setAccessCanEdit(true)
          } else if (oldCfg.viewOwnShifts) {
            setAccessScope('own')
            setAccessCanEdit(false)
          }
        }
      }
    } catch {}
  }, [session?.user?.id])

  // ✅ Calcola reparto utente (memoizzato)
  const effectiveUserDepartment = useMemo(() => {
    if (!session?.user) return userDepartment
    const me = employees.find(e => e.name === session.user?.name)
    if (me?.department) return me.department
    const role = (session.user as any)?.role as string | undefined
    const upperRole = (role || '').toUpperCase()
    if (upperRole === 'HEAD_CHEF') return 'cucina'
    if (upperRole === 'RESPONSABILE_SALA' || upperRole === 'CASSIERE') return 'sala'
    if (upperRole === 'HEAD_BARMAN' || upperRole === 'HEAD_SOMMELIER') return 'bar'
    return userDepartment
  }, [employees, session?.user, userDepartment])

  // ✅ Permessi memoizzati
  const canManageAll = useMemo(() => {
    return canApproveShift() || ['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'ADMIN'].includes(userRole)
  }, [canApproveShift, userRole])

  const canManageDept = useMemo(() => {
    return (canCreateShift() || canAssignShift()) && !canManageAll
  }, [canCreateShift, canAssignShift, canManageAll])

  const upperUserRole = (userRole || '').toUpperCase()
  const manageAll = ['ADMIN','PROPRIETARIO','DIRETTORE','MANAGER'].includes(upperUserRole)
    ? true
    : (accessScope !== null ? (accessScope === 'all' && accessCanEdit !== false) : canManageAll)
  const manageDept = upperUserRole === 'ADMIN' || upperUserRole === 'PROPRIETARIO'
    ? true
    : (accessScope !== null ? (accessScope === 'department' && accessCanEdit !== false) : canManageDept)

  // ✅ Imposta filtro reparto
  useEffect(() => {
    if (manageAll) return
    setSelectedDepartment(effectiveUserDepartment)
  }, [manageAll, effectiveUserDepartment])

  // ✅ Utility functions memoizzate
  const toISODate = useCallback((d: Date) => {
    const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
  }, [])

  const getDaysOfWeek = useCallback((date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay() + 1)
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }, [])

  const getWeekStart = useCallback((date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + diff)
    return d
  }, [])

  // ✅ Calcoli settimana memoizzati
  const shownWeekStart = useMemo(() => getWeekStart(currentWeek), [currentWeek, getWeekStart])
  const weekDays = useMemo(() => getDaysOfWeek(currentWeek), [currentWeek, getDaysOfWeek])
  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

  const { isCurrentWeekDisplayed, dayIndexToShow } = useMemo(() => {
    const shownWeekEnd = new Date(shownWeekStart)
    shownWeekEnd.setDate(shownWeekStart.getDate() + 6)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isCurrentWeekDisplayed = today >= shownWeekStart && today <= shownWeekEnd
    const getDayIndexInShownWeek = (date: Date) => {
      const diff = Math.floor((date.getTime() - shownWeekStart.getTime()) / (1000 * 60 * 60 * 24))
      if (diff < 0) return 0
      if (diff > 6) return 6
      return diff
    }
    const dayIndexToShow = isCurrentWeekDisplayed ? getDayIndexInShownWeek(today) : 0
    return { isCurrentWeekDisplayed, dayIndexToShow }
  }, [shownWeekStart])

  // ✅ Persistenza localStorage ottimizzata
  const getWeekKey = useCallback(() => `shifts_${toISODate(shownWeekStart)}`, [shownWeekStart, toISODate])
  
  const saveWeekShifts = useCallback((data: { [key: string]: ShiftCell }) => {
    try {
      localStorage.setItem(getWeekKey(), JSON.stringify(data))
    } catch {}
  }, [getWeekKey])

  const loadWeekShifts = useCallback((): { [key: string]: ShiftCell } | null => {
    try {
      const raw = localStorage.getItem(getWeekKey())
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [getWeekKey])

  // ✅ Carica turni quando cambia settimana
  useEffect(() => {
    const saved = loadWeekShifts()
    if (saved) {
      setShifts(saved)
    }
  }, [shownWeekStart, loadWeekShifts])

  // ✅ Calcola ore turno (memoizzato con useCallback)
  const calculateShiftHours = useCallback((timeString: string) => {
    if (timeString === 'RIPOSO' || timeString === 'custom') return 0
    const [start, end] = timeString.split('-')
    if (!start || !end) return 0
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    let startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }
    return (endMinutes - startMinutes) / 60
  }, [])

  // ✅ Calcola ore settimanali (memoizzato)
  const calculateWeeklyHours = useCallback((employeeName: string) => {
    let totalHours = 0
    for (let day = 0; day < 7; day++) {
      const key = `${employeeName}-${day}`
      const shift = shifts[key]
      const time = shift?.time
      if (time && time !== 'RIPOSO') {
        if (time.includes('/')) {
          const [morning, evening] = time.split(' / ')
          totalHours += calculateShiftHours(morning) + calculateShiftHours(evening)
        } else {
          totalHours += calculateShiftHours(time)
        }
      }
    }
    return totalHours
  }, [shifts, calculateShiftHours])

  // ✅ Calcola riposo tra turni
  const calculateRestBetweenShifts = useCallback((endShift: string, startShift: string) => {
    if (endShift.includes('/') || startShift.includes('/')) {
      return 12
    }
    const endTime = endShift.split('-')[1]
    const startTime = startShift.split('-')[0]
    if (!endTime || !startTime) return 12
    const [endHour, endMin] = endTime.split(':').map(Number)
    const [startHour, startMin] = startTime.split(':').map(Number)
    let endMinutes = endHour * 60 + endMin
    let startMinutes = startHour * 60 + startMin + (24 * 60)
    return (startMinutes - endMinutes) / 60
  }, [])

  // ✅ Verifica tempo riposo
  const checkRestTime = useCallback((employeeName: string, dayIndex: number) => {
    const todayKey = `${employeeName}-${dayIndex}`
    const yesterdayKey = `${employeeName}-${dayIndex - 1}`
    const yesterdayShift = shifts[yesterdayKey]
    const todayShift = shifts[todayKey]
    const warnings = []
    if (
      yesterdayShift?.time && todayShift?.time &&
      yesterdayShift.time !== 'RIPOSO' && todayShift.time !== 'RIPOSO'
    ) {
      const restHours = calculateRestBetweenShifts(yesterdayShift.time, todayShift.time)
      if (restHours < 11) {
        warnings.push(`⚠️ Solo ${restHours}h di riposo (min 11h CCNL)`)
      }
    }
    return warnings
  }, [shifts, calculateRestBetweenShifts])

  // ✅ Ottieni turni per reparto (memoizzato)
  const getAllShiftsForDepartment = useCallback((department: string) => {
    const predefined = departmentShifts[department as keyof typeof departmentShifts] || []
    const custom = customShifts[department] || []
    return [...predefined.slice(0, -2), ...custom, ...predefined.slice(-2)]
  }, [departmentShifts, customShifts])

  // ✅ Calcola giorni riposo rotativi
  const getRotatingRestDayIndices = useCallback((department: string, employeeName?: string): number[] => {
    const cfg = deptConfigs[(department as 'cucina'|'sala'|'bar') || 'sala']
    if (!cfg || cfg.mode !== 'rotating') return []
    const [by, bm, bd] = (cfg.baseStartDate || '2025-01-06').split('-').map(Number)
    const baseStart = new Date(by || 2025, (bm || 1) - 1, bd || 6)
    baseStart.setHours(0,0,0,0)
    const weekOffset = Math.floor((shownWeekStart.getTime() - baseStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    let offset = ((weekOffset % 7) + 7) % 7
    if ((cfg.rotateDirection || 'forward') === 'backward') {
      offset = (7 - offset) % 7
    }
    let startDay = 0
    try {
      const raw = localStorage.getItem('rest_rules')
      if (raw && employeeName) {
        const list = JSON.parse(raw) as Array<{ employeeName: string; rotatingStartDayIndex?: number }>
        const found = list.find(r => r.employeeName === employeeName)
        if (typeof found?.rotatingStartDayIndex === 'number') startDay = found.rotatingStartDayIndex
      }
    } catch {}
    const baseDays = cfg.weeklyRestDays === 2 ? [startDay, (startDay + 1) % 7] : [startDay]
    return baseDays.map(d => (d + offset) % 7)
  }, [deptConfigs, shownWeekStart])

  // ✅ Verifica ferie approvate
  const isOnApprovedLeave = useCallback((employeeName: string, isoDate: string): boolean => {
    const userIdMap: Record<string, string> = {
      'Giuseppe Chef': '1',
      'Maria Cameriera': '2',
      'Luca Barista': '3',
      'Anna Sous Chef': '4',
      'Marco Cameriere': '5',
      'Sofia Cassiera': '6'
    }
    const userId = userIdMap[employeeName]
    if (!userId) return false
    const requests = getLeaveRequests(userId)
    return requests.some(r => r.status === 'APPROVED' && isoDate >= r.startDate.toISOString().split('T')[0] && isoDate <= r.endDate.toISOString().split('T')[0])
  }, [])

  const getApprovedLeaveInfo = useCallback((employeeName: string, isoDate: string): { type: string; label: string } | null => {
    const userIdMap: Record<string, string> = {
      'Giuseppe Chef': '1',
      'Maria Cameriera': '2',
      'Luca Barista': '3',
      'Anna Sous Chef': '4',
      'Marco Cameriere': '5'
    }
    const userId = userIdMap[employeeName]
    if (!userId) return null
    const req = getLeaveRequests(userId).find(r => r.status === 'APPROVED' && isoDate >= r.startDate.toISOString().split('T')[0] && isoDate <= r.endDate.toISOString().split('T')[0])
    if (!req) return null
    const cfg = LEAVE_TYPES[req.type]
    return { type: req.type, label: cfg?.name || req.type }
  }, [])

  // ✅ Gestione swap requests
  type ShiftSwapRequest = {
    id: string
    dateISO: string
    dayIndex: number
    targetEmployeeName: string
    targetDepartment: string
    targetShiftTime: string
    requesterId: string
    requesterName: string
    requesterDepartment: string
    offeredShiftTime: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
    decidedBy?: string
    decidedAt?: string
  }

  const loadSwapRequests = useCallback((): ShiftSwapRequest[] => {
    try {
      const raw = localStorage.getItem('shift_swap_requests_v1')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }, [])

  const saveSwapRequests = useCallback((list: ShiftSwapRequest[]) => {
    try { 
      localStorage.setItem('shift_swap_requests_v1', JSON.stringify(list))
      window.dispatchEvent(new Event('shift_swaps_updated'))
    } catch {}
  }, [])

  // ✅ Handler ottimizzati
  const handleAddCustomShift = useCallback((department: string) => {
    setTargetDepartment(department)
    setIsAddingCustomShift(true)
  }, [])

  const saveCustomShift = useCallback((shiftData: {name: string, time: string, description: string}) => {
    const newShift = {
      id: `custom_${Date.now()}`,
      name: `⭐ ${shiftData.name}`,
      time: shiftData.time,
      description: shiftData.description
    }
    setCustomShifts(prev => ({
      ...prev,
      [targetDepartment]: [...(prev[targetDepartment] || []), newShift]
    }))
    setIsAddingCustomShift(false)
    setTargetDepartment('')
  }, [targetDepartment])

  const handleCellClick = useCallback((employee: string, dayIndex: number) => {
    const employeeData = employees.find(e => e.name === employee)
    if (!employeeData) return
    
    const employeeDept = employeeData.department
    const canEdit = manageAll || (manageDept && employeeDept === effectiveUserDepartment)
    const shiftKey = `${employee}-${dayIndex}`
    const existingShift = shifts[shiftKey]
    
    if (canEdit) {
      setSelectedEmployee({ name: employee, dayIndex, isEdit: !!existingShift })
      setIsShiftSelectorOpen(true)
      return
    }
    
    const isSelf = employee === (session?.user?.name || '')
    if (!isSelf && existingShift && existingShift.time && existingShift.time !== 'RIPOSO') {
      const dateISO = toISODate(weekDays[dayIndex])
      setSwapTarget({
        targetEmployee: employee,
        targetDepartment: employeeDept || 'sala',
        dayIndex,
        dateISO,
        targetShiftTime: existingShift.time as string
      })
      const myKey = `${session?.user?.name || ''}-${dayIndex}`
      const myShift = shifts[myKey]
      setOfferedShiftTime(myShift?.time && myShift.time !== 'RIPOSO' ? (myShift.time as string) : '')
      setIsSwapModalOpen(true)
    }
  }, [employees, manageAll, manageDept, effectiveUserDepartment, shifts, session, weekDays, toISODate])

  const handleCellRightClick = useCallback((e: React.MouseEvent, employee: string, dayIndex: number) => {
    e.preventDefault()
    const employeeDept = employees.find(e => e.name === employee)?.department
    const canEdit = manageAll || (manageDept && employeeDept === effectiveUserDepartment)
    if (!canEdit) return
    const shiftKey = `${employee}-${dayIndex}`
    const confirmed = confirm('Vuoi eliminare questo turno?')
    if (confirmed) {
      setShifts(prev => {
        const newShifts = { ...prev }
        delete newShifts[shiftKey]
        return newShifts
      })
    }
  }, [employees, manageAll, manageDept, effectiveUserDepartment])

  const handleShiftSelect = useCallback((shift: any) => {
    if (!selectedEmployee) return
    const shiftKey = `${selectedEmployee.name}-${selectedEmployee.dayIndex}`
    const newShift = {
      employee: selectedEmployee.name,
      time: shift.time,
      department: employees.find(e => e.name === selectedEmployee.name)?.department,
      role: employees.find(e => e.name === selectedEmployee.name)?.role
    }
    setShifts(prev => ({
      ...prev,[shiftKey]: newShift
    }))
    saveWeekShifts({
      ...shifts,
      [shiftKey]: newShift
    })
    setIsShiftSelectorOpen(false)
    setSelectedEmployee(null)
  }, [selectedEmployee, employees, shifts, saveWeekShifts])

  const goToPreviousWeek = useCallback(() => {
    const prevWeek = new Date(currentWeek)
    prevWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(prevWeek)
  }, [currentWeek])

  const goToNextWeek = useCallback(() => {
    const nextWeek = new Date(currentWeek)
    nextWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(nextWeek)
  }, [currentWeek])

  // ✅ Dipendenti filtrati memoizzati
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      if (manageAll) {
        return selectedDepartment === 'all' || employee.department === selectedDepartment
      }
      return employee.department === effectiveUserDepartment
    })
  }, [employees, manageAll, selectedDepartment, effectiveUserDepartment])

  // ✅ Conteggio richieste pending memoizzato
  const pendingSwapCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('shift_swap_requests_v1')
      const list = raw ? JSON.parse(raw) as Array<{ status: string }> : []
      return list.filter(r => r.status === 'PENDING').length
    } catch {
      return 0
    }
  }, [swapVersion])

  // ✅ Waiting states
  const waitingForCompany = !!session && !(session.user as any)?.companyId
  if (status === 'loading' || waitingForCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                📅 Gestione Turni
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-900">
                {session?.user?.name}
              </span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                {(session?.user as any)?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Pulsanti filtro reparto */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-3">
              {manageAll ? (
                <>
                  <button
                    className={`px-4 py-2 rounded-lg font-semibold transition border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-700 ${selectedDepartment === 'all' ? 'bg-orange-500 text-white' : 'bg-white hover:bg-orange-100'}`}
                    onClick={() => setSelectedDepartment('all')}
                  >
                    Tutti
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-semibold transition border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-700 ${selectedDepartment === 'cucina' ? 'bg-red-500 text-white' : 'bg-white hover:bg-red-100'}`}
                    onClick={() => setSelectedDepartment('cucina')}
                  >
                    🔥 Cucina
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-semibold transition border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-700 ${selectedDepartment === 'sala' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-blue-100'}`}
                    onClick={() => setSelectedDepartment('sala')}
                  >
                    🍽️ Sala
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-semibold transition border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-700 ${selectedDepartment === 'bar' ? 'bg-green-500 text-white' : 'bg-white hover:bg-green-100'}`}
                    onClick={() => setSelectedDepartment('bar')}
                  >
                    🍹 Bar
                  </button>
                </>
              ) : (
                <button
                  className="px-4 py-2 rounded-lg font-semibold transition border border-gray-300 shadow-sm text-gray-700 bg-gray-100 cursor-default"
                  disabled
                >
                  {effectiveUserDepartment === 'cucina' ? '🔥 Cucina' : effectiveUserDepartment === 'sala' ? '🍽️ Sala' : '🍹 Bar'}
                </button>
              )}
            </div>
            {(manageAll || manageDept) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsGenerating(true)
                    try {
                      const result = await generateSchedule(shownWeekStart)
                      if (result.success && result.schedule) {
                        const confirmApply = window.confirm('Turni generati! Vuoi applicarli?')
                        if (confirmApply) {
                          setShifts(result.schedule)
                          saveWeekShifts(result.schedule)
                        }
                      }
                    } catch (error) {
                      alert('Errore generazione turni')
                    }
                    setIsGenerating(false)
                  }}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition text-sm"
                >
                  {isGenerating ? 'Generando...' : '🤖 Auto-Genera Turni'}
                </button>
                <button
                  onClick={() => router.push('/shifts/rest')}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                >
                  😴 Regole Riposi
                </button>
                <button
                  onClick={() => setIsSwapManagerOpen(true)}
                  className="relative bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                >
                  🔄 Cambi Turno
                  {pendingSwapCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingSwapCount}</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Week Navigator */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">
                {(() => {
                  const temp = new Date(shownWeekStart)
                  const target = new Date(temp.valueOf())
                  const dayNr = (temp.getDay() + 6) % 7
                  target.setDate(target.getDate() - dayNr + 3)
                  const firstThursday = new Date(target.getFullYear(), 0, 4)
                  const weekNo = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
                  return `Settimana N° ${weekNo}`
                })()}
              </div>
              <div className={`text-lg font-bold ${isCurrentWeekDisplayed ? 'text-red-600' : 'text-gray-900'}`}>
                {weekDays[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} - {weekDays[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  aria-label="Settimana precedente"
                  className="flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
                >
                  <span className="text-xl">←</span>
                </button>
                <button
                  onClick={goToNextWeek}
                  aria-label="Settimana successiva"
                  className="flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
                >
                  <span className="text-xl">→</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabella Turni */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDepartment === 'all' 
                  ? '📋 Legenda Turni' 
                  : selectedDepartment === 'cucina' 
                  ? '🔥 Reparto Cucina'
                  : selectedDepartment === 'sala'
                  ? '🍽️ Reparto Sala'
                  : '🍹 Reparto Bar'
                }
              </h3>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dipendente
                  </th>
                  {dayNames.map((day, index) => (
                    <th key={day} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div>{day}</div>
                      <div className={`${(isCurrentWeekDisplayed && index === dayIndexToShow) ? 'text-red-600' : 'text-gray-900'} font-normal`}>
                        {weekDays[index].toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          employee.department === 'cucina' ? 'bg-red-500' :
                          employee.department === 'sala' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.role.replace('DIPENDENTE_', '').replace('_', ' ')} • {employee.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((d, dayIndex) => {
                      const key = `${employee.name}-${dayIndex}`
                      const shift = shifts[key]
                      const isRestDay = shift?.time === 'RIPOSO'
                      const dateISO = toISODate(d)
                      const restRule = getRestRuleFor(employee.name)
                      const rotatingDays = getRotatingRestDayIndices(employee.department as string, employee.name)
                      const isFixedRest = !!(restRule?.fixedDayIndices && restRule.fixedDayIndices.includes(dayIndex as any)) || rotatingDays.includes(dayIndex)
                      const leaveInfo = getApprovedLeaveInfo(employee.name, dateISO)
                      const isDerivedBlocked = isFixedRest || !!leaveInfo
                      const canClickCell = (manageAll || (manageDept && employee.department === effectiveUserDepartment)) && (!isDerivedBlocked || !!shift)
                      return (
                        <td 
                          key={dayIndex}
                          className={`px-6 py-4 text-center cursor-pointer border-r transition ${
                            shift ? (
                              isRestDay ? 'bg-gray-200 hover:bg-gray-300' : (
                                employee.department === 'cucina' ? 'bg-red-100 hover:bg-red-200' :
                                employee.department === 'sala' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-green-100 hover:bg-green-200'
                              )
                            ) : isDerivedBlocked ? 'bg-gray-100' : 'bg-gray-50 hover:bg-orange-50'
                          }`}
                          onClick={() => canClickCell && handleCellClick(employee.name, dayIndex)}
                          onContextMenu={(e) => canClickCell && handleCellRightClick(e, employee.name, dayIndex)}
                        >
                          {shift ? (
                            <div className="text-sm">
                              {isRestDay ? (
                                <>
                                  <div className="font-semibold text-gray-700">
                                    😴 RIPOSO
                                  </div>
                                  <div className="text-xs text-gray-900">
                                    Non in servizio
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className={`font-semibold ${
                                    employee.department === 'cucina' ? 'text-red-800' :
                                    employee.department === 'sala' ? 'text-blue-800' : 'text-green-800'
                                  }`}>
                                    {shift.time}
                                  </div>
                                  <div className={`text-xs capitalize ${
                                    employee.department === 'cucina' ? 'text-red-600' :
                                    employee.department === 'sala' ? 'text-blue-600' : 'text-green-600'
                                  }`}>
                                    {shift.department}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">
                              {leaveInfo ? (
                                <>
                                  <div className="font-semibold text-yellow-800">🗓️ {leaveInfo.label}</div>
                                  <div className="text-xs text-gray-900">Assenza approvata</div>
                                </>
                              ) : isFixedRest ? (
                                <>
                                  <div className="font-semibold text-gray-900">😴 RIPOSO</div>
                                  <div className="text-xs text-gray-900">Giorno fisso</div>
                                </>
                              ) : (
                                <span className="text-gray-900">{(manageAll || (manageDept && employee.department === effectiveUserDepartment)) ? '+ Assegna' : '-'}</span>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Warnings CCNL */}
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="px-6 py-4 border-b bg-yellow-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-yellow-800">⚖️ Controlli Compliance CCNL</h3>
                <button
                  onClick={() => setShowCcnlDetails(v => !v)}
                  className="px-3 py-1 rounded text-sm bg-yellow-200 text-yellow-900 hover:bg-yellow-300 transition"
                >
                  {showCcnlDetails ? 'Nascondi' : 'Dettagli'}
                </button>
              </div>
            </div>
            {showCcnlDetails && (
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Ore settimanali */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">📊 Ore Settimanali (Max 48h)</h4>
                    <div className="space-y-2">
                      {filteredEmployees.map(employee => {
                        const weeklyHours = calculateWeeklyHours(employee.name)
                        const isOvertime = weeklyHours > 48
                        const isUndertime = weeklyHours < 20
                        return (
                          <div key={employee.name} className={`flex justify-between items-center p-2 rounded ${
                            isOvertime ? 'bg-red-100' : isUndertime ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            <span className="text-sm font-medium">{employee.name}</span>
                            <span className={`text-sm font-bold ${
                              isOvertime ? 'text-red-700' : isUndertime ? 'text-yellow-700' : 'text-green-700'
                            }`}>
                              {weeklyHours.toFixed(1)}h
                              {isOvertime && ' ⚠️'}
                              {isUndertime && ' ⚡'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Conflitti riposo */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">😴 Riposi Minimi (Min 11h)</h4>
                    <div className="space-y-2">
                      {(() => {
                        const conflicts: { employee: string; day: string; warning: string }[] = []
                        for (let day = 1; day < 7; day++) {
                          filteredEmployees.forEach(employee => {
                            const warnings = checkRestTime(employee.name, day)
                            warnings.forEach(warning => {
                              conflicts.push({
                                employee: employee.name,
                                day: dayNames[day],
                                warning
                              })
                            })
                          })
                        }
                        if (conflicts.length === 0) {
                          return (
                            <div className="p-2 bg-green-100 rounded text-sm text-green-700">
                              ✅ Tutti i riposi rispettano il CCNL
                            </div>
                          )
                        }
                        return conflicts.map((conflict, index) => (
                          <div key={index} className="p-2 bg-red-100 rounded text-sm">
                            <div className="font-medium text-red-800">{conflict.employee}</div>
                            <div className="text-red-600">{conflict.day}: {conflict.warning}</div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Turni Predefiniti */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  ⏰ Turni {selectedDepartment === 'all' ? 'Tutti i Reparti' : selectedDepartment.toUpperCase()}:
                </h3>
                {selectedDepartment !== 'all' && (manageAll || manageDept) && (
                  <button
                    onClick={() => handleAddCustomShift(selectedDepartment)}
                    className="w-6 h-6 bg-orange-500 text-white rounded-full text-sm hover:bg-orange-600 transition flex items-center justify-center"
                    title="Aggiungi turno personalizzato"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {selectedDepartment === 'all' ? (
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-red-700 mb-1">🔥 CUCINA:</div>
                      <div className="pl-2 space-y-0.5">
                        <div>🌄 Prep: 06:00-14:00</div>
                        <div>🔥 Servizio: 08:00-16:00 / 15:00-23:00</div>
                        <div>👨‍🍳 Chef: 10:00-22:00</div>
                        {customShifts.cucina?.length > 0 && (
                          <>
                            <div className="text-orange-600 font-medium">Personalizzati:</div>
                            {customShifts.cucina.map(shift => (
                              <div key={shift.id}>{shift.name.replace('⭐ ', '')}: {shift.time}</div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-blue-700 mb-1">🍽️ SALA:</div>
                      <div className="pl-2 space-y-0.5">
                        <div>🌅 Apertura: 07:00-15:00</div>
                        <div>☀️ Pranzo: 11:00-16:00</div>
                        <div>🌙 Cena: 17:00-01:00</div>
                        <div>🍽️ Completo: 11:00-23:00</div>
                        {customShifts.sala?.length > 0 && (
                          <>
                            <div className="text-orange-600 font-medium">Personalizzati:</div>
                            {customShifts.sala.map(shift => (
                              <div key={shift.id}>{shift.name.replace('⭐ ', '')}: {shift.time}</div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-green-700 mb-1">🍹 BAR:</div>
                      <div className="pl-2 space-y-0.5">
                        <div>☕ Mattino: 06:00-14:00</div>
                        <div>🍸 Aperitivo: 17:00-21:00</div>
                        <div>🍷 Dopocena: 20:00-02:00</div>
                        <div>🍹 Completo: 16:00-02:00</div>
                        {customShifts.bar?.length > 0 && (
                          <>
                            <div className="text-orange-600 font-medium">Personalizzati:</div>
                            {customShifts.bar.map(shift => (
                              <div key={shift.id}>{shift.name.replace('⭐ ', '')}: {shift.time}</div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="border-t pt-1 mt-2">
                      <div className="font-semibold">😴 <strong>Riposo:</strong> Non in servizio</div>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const allShifts = getAllShiftsForDepartment(selectedDepartment)
                    return (
                      <div className="space-y-0.5">
                        {allShifts.map(shift => (
                          <div key={shift.id} className={`${
                            shift.id === 'riposo' ? 'border-t pt-1 mt-1 font-semibold' : 
                            shift.id.startsWith('custom_') ? 'text-orange-600' : ''
                          }`}>
                            {shift.name.split(' ').slice(1).join(' ')}: {shift.time}
                            {shift.id.startsWith('custom_') && (
                              <button
                                onClick={() => {
                                  const confirmed = confirm('Vuoi eliminare questo turno personalizzato?')
                                  if (confirmed) {
                                    setCustomShifts(prev => ({
                                      ...prev,
                                      [selectedDepartment]: prev[selectedDepartment]?.filter(s => s.id !== shift.id) || []
                                    }))
                                  }
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                title="Elimina turno"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })()
                )}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Come usare:</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>• <strong>Click cella:</strong> Assegna/modifica turno</div>
                <div>• <strong>Click destro:</strong> Elimina turno</div>
                <div>• <strong>Freccette:</strong> Naviga tra settimane</div>
                <div>• <strong>Filtri reparto:</strong> Mostra turni specifici</div>
              </div>
            </div>
            {(manageAll || manageDept) && (
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">🔄 Richieste Cambio Turno</h3>
                  <button onClick={() => setSwapVersion(v => v + 1)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">Aggiorna</button>
                </div>
                {(() => {
                  const list = loadSwapRequests()
                  if (!list || list.length === 0) return <div className="text-sm text-gray-600">Nessuna richiesta.</div>
                  const approve = (id: string) => {
                    const req = list.find(r => r.id === id)
                    if (!req) return
                    const day = req.dayIndex
                    const aKey = `${req.targetEmployeeName}-${day}`
                    const bKey = `${req.requesterName}-${day}`
                    const newMap = { ...shifts }
                    newMap[aKey] = { employee: req.targetEmployeeName, time: req.offeredShiftTime, department: (newMap[aKey]?.department) || req.targetDepartment }
                    newMap[bKey] = { employee: req.requesterName, time: req.targetShiftTime, department: (newMap[bKey]?.department) || req.requesterDepartment }
                    setShifts(newMap)
                    saveWeekShifts(newMap)
                    const updated = list.map(r => r.id === id ? ({ ...r, status: 'APPROVED' as const, decidedBy: (session?.user?.id as string) || '', decidedAt: new Date().toISOString() }) : r)
                    saveSwapRequests(updated)
                    alert('Cambio turno approvato')
                    setSwapVersion(v => v + 1)
                  }
                  const reject = (id: string) => {
                    const updated = list.map(r => r.id === id ? ({ ...r, status: 'REJECTED' as const, decidedBy: (session?.user?.id as string) || '', decidedAt: new Date().toISOString() }) : r)
                    saveSwapRequests(updated)
                    setSwapVersion(v => v + 1)
                  }
                  return (
                    <div className="space-y-2">
                      {list.map(r => (
                        <div key={r.id} className="border rounded p-3 text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{new Date(r.dateISO).toLocaleDateString('it-IT')} • {r.status}</div>
                            <div className="text-gray-700">{r.requesterName} propone <span className="font-semibold">{r.offeredShiftTime}</span> ⇄ {r.targetEmployeeName} <span className="font-semibold">{r.targetShiftTime}</span></div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.status === 'PENDING' ? (
                              <>
                                <button onClick={() => approve(r.id)} className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Approva</button>
                                <button onClick={() => reject(r.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Rifiuta</button>
                              </>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs ${r.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Nuovo Turno Personalizzato */}
      {isAddingCustomShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                ➕ Nuovo Turno per {targetDepartment.toUpperCase()}
              </h2>
              <button
                onClick={() => {
                  setIsAddingCustomShift(false)
                  setTargetDepartment('')
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const name = formData.get('name') as string
              const time = formData.get('time') as string
              const description = formData.get('description') as string
              if (name && time) {
                saveCustomShift({ name, time, description })
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Turno
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="es. Turno Speciale"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orario
                </label>
                <input
                  name="time"
                  type="text"
                  placeholder="es. 09:00-17:00 o 11:00-15:00 / 19:00-23:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <input
                  name="description"
                  type="text"
                  placeholder="es. Turno per eventi speciali"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustomShift(false)
                    setTargetDepartment('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  Salva Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Selector Modal */}
      {isShiftSelectorOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {selectedEmployee.isEdit ? '✏️ Modifica Turno' : '⏰ Nuovo Turno'} per {selectedEmployee.name}
              </h2>
              <button
                onClick={() => {
                  setIsShiftSelectorOpen(false)
                  setSelectedEmployee(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📅 <strong>Data:</strong> {dayNames[selectedEmployee.dayIndex] || ''} {weekDays[selectedEmployee.dayIndex]?.toLocaleDateString('it-IT') || ''}
                <br />
                🏢 <strong>Reparto:</strong> {employees.find(e => e.name === selectedEmployee.name)?.department?.toUpperCase() || ''}
                {selectedEmployee.isEdit && (() => {
                  const currentShiftKey = `${selectedEmployee.name}-${selectedEmployee.dayIndex}`
                  const currentShift = shifts[currentShiftKey]
                  return currentShift ? (
                    <span>
                      <br />
                      <strong>Turno Attuale:</strong> {currentShift.time}
                    </span>
                  ) : null
                })()}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {(() => {
                const employeeDept = employees.find(e => e.name === selectedEmployee?.name)?.department
                if (!employeeDept) return null
                const availableShifts = getAllShiftsForDepartment(employeeDept)
                if (!availableShifts) return null
                const currentShiftKey = `${selectedEmployee.name}-${selectedEmployee.dayIndex}`
                const currentShift = selectedEmployee.isEdit ? shifts[currentShiftKey] : null
                return availableShifts.map((shift) => {
                  const isCurrentShift = currentShift && 
                    ((shift.time === currentShift.time) || 
                     (shift.id === 'riposo' && currentShift.time === 'RIPOSO'))
                  return (
                    <div
                      key={shift.id}
                      onClick={() => handleShiftSelect(shift)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        isCurrentShift 
                          ? 'border-blue-500 bg-blue-50' 
                          : shift.id === 'riposo' 
                          ? 'border-gray-300 hover:border-gray-500 hover:bg-gray-50' 
                          : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold ${isCurrentShift ? 'text-blue-900' : 'text-gray-900'}`}> 
                          {shift.name}
                          {isCurrentShift && ' ✓'}
                        </h3>
                        <span className={`text-sm font-mono px-2 py-1 rounded ${
                          isCurrentShift 
                            ? 'bg-blue-200 text-blue-800'
                            : shift.id === 'riposo' 
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {shift.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{shift.description}</p>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  💡 <strong>Tip:</strong> {selectedEmployee.isEdit 
                    ? 'Seleziona un nuovo turno per sostituire quello attuale' 
                    : 'Click su un turno per assegnarlo rapidamente'
                  }
                </p>
                <div className="flex space-x-3">
                  {selectedEmployee.isEdit && (
                    <button
                      onClick={() => {
                        const shiftKey = `${selectedEmployee.name}-${selectedEmployee.dayIndex}`
                        const confirmed = confirm('Vuoi eliminare questo turno?')
                        if (confirmed) {
                          setShifts(prev => {
                            const newShifts = { ...prev }
                            delete newShifts[shiftKey]
                            return newShifts
                          })
                          setIsShiftSelectorOpen(false)
                          setSelectedEmployee(null)
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      🗑️ Elimina
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsShiftSelectorOpen(false)
                      setSelectedEmployee(null)
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swap Request Modal */}
      {isSwapModalOpen && swapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setIsSwapModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">Richiesta Cambio Turno</div>
              <button onClick={() => setIsSwapModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-700">
                Stai chiedendo di cambiare turno con <span className="font-semibold">{swapTarget.targetEmployee}</span> per il giorno <span className="font-semibold">{new Date(swapTarget.dateISO).toLocaleDateString('it-IT')}</span>.
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="font-medium text-gray-900 mb-1">Turno selezionato:</div>
                <div className="text-gray-800">{swapTarget.targetDepartment?.toUpperCase()} • {swapTarget.targetShiftTime}</div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Il tuo turno desiderato (stesso giorno)</label>
                <input
                  type="text"
                  value={offeredShiftTime}
                  onChange={(e) => setOfferedShiftTime(e.target.value)}
                  placeholder="es. 11:00-15:00 / 19:00-23:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
                <div className="text-xs text-gray-600">Suggerimenti rapidi:</div>
                <div className="flex flex-wrap gap-2">
                  {(getAllShiftsForDepartment(effectiveUserDepartment) || [])
                    .filter(s => s.time && s.time !== 'RIPOSO' && s.time !== 'custom')
                    .slice(0, 6)
                    .map(s => (
                      <button key={s.id} onClick={() => setOfferedShiftTime(s.time)} className="px-2 py-1 rounded border text-xs hover:bg-orange-50">
                        {s.time}
                      </button>
                    ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setIsSwapModalOpen(false)} className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50">Annulla</button>
                <button
                  onClick={() => {
                    if (!offeredShiftTime) { alert('Inserisci un orario desiderato'); return }
                    try {
                      const list = loadSwapRequests()
                      const req: ShiftSwapRequest = {
                        id: `swap_${Date.now()}`,
                        dateISO: swapTarget.dateISO,
                        dayIndex: swapTarget.dayIndex,
                        targetEmployeeName: swapTarget.targetEmployee,
                        targetDepartment: swapTarget.targetDepartment,
                        targetShiftTime: swapTarget.targetShiftTime,
                        requesterId: (session?.user?.id as string) || '',
                        requesterName: session?.user?.name || '',
                        requesterDepartment: effectiveUserDepartment,
                        offeredShiftTime: offeredShiftTime,
                        status: 'PENDING',
                        createdAt: new Date().toISOString()
                      }
                      saveSwapRequests([req, ...list])
                      notifyCustom('INFO', 'SHIFTS', 'Richiesta cambio turno', `${req.requesterName} → ${req.targetEmployeeName} • ${new Date(req.dateISO).toLocaleDateString('it-IT')}`, false, [
                        { label: 'Gestisci', action: 'open_shift_swaps', variant: 'primary', icon: '👁️' }
                      ])
                      alert('Richiesta inviata per approvazione')
                    } catch {}
                    setIsSwapModalOpen(false)
                  }}
                  className="px-3 py-2 text-sm rounded bg-orange-600 text-white hover:bg-orange-700"
                >
                  Invia richiesta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShiftSwapManager
        isOpen={isSwapManagerOpen}
        onClose={() => setIsSwapManagerOpen(false)}
        userId={session?.user?.id}
        userRole={(session?.user as any)?.role}
      />
    </div>
  )
}