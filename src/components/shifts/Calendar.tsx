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

interface ShiftCell {
  employee: string
  time?: string
  department?: string
  role?: string
}

export default function ShiftsCalendar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState<string>('direzione')
  const [viewMode, setViewMode] = useState<'week' | 'twoWeeks' | 'month'>('week')
  const [isGenerating, setIsGenerating] = useState(false)
  const { generateSchedule } = useAutoScheduler()
  const [isShiftSelectorOpen, setIsShiftSelectorOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{name: string, dayIndex: number, isEdit?: boolean} | null>(null)
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

  // ✅ Carica dipendenti OPERATIVI (esclusi proprietari non lavoratori)
  useEffect(() => {
    if (employeesData) {
      // Filtra solo dipendenti REALI (escludi PROPRIETARIO non lavoratore e ADMIN)
      const operativeEmployees = employeesData.filter((e: any) => {
        const role = e.role || ''
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
      
      setEmployees(operativeEmployees.map((e: any) => ({
        name: e.name,
        department: e.department || 'sala',
        role: e.role || 'DIPENDENTE_SALA'
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

  // ✅ Carica turni settimanali
  useEffect(() => {
    const weekKey = getWeekKey(currentWeek)
    try {
      const raw = localStorage.getItem(weekKey)
      if (raw) {
        setShifts(JSON.parse(raw))
      } else {
        setShifts({})
      }
    } catch {
      setShifts({})
    }
  }, [currentWeek])

  // ✅ Determina accesso utente
  useEffect(() => {
    if (!session?.user) return
    
    const role = (session.user as any)?.role || ''
    const userDept = (session.user as any)?.department || 'sala'
    setUserDepartment(userDept)
    
    if (['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'ADMIN'].includes(role)) {
      setAccessScope('all')
      setAccessCanEdit(true)
    } else if (['HEAD_CHEF', 'RESPONSABILE_SALA', 'CASSIERE'].includes(role)) {
      setAccessScope('department')
      setAccessCanEdit(true)
    } else {
      setAccessScope('own')
      setAccessCanEdit(false)
    }
  }, [session])

  // ✅ Helper functions
  const getWeekKey = (date: Date) => {
    const year = date.getFullYear()
    const week = getWeekNumber(date)
    return `shifts_${year}-W${week.toString().padStart(2, '0')}`
  }

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const getWeekDates = (date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
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
        // Apri modal per richiesta swap
        setSwapTarget({
          targetEmployee: employee,
          targetDepartment: currentShift.department || 'sala',
          dayIndex,
          dateISO: getISOString(getWeekDates(currentWeek)[dayIndex]),
          targetShiftTime: currentShift.time
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
    saveShifts(newShifts)
    setIsShiftSelectorOpen(false)
    setSelectedEmployee(null)
  }

  const saveShifts = (newShifts: {[key: string]: ShiftCell}) => {
    const weekKey = getWeekKey(currentWeek)
    try {
      localStorage.setItem(weekKey, JSON.stringify(newShifts))
    } catch (error) {
      console.error('Errore nel salvataggio turni:', error)
    }
  }

  // ✅ Gestione swap
  const handleSwapRequest = () => {
    if (!swapTarget || !offeredShiftTime) return

    const swapRequest = {
      id: crypto.randomUUID(),
      requester: userName,
      targetEmployee: swapTarget.targetEmployee,
      targetDepartment: swapTarget.targetDepartment,
      dayIndex: swapTarget.dayIndex,
      dateISO: swapTarget.dateISO,
      targetShiftTime: swapTarget.targetShiftTime,
      offeredShiftTime: offeredShiftTime,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    // Salva richiesta swap
    try {
      const existing = JSON.parse(localStorage.getItem('shift_swap_requests_v1') || '[]')
      existing.push(swapRequest)
      localStorage.setItem('shift_swap_requests_v1', JSON.stringify(existing))
      
      notifyCustom('Richiesta di cambio turno inviata!', 'success')
      setSwapVersion(prev => prev + 1)
    } catch (error) {
      notifyCustom('Errore nell\'invio della richiesta', 'error')
    }

    setIsSwapModalOpen(false)
    setSwapTarget(null)
    setOfferedShiftTime('')
  }

  // ✅ Generazione automatica
  const handleGenerateSchedule = async () => {
    setIsGenerating(true)
    try {
      const weekDates = getWeekDates(currentWeek)
      const schedule = await generateSchedule(weekDates, employees, selectedDepartment)
      
      if (schedule) {
        setShifts(schedule)
        saveShifts(schedule)
        notifyCustom('Turni generati automaticamente!', 'success')
      }
    } catch (error) {
      notifyCustom('Errore nella generazione automatica', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  // ✅ Filtri dipendenti
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === 'direzione') {
      // Dirigenti: chi ha department 'direzione' o ruoli dirigenziali
      return employees.filter(emp => 
        emp.department === 'direzione' || 
        ['PROPRIETARIO_OPERATIVO', 'DIRETTORE_GENERALE', 'MANAGER'].includes(emp.role)
      )
    }
    return employees.filter(emp => emp.department === selectedDepartment)
  }, [employees, selectedDepartment])

  const weekDates = getWeekDates(currentWeek)
  const departments = ['direzione', 'cucina', 'sala', 'bar']

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Navigazione Data + Pulsanti Vista */}
        <div className="flex items-center justify-between mb-6">
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
          <span className="text-lg font-medium">
            {weekDates[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          
          {/* Pulsanti Vista Destra */}
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 rounded-lg font-medium transition ${
                viewMode === 'week'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Settimana"
            >
              S
            </button>
            <button
              onClick={() => setViewMode('twoWeeks')}
              className={`px-3 py-2 rounded-lg font-medium transition ${
                viewMode === 'twoWeeks'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="2 Settimane"
            >
              2S
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 rounded-lg font-medium transition ${
                viewMode === 'month'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Mensile"
            >
              M
            </button>
          </div>
        </div>
        
        {/* Pulsanti Reparto e Azioni */}
        <div className="flex items-center justify-between gap-4">
          {/* Pulsanti Reparto */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDepartment('direzione')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDepartment === 'direzione'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👔 Dirigenti
            </button>
            <button
              onClick={() => setSelectedDepartment('cucina')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDepartment === 'cucina'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🍳 Cucina
            </button>
            <button
              onClick={() => setSelectedDepartment('sala')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDepartment === 'sala'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🍽️ Sala
            </button>
            <button
              onClick={() => setSelectedDepartment('bar')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDepartment === 'bar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🍹 Bar
            </button>
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
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {employee.department}
                      </span>
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
