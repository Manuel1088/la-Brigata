// Sistema AI per Suggerimenti Turni - La Brigata
// Algoritmo semplificato per demo che impara da storico, prenotazioni e eventi

export interface Employee {
  id: string
  name: string
  department: string
  hourlyRate: number
  skills: string[]
  availability: {
    [key: string]: string[] // giorno -> orari disponibili
  }
  preferences: {
    maxHoursPerDay: number
    preferredShifts: string[]
    avoidShifts: string[]
  }
}

export interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  department: string
  employeeId: string
  status: 'scheduled' | 'completed' | 'cancelled'
  performance?: number // 1-10 rating
}

export interface Booking {
  id: string
  date: string
  time: string
  partySize: number
  status: string
}

export interface CompanyEvent {
  id: string
  name: string
  date: string
  type: 'internal' | 'external' | 'holiday' | 'special'
  expectedCoversMultiplier: number
}

export interface AISuggestion {
  id: string
  date: string
  department: string
  startTime: string
  endTime: string
  suggestedEmployee: Employee
  confidence: number // 0-100
  reasoning: string
  alternatives: Employee[]
}

export interface ShiftPattern {
  department: string
  timeSlots: {
    startTime: string
    endTime: string
    minEmployees: number
    maxEmployees: number
    priority: number
  }[]
}

type TimeSlot = { startTime: string; endTime: string }

// Pattern di turni per reparto
const shiftPatterns: ShiftPattern[] = [
  {
    department: 'Cucina',
    timeSlots: [
      { startTime: '06:00', endTime: '14:00', minEmployees: 1, maxEmployees: 2, priority: 1 },
      { startTime: '10:00', endTime: '18:00', minEmployees: 2, maxEmployees: 3, priority: 2 },
      { startTime: '15:00', endTime: '23:00', minEmployees: 2, maxEmployees: 4, priority: 3 },
      { startTime: '18:00', endTime: '02:00', minEmployees: 1, maxEmployees: 2, priority: 4 }
    ]
  },
  {
    department: 'Sala',
    timeSlots: [
      { startTime: '09:00', endTime: '17:00', minEmployees: 2, maxEmployees: 4, priority: 1 },
      { startTime: '14:00', endTime: '22:00', minEmployees: 3, maxEmployees: 6, priority: 2 },
      { startTime: '18:00', endTime: '24:00', minEmployees: 2, maxEmployees: 4, priority: 3 }
    ]
  },
  {
    department: 'Bar',
    timeSlots: [
      { startTime: '10:00', endTime: '18:00', minEmployees: 1, maxEmployees: 2, priority: 1 },
      { startTime: '14:00', endTime: '22:00', minEmployees: 1, maxEmployees: 3, priority: 2 },
      { startTime: '18:00', endTime: '02:00', minEmployees: 1, maxEmployees: 2, priority: 3 }
    ]
  }
]

// Dipendenti mock per demo
const employees: Employee[] = [
  {
    id: '1',
    name: 'Giuseppe Chef',
    department: 'Cucina',
    hourlyRate: 18,
    skills: ['Cooking', 'Menu Planning', 'Kitchen Management'],
    availability: {
      'monday': ['06:00-14:00', '10:00-18:00'],
      'tuesday': ['06:00-14:00', '10:00-18:00'],
      'wednesday': ['06:00-14:00', '10:00-18:00'],
      'thursday': ['06:00-14:00', '10:00-18:00'],
      'friday': ['06:00-14:00', '10:00-18:00', '15:00-23:00'],
      'saturday': ['10:00-18:00', '15:00-23:00'],
      'sunday': ['10:00-18:00']
    },
    preferences: {
      maxHoursPerDay: 8,
      preferredShifts: ['06:00-14:00', '10:00-18:00'],
      avoidShifts: ['18:00-02:00']
    }
  },
  {
    id: '2',
    name: 'Maria Cameriera',
    department: 'Sala',
    hourlyRate: 12,
    skills: ['Service', 'Customer Relations', 'Table Management'],
    availability: {
      'monday': ['09:00-17:00', '14:00-22:00'],
      'tuesday': ['09:00-17:00', '14:00-22:00'],
      'wednesday': ['09:00-17:00', '14:00-22:00'],
      'thursday': ['09:00-17:00', '14:00-22:00'],
      'friday': ['09:00-17:00', '14:00-22:00', '18:00-24:00'],
      'saturday': ['14:00-22:00', '18:00-24:00'],
      'sunday': ['14:00-22:00']
    },
    preferences: {
      maxHoursPerDay: 8,
      preferredShifts: ['09:00-17:00', '14:00-22:00'],
      avoidShifts: ['18:00-24:00']
    }
  },
  {
    id: '3',
    name: 'Luca Barista',
    department: 'Bar',
    hourlyRate: 14,
    skills: ['Bartending', 'Coffee Making', 'Inventory'],
    availability: {
      'monday': ['10:00-18:00', '14:00-22:00'],
      'tuesday': ['10:00-18:00', '14:00-22:00'],
      'wednesday': ['10:00-18:00', '14:00-22:00'],
      'thursday': ['10:00-18:00', '14:00-22:00'],
      'friday': ['10:00-18:00', '14:00-22:00', '18:00-02:00'],
      'saturday': ['14:00-22:00', '18:00-02:00'],
      'sunday': ['14:00-22:00']
    },
    preferences: {
      maxHoursPerDay: 8,
      preferredShifts: ['10:00-18:00', '14:00-22:00'],
      avoidShifts: ['18:00-02:00']
    }
  },
  {
    id: '4',
    name: 'Anna Sous Chef',
    department: 'Cucina',
    hourlyRate: 16,
    skills: ['Cooking', 'Prep Work', 'Team Leadership'],
    availability: {
      'monday': ['06:00-14:00', '10:00-18:00'],
      'tuesday': ['06:00-14:00', '10:00-18:00'],
      'wednesday': ['06:00-14:00', '10:00-18:00'],
      'thursday': ['06:00-14:00', '10:00-18:00'],
      'friday': ['06:00-14:00', '10:00-18:00', '15:00-23:00'],
      'saturday': ['10:00-18:00', '15:00-23:00'],
      'sunday': ['10:00-18:00']
    },
    preferences: {
      maxHoursPerDay: 8,
      preferredShifts: ['06:00-14:00', '10:00-18:00'],
      avoidShifts: ['18:00-02:00']
    }
  },
  {
    id: '5',
    name: 'Marco Cameriere',
    department: 'Sala',
    hourlyRate: 12,
    skills: ['Service', 'Wine Knowledge', 'Table Management'],
    availability: {
      'monday': ['09:00-17:00', '14:00-22:00'],
      'tuesday': ['09:00-17:00', '14:00-22:00'],
      'wednesday': ['09:00-17:00', '14:00-22:00'],
      'thursday': ['09:00-17:00', '14:00-22:00'],
      'friday': ['09:00-17:00', '14:00-22:00', '18:00-24:00'],
      'saturday': ['14:00-22:00', '18:00-24:00'],
      'sunday': ['14:00-22:00']
    },
    preferences: {
      maxHoursPerDay: 8,
      preferredShifts: ['09:00-17:00', '14:00-22:00'],
      avoidShifts: ['18:00-24:00']
    }
  },
  {
    id: '6',
    name: 'Sofia Cassiera',
    department: 'Sala',
    hourlyRate: 11,
    skills: ['Cashier', 'Customer Service'],
    availability: {
      'monday': ['09:00-17:00', '14:00-22:00'],
      'tuesday': ['09:00-17:00'],
      'wednesday': ['14:00-22:00'],
      'thursday': ['09:00-17:00', '14:00-22:00'],
      'friday': ['14:00-22:00'],
      'saturday': ['09:00-17:00', '14:00-22:00'],
      'sunday': ['09:00-17:00']
    },
    preferences: {
      maxHoursPerDay: 8,
      preferredShifts: ['09:00-17:00'],
      avoidShifts: []
    }
  }
]

// Storico turni mock per demo
const historicalShifts: Shift[] = [
  // Ultimi 30 giorni di turni per apprendimento
  { id: '1', date: '2024-01-01', startTime: '06:00', endTime: '14:00', department: 'Cucina', employeeId: '1', status: 'completed', performance: 9 },
  { id: '2', date: '2024-01-01', startTime: '09:00', endTime: '17:00', department: 'Sala', employeeId: '2', status: 'completed', performance: 8 },
  { id: '3', date: '2024-01-01', startTime: '10:00', endTime: '18:00', department: 'Bar', employeeId: '3', status: 'completed', performance: 7 },
  // ... altri turni storici
]

// Funzione principale per generare suggerimenti AI
export function generateAISuggestions(
  date: string,
  bookings: Booking[] = [],
  events: CompanyEvent[] = [],
  existingShifts: Shift[] = []
): AISuggestion[] {
  const suggestions: AISuggestion[] = []
  const dayOfWeek = getDayOfWeek(date)
  
  // Calcola coperti previsti basati su prenotazioni
  const expectedCovers = calculateExpectedCovers(date, bookings, events)
  
  // Per ogni reparto, genera suggerimenti
  for (const pattern of shiftPatterns) {
    const departmentSuggestions = generateDepartmentSuggestions(
      date,
      pattern,
      expectedCovers,
      existingShifts,
      dayOfWeek
    )
    suggestions.push(...departmentSuggestions)
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Genera suggerimenti per un reparto specifico
function generateDepartmentSuggestions(
  date: string,
  pattern: ShiftPattern,
  expectedCovers: number,
  existingShifts: Shift[],
  dayOfWeek: string
): AISuggestion[] {
  const suggestions: AISuggestion[] = []
  const departmentEmployees = employees.filter(emp => emp.department === pattern.department)
  
  for (const timeSlot of pattern.timeSlots) {
    // Controlla se il turno è già coperto
    const existingShift = existingShifts.find(shift => 
      shift.date === date && 
      shift.department === pattern.department &&
      shift.startTime === timeSlot.startTime
    )
    
    if (existingShift) continue
    
    // Calcola numero dipendenti necessari basato su coperti
    const requiredEmployees = calculateRequiredEmployees(
      timeSlot,
      expectedCovers,
      pattern.department
    )
    
    // Trova i migliori dipendenti per questo turno
    const bestEmployees = findBestEmployees(
      departmentEmployees,
      timeSlot,
      dayOfWeek,
      date
    )
    
    // Crea suggerimenti per ogni dipendente necessario
    for (let i = 0; i < requiredEmployees && i < bestEmployees.length; i++) {
      const employee = bestEmployees[i]
      const confidence = calculateConfidence(employee, timeSlot, dayOfWeek, expectedCovers)
      const reasoning = generateReasoning(employee, timeSlot, expectedCovers, dayOfWeek)
      
      suggestions.push({
        id: `${date}-${pattern.department}-${timeSlot.startTime}-${employee.id}`,
        date,
        department: pattern.department,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        suggestedEmployee: employee,
        confidence,
        reasoning,
        alternatives: bestEmployees.slice(1, 3) // Prime 2 alternative
      })
    }
  }
  
  return suggestions
}

// Calcola coperti previsti per una data
function calculateExpectedCovers(date: string, bookings: Booking[], events: CompanyEvent[]): number {
  // Base covers per giorno della settimana
  const baseCovers = {
    'monday': 40,
    'tuesday': 45,
    'wednesday': 50,
    'thursday': 55,
    'friday': 70,
    'saturday': 80,
    'sunday': 60
  }
  
  const dayOfWeek = getDayOfWeek(date)
  let expectedCovers = baseCovers[dayOfWeek as keyof typeof baseCovers] || 50
  
  // Aggiungi coperti dalle prenotazioni
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' && b.date === date)
  const bookedCovers = confirmedBookings.reduce((sum, booking) => sum + booking.partySize, 0)
  
  if (bookedCovers > 0) {
    // Usa prenotazioni come base + 20% per clienti senza prenotazione
    expectedCovers = Math.round(bookedCovers * 1.2)
  }
  
  // Applica moltiplicatore per eventi
  const event = events.find(e => e.date === date)
  if (event) {
    expectedCovers = Math.round(expectedCovers * event.expectedCoversMultiplier)
  }
  
  return expectedCovers
}

// Calcola numero dipendenti necessari per un turno
function calculateRequiredEmployees(
  timeSlot: TimeSlot,
  expectedCovers: number,
  department: string
): number {
  const baseRequirements = {
    'Cucina': { min: 1, max: 4, coversPerEmployee: 15 },
    'Sala': { min: 2, max: 6, coversPerEmployee: 8 },
    'Bar': { min: 1, max: 3, coversPerEmployee: 20 }
  }
  
  const dept = baseRequirements[department as keyof typeof baseRequirements]
  if (!dept) return 1
  
  const required = Math.ceil(expectedCovers / dept.coversPerEmployee)
  return Math.max(dept.min, Math.min(dept.max, required))
}

// Trova i migliori dipendenti per un turno
function findBestEmployees(
  employees: Employee[],
  timeSlot: TimeSlot,
  dayOfWeek: string,
  date: string
): Employee[] {
  return employees
    .filter(emp => isEmployeeAvailable(emp, timeSlot, dayOfWeek))
    .sort((a, b) => {
      const scoreA = calculateEmployeeScore(a, timeSlot, dayOfWeek, date)
      const scoreB = calculateEmployeeScore(b, timeSlot, dayOfWeek, date)
      return scoreB - scoreA
    })
}

// Controlla se un dipendente è disponibile
function isEmployeeAvailable(employee: Employee, timeSlot: TimeSlot, dayOfWeek: string): boolean {
  const availability = employee.availability[dayOfWeek]
  if (!availability) return false
  
  const shiftTime = `${timeSlot.startTime}-${timeSlot.endTime}`
  return availability.includes(shiftTime)
}

// Calcola score di un dipendente per un turno
function calculateEmployeeScore(
  employee: Employee,
  timeSlot: TimeSlot,
  dayOfWeek: string,
  date: string
): number {
  let score = 0
  
  // Score basato su preferenze
  const shiftTime = `${timeSlot.startTime}-${timeSlot.endTime}`
  if (employee.preferences.preferredShifts.includes(shiftTime)) {
    score += 30
  }
  if (employee.preferences.avoidShifts.includes(shiftTime)) {
    score -= 20
  }
  
  // Score basato su performance storica
  const historicalPerformance = getHistoricalPerformance(employee.id, timeSlot, dayOfWeek)
  score += historicalPerformance * 2
  
  // Score basato su disponibilità
  score += 20
  
  // Score basato su costo (preferisci dipendenti meno costosi per turni meno critici)
  const isPeakTime = isPeakHour(timeSlot.startTime)
  if (!isPeakTime) {
    score += (20 - employee.hourlyRate) * 0.5
  }
  
  return Math.max(0, score)
}

// Ottieni performance storica di un dipendente
function getHistoricalPerformance(employeeId: string, timeSlot: TimeSlot, dayOfWeek: string): number {
  const historicalShiftsForEmployee = historicalShifts.filter(shift => 
    shift.employeeId === employeeId && shift.date === dayOfWeek
  )
  
  const shiftTime = `${timeSlot.startTime}-${timeSlot.endTime}`
  const matchingShifts = historicalShiftsForEmployee.filter(shift => {
    const st = `${shift.startTime}-${shift.endTime}`
    return st === shiftTime
  })
  
  if (matchingShifts.length === 0) return 0
  
  const averageScore = matchingShifts.reduce((sum, shift) => sum + (shift.performance ?? 5), 0) / matchingShifts.length
  return averageScore
}

// Controlla se è un'ora di punta
function isPeakHour(time: string): boolean {
  const hour = parseInt(time.split(':')[0])
  return hour >= 18 && hour <= 22
}

// Calcola confidenza del suggerimento
function calculateConfidence(
  employee: Employee,
  timeSlot: TimeSlot,
  dayOfWeek: string,
  expectedCovers: number
): number {
  let confidence = 50 // Base confidence
  
  // Aumenta confidenza se dipendente ha preferenze per questo turno
  const shiftTime = `${timeSlot.startTime}-${timeSlot.endTime}`
  if (employee.preferences.preferredShifts.includes(shiftTime)) {
    confidence += 25
  }
  
  // Aumenta confidenza se performance storica è buona
  const historicalPerformance = getHistoricalPerformance(employee.id, timeSlot, dayOfWeek)
  confidence += (historicalPerformance - 5) * 3
  
  // Aumenta confidenza se è un turno standard
  if (isStandardShift(timeSlot)) {
    confidence += 15
  }
  
  // Diminuisce confidenza se è un turno complesso
  if (expectedCovers > 60) {
    confidence -= 10
  }
  
  return Math.max(0, Math.min(100, confidence))
}

// Controlla se è un turno standard
function isStandardShift(timeSlot: TimeSlot): boolean {
  const standardShifts = [
    '09:00-17:00',
    '14:00-22:00',
    '10:00-18:00',
    '06:00-14:00'
  ]
  
  const shiftTime = `${timeSlot.startTime}-${timeSlot.endTime}`
  return standardShifts.includes(shiftTime)
}

// Genera reasoning per il suggerimento
function generateReasoning(
  employee: Employee,
  timeSlot: TimeSlot,
  expectedCovers: number,
  dayOfWeek: string
): string {
  const reasons: string[] = []
  
  const shiftTime = `${timeSlot.startTime}-${timeSlot.endTime}`
  
  // Reasoning basato su preferenze
  if (employee.preferences.preferredShifts.includes(shiftTime)) {
    reasons.push('Turno preferito dal dipendente')
  }
  
  // Reasoning basato su performance
  const historicalPerformance = getHistoricalPerformance(employee.id, timeSlot, dayOfWeek)
  if (historicalPerformance > 7) {
    reasons.push('Ottima performance storica in questo turno')
  } else if (historicalPerformance > 5) {
    reasons.push('Buona performance storica')
  }
  
  // Reasoning basato su disponibilità
  reasons.push('Disponibile per questo orario')
  
  // Reasoning basato su coperti
  if (expectedCovers > 60) {
    reasons.push('Alto afflusso previsto - esperienza necessaria')
  } else if (expectedCovers < 30) {
    reasons.push('Basso afflusso previsto')
  }
  
  // Reasoning basato su giorno
  if (dayOfWeek === 'friday' || dayOfWeek === 'saturday') {
    reasons.push('Giorno di punta - personale esperto richiesto')
  }
  
  return reasons.join(', ')
}

// Utility functions
function getDayOfWeek(date: string): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date(date).getDay()]
}

// Funzioni per gestione suggerimenti
export function acceptAISuggestion(suggestionId: string): boolean {
  // In produzione, salverebbe il turno nel database
  console.log('Suggerimento AI accettato:', suggestionId)
  return true
}

export function modifyAISuggestion(suggestionId: string, modifications: Partial<AISuggestion>): boolean {
  // In produzione, modificherebbe il suggerimento
  console.log('Suggerimento AI modificato:', suggestionId, modifications)
  return true
}

export function rejectAISuggestion(suggestionId: string, reason: string): boolean {
  // In produzione, registrerebbe il rifiuto per apprendimento
  console.log('Suggerimento AI rifiutato:', suggestionId, reason)
  return true
}

// Funzioni per apprendimento
export function learnFromShiftPerformance(shiftId: string, performance: number): void {
  // In produzione, aggiornerebbe il modello AI
  console.log('Apprendimento da performance turno:', shiftId, performance)
}

export function learnFromBookingPatterns(bookings: Booking[]): void {
  // In produzione, aggiornerebbe i pattern di prenotazione
  console.log('Apprendimento da pattern prenotazioni:', bookings.length)
}

export function learnFromEventImpact(events: CompanyEvent[]): void {
  // In produzione, aggiornerebbe l'impatto degli eventi
  console.log('Apprendimento da impatto eventi:', events.length)
}
