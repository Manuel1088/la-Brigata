// src/app/shifts/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { generateAISuggestions, type Booking as AIBooking, type CompanyEvent as AIEvent, type Shift as AIShift } from '@/lib/aiShiftScheduler'
import { getBookingsByDate, getCompanyEventsByDate } from '@/lib/bookings'
import { getLeaveRequests } from '@/lib/leaveSystem'

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
  const [isShiftSelectorOpen, setIsShiftSelectorOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{name: string, dayIndex: number, isEdit?: boolean} | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  // Nuovi stati per gestione turni personalizzati
  const [customShifts, setCustomShifts] = useState<{[department: string]: Array<{id: string, name: string, time: string, description: string}>}>({})
  const [isAddingCustomShift, setIsAddingCustomShift] = useState(false)
  const [targetDepartment, setTargetDepartment] = useState('')

  const handleAddCustomShift = (department: string) => {
    setTargetDepartment(department)
    setIsAddingCustomShift(true)
  }

  const saveCustomShift = (shiftData: {name: string, time: string, description: string}) => {
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
  }

  // Funzione per ottenere tutti i turni (predefiniti + personalizzati)
  const getAllShiftsForDepartment = (department: string) => {
    const predefined = departmentShifts[department as keyof typeof departmentShifts] || []
    const custom = customShifts[department] || []
    return [...predefined.slice(0, -2), ...custom, ...predefined.slice(-2)] // Inserisce custom prima di riposo e personalizzato
  }

  // canManageShifts deve essere sempre nello scope della funzione
  const canManageShifts = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER'].includes((session?.user as any)?.role || '')

  // Funzioni validazione CCNL
  const calculateWeeklyHours = (employeeName: string) => {
    let totalHours = 0
    
    for (let day = 0; day < 7; day++) {
      const key = `${employeeName}-${day}`
      const shift = shifts[key]
      const time = shift?.time
      if (time && time !== 'RIPOSO') {
        if (time.includes('/')) {
          // Turno spezzato
          const [morning, evening] = time.split(' / ')
          totalHours += calculateShiftHours(morning) + calculateShiftHours(evening)
        } else {
          totalHours += calculateShiftHours(time)
        }
      }
    }
    
    return totalHours
  }

  const calculateShiftHours = (timeString: string) => {
    if (timeString === 'RIPOSO' || timeString === 'custom') return 0
    
    const [start, end] = timeString.split('-')
    if (!start || !end) return 0
    
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    let startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    
    // Gestisce turni che attraversano la mezzanotte
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }
    
    return (endMinutes - startMinutes) / 60
  }

  const checkRestTime = (employeeName: string, dayIndex: number) => {
    // Controlla riposo minimo 11h tra turni consecutivi
    const todayKey = `${employeeName}-${dayIndex}`
    const yesterdayKey = `${employeeName}-${dayIndex - 1}`
    const tomorrowKey = `${employeeName}-${dayIndex + 1}`
    
    const todayShift = shifts[todayKey]
    const yesterdayShift = shifts[yesterdayKey]
    const tomorrowShift = shifts[tomorrowKey]
    
    const warnings = []
    
    if (
      yesterdayShift?.time && todayShift?.time &&
      yesterdayShift.time !== 'RIPOSO' && todayShift.time !== 'RIPOSO'
    ) {
      // Calcola ore di riposo tra ieri e oggi
      const restHours = calculateRestBetweenShifts(yesterdayShift.time, todayShift.time)
      if (restHours < 11) {
        warnings.push(`⚠️ Solo ${restHours}h di riposo (min 11h CCNL)`)
      }
    }
    
    return warnings
  }

  const calculateRestBetweenShifts = (endShift: string, startShift: string) => {
    if (endShift.includes('/') || startShift.includes('/')) {
      // Gestione turni spezzati semplificata
      return 12 // Assume riposo sufficiente per ora
    }
    
    const endTime = endShift.split('-')[1]
    const startTime = startShift.split('-')[0]
    
    if (!endTime || !startTime) return 12
    
    const [endHour, endMin] = endTime.split(':').map(Number)
    const [startHour, startMin] = startTime.split(':').map(Number)
    
    let endMinutes = endHour * 60 + endMin
    let startMinutes = startHour * 60 + startMin + (24 * 60) // Giorno successivo
    
    return (startMinutes - endMinutes) / 60
  }

  // Turni predefiniti
  // Turni predefiniti per reparto
  const departmentShifts = {
    cucina: [
      { id: 'prep_mattino', name: '� Prep Mattino', time: '06:00-14:00', description: 'Preparazione e pranzo' },
      { id: 'cuoco_giorno', name: '🔥 Servizio Giorno', time: '08:00-16:00', description: 'Apertura e pranzo completo' },
      { id: 'cuoco_sera', name: '🌙 Servizio Sera', time: '15:00-23:00', description: 'Cena e chiusura cucina' },
      { id: 'chef_completo', name: '👨‍🍳 Chef Completo', time: '10:00-22:00', description: 'Supervisione completa' },
      { id: 'spezzato_cucina', name: '⚡ Spezzato Chef', time: '09:00-15:00 / 18:00-24:00', description: 'Pranzo e cena separati' },
      { id: 'weekend_cucina', name: '🎉 Weekend Chef', time: '08:00-24:00', description: 'Giornata completa weekend' },
      { id: 'riposo', name: '😴 Riposo', time: 'RIPOSO', description: 'Giorno di riposo programmato' },
      { id: 'personalizzato', name: '⚙️ Personalizzato', time: 'custom', description: 'Inserisci orario manualmente' }
    ],
  
    sala: [
      { id: 'apertura_sala', name: '� Apertura', time: '07:00-15:00', description: 'Apertura e pranzo' },
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
  }
  
  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Dipendenti del ristorante
  const employees = [
    { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
    { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
    { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
    { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
    { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
    { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
  ]

  // Giorni della settimana
  const getDaysOfWeek = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay() + 1) // Lunedì
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const weekDays = getDaysOfWeek(currentWeek)
  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

  // Evidenziazione settimana corrente
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day // porta a lunedì
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + diff)
    return d
  }
  const shownWeekStart = getWeekStart(currentWeek)
  const shownWeekEnd = new Date(shownWeekStart)
  shownWeekEnd.setDate(shownWeekStart.getDate() + 6)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isCurrentWeekDisplayed = today >= shownWeekStart && today <= shownWeekEnd

  // Utility: mappa nome reparto per AI lib
  const toAIDepartment = (dep: string) => dep === 'cucina' ? 'Cucina' : dep === 'sala' ? 'Sala' : 'Bar'
  const toLocalDepartment = (dep: string) => dep === 'Cucina' ? 'cucina' : dep === 'Sala' ? 'sala' : 'bar'

  // Utility: ISO date yyyy-mm-dd
  const toISODate = (d: Date) => {
    const z = n => (n < 10 ? `0${n}` : `${n}`)
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
  }

  // Placeholder: eventi/prenotazioni e ferie approvate (integrazione futura)
  const getBookingsForDateAI = (isoDate: string): AIBooking[] => {
    const list = getBookingsByDate(isoDate)
    return list.map(b => ({ id: b.id, date: b.date, time: b.time, partySize: b.partySize, status: b.status }))
  }
  const getEventsForDateAI = (isoDate: string): AIEvent[] => {
    const list = getCompanyEventsByDate(isoDate)
    return list.map(e => ({ id: e.id, name: e.name, date: e.date, type: e.type, expectedCoversMultiplier: e.expectedCoversMultiplier }))
  }
  const isOnApprovedLeave = (employeeName: string, isoDate: string): boolean => {
    const userIdMap: Record<string, string> = {
      'Giuseppe Chef': '1',
      'Maria Cameriera': '2',
      'Luca Barista': '3',
      'Anna Sous Chef': '4',
      'Marco Cameriere': '5'
    }
    const userId = userIdMap[employeeName]
    if (!userId) return false
    const requests = getLeaveRequests(userId)
    return requests.some(r => r.status === 'APPROVED' && isoDate >= r.startDate.toISOString().split('T')[0] && isoDate <= r.endDate.toISOString().split('T')[0])
  }

  // Costruisce lista turni esistenti per AI (evita duplicati)
  const buildExistingAIShifts = (): AIShift[] => {
    const ai: AIShift[] = []
    employees.forEach(emp => {
      weekDays.forEach((d, idx) => {
        const key = `${emp.name}-${idx}`
        const s = shifts[key]
        if (s && s.time && s.time !== 'RIPOSO') {
          const [startTime, endTime] = s.time.split(' - ').length === 1 ? s.time.split('-') : s.time.split(' - ')
          if (startTime && endTime) {
            ai.push({
              id: `${toISODate(d)}-${toAIDepartment(emp.department)}-${startTime}-${emp.name}`,
              date: toISODate(d),
              startTime,
              endTime,
              department: toAIDepartment(emp.department),
              employeeId: emp.name,
              status: 'scheduled'
            })
          }
        }
      })
    })
    return ai
  }

  // Applica suggerimenti AI alla settimana corrente rispettando riposi 11h e 48h settimanali
  const generateWeekWithAI = async () => {
    setIsGeneratingAI(true)
    try {
      const existing = buildExistingAIShifts()
      // Copia mutabile dello stato turni
      const newShifts = { ...shifts }

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dateISO = toISODate(weekDays[dayIndex])
        const dayBookings = getBookingsForDateAI(dateISO)
        const dayEvents = getEventsForDateAI(dateISO)
        const daySuggestions = generateAISuggestions(dateISO, dayBookings, dayEvents, existing)

        for (const sug of daySuggestions) {
          const employeeName = sug.suggestedEmployee.name
          const localDept = toLocalDepartment(sug.department)
          const employee = employees.find(e => e.name === employeeName)
          if (!employee) continue
          if (employee.department !== localDept) continue
          const key = `${employeeName}-${dayIndex}`
          if (newShifts[key] && newShifts[key].time) continue // già assegnato
          if (isOnApprovedLeave(employeeName, dateISO)) continue // in ferie

          // Controlli CCNL: riposo minimo 11h con giorno precedente/successivo
          const prevKey = `${employeeName}-${dayIndex - 1}`
          const nextKey = `${employeeName}-${dayIndex + 1}`
          const prevTime = newShifts[prevKey]?.time
          const nextTime = newShifts[nextKey]?.time
          let restOk = true
          if (prevTime && prevTime !== 'RIPOSO') {
            const rest = calculateRestBetweenShifts(prevTime.includes('/') ? prevTime.split(' / ')[0] : prevTime, `${sug.startTime}-${sug.endTime}`)
            if (rest < 11) restOk = false
          }
          if (nextTime && nextTime !== 'RIPOSO') {
            const rest = calculateRestBetweenShifts(`${sug.startTime}-${sug.endTime}`, nextTime.includes('/') ? nextTime.split(' / ')[0] : nextTime)
            if (rest < 11) restOk = false
          }
          if (!restOk) continue

          // Ore settimanali <= 48
          const hoursToday = calculateShiftHours(`${sug.startTime}-${sug.endTime}`)
          const hoursSoFar = calculateWeeklyHours(employeeName)
          if (hoursSoFar + hoursToday > 48) continue

          // Applica suggerimento
          newShifts[key] = {
            employee: employeeName,
            time: `${sug.startTime}-${sug.endTime}`,
            department: employee.department,
            role: employee.role
          }

          // Aggiorna existing per evitare duplicati nella stessa giornata
          existing.push({
            id: `${dateISO}-${sug.department}-${sug.startTime}-${employeeName}`,
            date: dateISO,
            startTime: sug.startTime,
            endTime: sug.endTime,
            department: sug.department,
            employeeId: employeeName,
            status: 'scheduled'
          })
        }
      }

      setShifts(newShifts)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Turni demo (inizialmente vuoti)
  const [shifts, setShifts] = useState<{[key: string]: ShiftCell}>({
    'Giuseppe Chef-0': { employee: 'Giuseppe Chef', time: '08:00-16:00', department: 'cucina', role: 'CHEF' },
    'Maria Cameriera-0': { employee: 'Maria Cameriera', time: '12:00-22:00', department: 'sala', role: 'DIPENDENTE_SALA' },
    'Luca Barista-4': { employee: 'Luca Barista', time: '18:00-02:00', department: 'bar', role: 'DIPENDENTE_BAR' },
    'Giuseppe Chef-5': { employee: 'Giuseppe Chef', time: '10:00-18:00', department: 'cucina', role: 'CHEF' },
    'Sofia Cassiera-6': { employee: 'Sofia Cassiera', time: '09:00-17:00', department: 'sala', role: 'CASSIERE' }
  })

  const handleCellClick = (employee: string, dayIndex: number) => {
    if (!canManageShifts) return
    const shiftKey = `${employee}-${dayIndex}`
    const existingShift = shifts[shiftKey]
    setSelectedEmployee({ 
      name: employee, 
      dayIndex, 
      isEdit: !!existingShift 
    })
    setIsShiftSelectorOpen(true)
  }

  // Funzione per modifica rapida

  // Funzione per click destro (elimina turno)
  const handleCellRightClick = (e: React.MouseEvent, employee: string, dayIndex: number) => {
    e.preventDefault()
    if (!canManageShifts) return
    const shiftKey = `${employee}-${dayIndex}`
    const confirmed = confirm('Vuoi eliminare questo turno?')
    if (confirmed) {
      const newShifts = { ...shifts }
      delete newShifts[shiftKey]
      setShifts(newShifts)
    }
  }

  // Navigazione settimana
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek)
    prevWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(prevWeek)
  }
  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek)
    nextWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(nextWeek)
  }

  // Funzione handleShiftSelect (stub, da implementare se non esiste)
  const handleShiftSelect = (shift: any) => {
    if (!selectedEmployee) return
    const shiftKey = `${selectedEmployee.name}-${selectedEmployee.dayIndex}`
    setShifts(prev => ({
      ...prev,
      [shiftKey]: {
        employee: selectedEmployee.name,
        time: shift.time,
        department: employees.find(e => e.name === selectedEmployee.name)?.department,
        role: employees.find(e => e.name === selectedEmployee.name)?.role
      }
    }))
    setIsShiftSelectorOpen(false)
    setSelectedEmployee(null)
  }
  // --- RENDER PRINCIPALE ---
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
              <span className="text-gray-700">
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
          <div className="flex space-x-3 mb-6">
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
          </div>
          {/* Week Navigator Migliorato */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center">
              <button
                onClick={goToPreviousWeek}
                className="flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
              >
                <span className="text-xl mr-2">←</span>
                Settimana Precedente
              </button>
              <div className={`text-lg font-bold ${isCurrentWeekDisplayed ? 'text-red-600' : 'text-gray-800'}`}>
                {weekDays[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })} - {weekDays[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}
              </div>
              <button
                onClick={goToNextWeek}
                className="flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
              >
                Settimana Successiva
                <span className="text-xl ml-2">→</span>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={generateWeekWithAI}
                disabled={isGeneratingAI}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {isGeneratingAI ? '🔄 Generazione AI...' : '🤖 Genera Turni con AI'}
              </button>
            </div>
          </div>
          {/* Tabella Turni */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDepartment === 'all' 
                  ? '🏢 Tutti i Reparti' 
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
                      <div className={`${isCurrentWeekDisplayed ? 'text-red-600' : 'text-gray-400'} font-normal`}>
                        {weekDays[index].toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees
                  .filter(employee => selectedDepartment === 'all' || employee.department === selectedDepartment)
                  .map((employee) => (
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
                      {weekDays.map((_, dayIndex) => {
                        const key = `${employee.name}-${dayIndex}`
                        const shift = shifts[key]
                        const isRestDay = shift?.time === 'RIPOSO'
                        return (
                          <td 
                            key={dayIndex}
                            className={`px-6 py-4 text-center cursor-pointer border-r transition ${
                              shift ? (
                                isRestDay ? 'bg-gray-200 hover:bg-gray-300' : (
                                  employee.department === 'cucina' ? 'bg-red-100 hover:bg-red-200' :
                                  employee.department === 'sala' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-green-100 hover:bg-green-200'
                                )
                              ) : 'bg-gray-50 hover:bg-orange-50'
                            }`}
                            onClick={() => canManageShifts && handleCellClick(employee.name, dayIndex)}
                            onContextMenu={(e) => canManageShifts && handleCellRightClick(e, employee.name, dayIndex)}
                          >
                            {shift ? (
                              <div className="text-sm">
                                {isRestDay ? (
                                  <>
                                    <div className="font-semibold text-gray-700">
                                      😴 RIPOSO
                                    </div>
                                    <div className="text-xs text-gray-500">
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
                              <div className="text-gray-400 text-sm">
                                {canManageShifts ? '+ Assegna' : '-'}
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
              <h3 className="text-lg font-semibold text-yellow-800">⚖️ Controlli Compliance CCNL</h3>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Ore settimanali */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">📊 Ore Settimanali (Max 48h)</h4>
                  <div className="space-y-2">
                    {employees
                      .filter(employee => selectedDepartment === 'all' || employee.department === selectedDepartment)
                      .map(employee => {
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
                        employees
                          .filter(employee => selectedDepartment === 'all' || employee.department === selectedDepartment)
                          .forEach(employee => {
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
              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">📋 Riepilogo Settimana</h4>
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {employees.filter(e => calculateWeeklyHours(e.name) >= 20 && calculateWeeklyHours(e.name) <= 48).length}
                    </div>
                    <div className="text-gray-600">Conforme CCNL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {employees.filter(e => calculateWeeklyHours(e.name) > 48).length}
                    </div>
                    <div className="text-gray-600">Ore eccessive</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {employees.filter(e => calculateWeeklyHours(e.name) < 20 && calculateWeeklyHours(e.name) > 0).length}
                    </div>
                    <div className="text-gray-600">Ore ridotte</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {Object.values(shifts).filter(s => s.time === 'RIPOSO').length}
                    </div>
                    <div className="text-gray-600">Giorni riposo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Legenda e Turni Predefiniti */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Legenda Reparti:</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">🔥 Cucina ({employees.filter(e => e.department === 'cucina').length} dipendenti)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">🍽️ Sala ({employees.filter(e => e.department === 'sala').length} dipendenti)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">🍹 Bar ({employees.filter(e => e.department === 'bar').length} dipendenti)</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  ⏰ Turni {selectedDepartment === 'all' ? 'Tutti i Reparti' : selectedDepartment.toUpperCase()}:
                </h3>
                {selectedDepartment !== 'all' && canManageShifts && (
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
                          <div key={shift.id} className={`$${
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
          </div>
        </div>
        {/* Shift Selector Modal */}
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
                            const newShifts = { ...shifts }
                            delete newShifts[shiftKey]
                            setShifts(newShifts)
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
      </main>
    </div>
  )
}
