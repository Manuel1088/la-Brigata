// Sistema di Calcolo Break-Even Point per La Brigata
// Calcolo automatico del punto di pareggio giornaliero

export interface EmployeeCost {
  id: string
  name: string
  hourlyRate: number
  hoursWorked: number
  totalCost: number
  department: string
}

export interface DailyForecast {
  date: string
  expectedCovers: number
  averageTicket: number
  expectedRevenue: number
  employeeCosts: EmployeeCost[]
  totalEmployeeCost: number
  fixedCosts: number
  breakEvenCovers: number
  breakEvenRevenue: number
  profitMargin: number
  isEventDay: boolean
  eventMultiplier: number
}

export interface CompanyEvent {
  id: string
  name: string
  date: string
  type: 'internal' | 'external' | 'holiday' | 'special'
  expectedCoversMultiplier: number
  description: string
  isRecurring: boolean
}

export interface Booking {
  id: string
  date: string
  time: string
  partySize: number
  status: string
}

// Eventi aziendali e calendario interno
const companyEvents: CompanyEvent[] = [
  {
    id: '1',
    name: 'Natale',
    date: '2024-12-25',
    type: 'holiday',
    expectedCoversMultiplier: 0,
    description: 'Chiusura per festività',
    isRecurring: true
  },
  {
    id: '2',
    name: 'Capodanno',
    date: '2024-12-31',
    type: 'holiday',
    expectedCoversMultiplier: 0,
    description: 'Chiusura per festività',
    isRecurring: true
  },
  {
    id: '3',
    name: 'Cena Aziendale',
    date: '2024-12-20',
    type: 'internal',
    expectedCoversMultiplier: 2.5,
    description: 'Cena di Natale per il team',
    isRecurring: false
  },
  {
    id: '4',
    name: 'Festa della Repubblica',
    date: '2024-06-02',
    type: 'holiday',
    expectedCoversMultiplier: 0,
    description: 'Chiusura per festività nazionale',
    isRecurring: true
  },
  {
    id: '5',
    name: 'Festa del Lavoro',
    date: '2024-05-01',
    type: 'holiday',
    expectedCoversMultiplier: 0,
    description: 'Chiusura per festività nazionale',
    isRecurring: true
  },
  {
    id: '6',
    name: 'Evento Speciale - Degustazione Vini',
    date: '2024-12-15',
    type: 'special',
    expectedCoversMultiplier: 1.8,
    description: 'Serata speciale con degustazione vini locali',
    isRecurring: false
  }
]

// Configurazione costi fissi giornalieri
const DAILY_FIXED_COSTS = {
  rent: 150, // Affitto giornaliero
  utilities: 80, // Bollette (luce, gas, acqua)
  insurance: 25, // Assicurazioni
  maintenance: 30, // Manutenzione
  marketing: 40, // Marketing e pubblicità
  other: 35 // Altri costi fissi
}

// Configurazione media per giorno della settimana
const WEEKLY_PATTERNS = {
  monday: { baseCovers: 45, avgTicket: 28 },
  tuesday: { baseCovers: 52, avgTicket: 32 },
  wednesday: { baseCovers: 48, avgTicket: 30 },
  thursday: { baseCovers: 65, avgTicket: 35 },
  friday: { baseCovers: 85, avgTicket: 42 },
  saturday: { baseCovers: 95, avgTicket: 45 },
  sunday: { baseCovers: 70, avgTicket: 38 }
}

// Mock data dipendenti presenti oggi
const todayEmployees: EmployeeCost[] = [
  {
    id: '1',
    name: 'Giuseppe Rossi',
    hourlyRate: 25.00,
    hoursWorked: 8,
    totalCost: 200.00,
    department: 'cucina'
  },
  {
    id: '2',
    name: 'Maria Bianchi',
    hourlyRate: 18.00,
    hoursWorked: 6,
    totalCost: 108.00,
    department: 'sala'
  },
  {
    id: '3',
    name: 'Luca Verdi',
    hourlyRate: 20.00,
    hoursWorked: 7,
    totalCost: 140.00,
    department: 'sala'
  },
  {
    id: '4',
    name: 'Anna Neri',
    hourlyRate: 22.00,
    hoursWorked: 5,
    totalCost: 110.00,
    department: 'cucina'
  },
  {
    id: '5',
    name: 'Marco Blu',
    hourlyRate: 16.00,
    hoursWorked: 4,
    totalCost: 64.00,
    department: 'bar'
  }
]

// Funzioni di utilità
export function getDayOfWeek(date: string): keyof typeof WEEKLY_PATTERNS {
  const day = new Date(date).getDay()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[day] as keyof typeof WEEKLY_PATTERNS
}

export function getCompanyEvents(date: string): CompanyEvent[] {
  return companyEvents.filter(event => event.date === date)
}

export function calculateDailyFixedCosts(): number {
  return Object.values(DAILY_FIXED_COSTS).reduce((sum, cost) => sum + cost, 0)
}

export function calculateEmployeeCosts(employees: EmployeeCost[]): number {
  return employees.reduce((sum, emp) => sum + emp.totalCost, 0)
}

export function calculateBreakEvenPoint(
  totalCosts: number,
  averageTicket: number
): { covers: number; revenue: number } {
  const breakEvenCovers = Math.ceil(totalCosts / averageTicket)
  const breakEvenRevenue = breakEvenCovers * averageTicket
  
  return {
    covers: breakEvenCovers,
    revenue: breakEvenRevenue
  }
}

export function calculateDailyForecast(date: string, employees: EmployeeCost[] = todayEmployees): DailyForecast {
  const dayOfWeek = getDayOfWeek(date)
  const events = getCompanyEvents(date)
  const isEventDay = events.length > 0
  const eventMultiplier = isEventDay ? events[0].expectedCoversMultiplier : 1
  
  // Calcola costi
  const totalEmployeeCost = calculateEmployeeCosts(employees)
  const fixedCosts = calculateDailyFixedCosts()
  const totalCosts = totalEmployeeCost + fixedCosts
  
  // Calcola previsioni
  const basePattern = WEEKLY_PATTERNS[dayOfWeek]
  const expectedCovers = Math.round(basePattern.baseCovers * eventMultiplier)
  const averageTicket = basePattern.avgTicket
  const expectedRevenue = expectedCovers * averageTicket
  
  // Calcola break-even
  const breakEven = calculateBreakEvenPoint(totalCosts, averageTicket)
  const profitMargin = expectedRevenue > 0 ? ((expectedRevenue - totalCosts) / expectedRevenue) * 100 : 0
  
  return {
    date,
    expectedCovers,
    averageTicket,
    expectedRevenue,
    employeeCosts: employees,
    totalEmployeeCost,
    fixedCosts,
    breakEvenCovers: breakEven.covers,
    breakEvenRevenue: breakEven.revenue,
    profitMargin,
    isEventDay,
    eventMultiplier
  }
}

export function getWeeklyForecast(startDate: string): DailyForecast[] {
  const forecasts: DailyForecast[] = []
  const start = new Date(startDate)
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Per i giorni futuri, usa dipendenti previsti (stesso team di oggi)
    const forecast = calculateDailyForecast(dateStr, todayEmployees)
    forecasts.push(forecast)
  }
  
  return forecasts
}

export function getMonthlySummary(year: number, month: number): {
  totalExpectedRevenue: number
  totalCosts: number
  totalProfit: number
  averageDailyCovers: number
  breakEvenDays: number
  profitableDays: number
} {
  const daysInMonth = new Date(year, month, 0).getDate()
  let totalExpectedRevenue = 0
  let totalCosts = 0
  let totalCovers = 0
  let breakEvenDays = 0
  let profitableDays = 0
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    const forecast = calculateDailyForecast(date)
    
    totalExpectedRevenue += forecast.expectedRevenue
    totalCosts += forecast.totalEmployeeCost + forecast.fixedCosts
    totalCovers += forecast.expectedCovers
    
    if (forecast.expectedRevenue >= forecast.breakEvenRevenue) {
      profitableDays++
    } else {
      breakEvenDays++
    }
  }
  
  return {
    totalExpectedRevenue,
    totalCosts,
    totalProfit: totalExpectedRevenue - totalCosts,
    averageDailyCovers: Math.round(totalCovers / daysInMonth),
    breakEvenDays,
    profitableDays
  }
}

// Funzioni per gestire eventi aziendali
export function addCompanyEvent(event: Omit<CompanyEvent, 'id'>): CompanyEvent {
  const newEvent: CompanyEvent = {
    ...event,
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  companyEvents.push(newEvent)
  return newEvent
}

export function updateCompanyEvent(eventId: string, updates: Partial<CompanyEvent>): boolean {
  const index = companyEvents.findIndex(event => event.id === eventId)
  if (index !== -1) {
    companyEvents[index] = { ...companyEvents[index], ...updates }
    return true
  }
  return false
}

export function deleteCompanyEvent(eventId: string): boolean {
  const index = companyEvents.findIndex(event => event.id === eventId)
  if (index !== -1) {
    companyEvents.splice(index, 1)
    return true
  }
  return false
}

export function getAllCompanyEvents(): CompanyEvent[] {
  return companyEvents
}

// Funzioni per analisi avanzate
export function getBreakEvenAnalysis(date: string): {
  currentStatus: 'profitable' | 'break-even' | 'loss'
  coversNeeded: number
  revenueNeeded: number
  timeToBreakEven: string
  recommendations: string[]
} {
  const forecast = calculateDailyForecast(date)
  const currentTime = new Date()
  const currentHour = currentTime.getHours()
  
  // Simula coperti attuali (esempio)
  const currentCovers = Math.round(forecast.expectedCovers * (currentHour / 24) * 0.3)
  const currentRevenue = currentCovers * forecast.averageTicket
  
  let status: 'profitable' | 'break-even' | 'loss'
  let coversNeeded = 0
  let revenueNeeded = 0
  
  if (currentRevenue >= forecast.breakEvenRevenue) {
    status = 'profitable'
  } else if (currentRevenue >= forecast.breakEvenRevenue * 0.8) {
    status = 'break-even'
    coversNeeded = forecast.breakEvenCovers - currentCovers
    revenueNeeded = forecast.breakEvenRevenue - currentRevenue
  } else {
    status = 'loss'
    coversNeeded = forecast.breakEvenCovers - currentCovers
    revenueNeeded = forecast.breakEvenRevenue - currentRevenue
  }
  
  // Calcola tempo stimato per raggiungere break-even
  const hoursRemaining = 24 - currentHour
  const coversPerHour = coversNeeded / hoursRemaining
  const timeToBreakEven = coversPerHour > 0 ? `${Math.ceil(coversPerHour)} coperti/ora` : 'Obiettivo raggiunto'
  
  // Raccomandazioni
  const recommendations: string[] = []
  
  if (status === 'loss') {
    recommendations.push('Considera promozioni per aumentare l\'affluenza')
    recommendations.push('Verifica se il personale è ottimizzato per il volume')
  }
  
  if (forecast.isEventDay) {
    recommendations.push('Giorno evento speciale - monitora attentamente')
  }
  
  if (forecast.profitMargin < 10) {
    recommendations.push('Margine di profitto basso - rivedi i costi')
  }
  
  return {
    currentStatus: status,
    coversNeeded,
    revenueNeeded,
    timeToBreakEven,
    recommendations
  }
}
