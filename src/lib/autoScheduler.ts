// lib/autoScheduler.ts
import { getEmployeesClient, type SimpleEmployee } from '@/lib/employees'
import { getLeaveRequests, LEAVE_TYPES } from '@/lib/leaveSystem'
import { getRestRuleFor } from '@/lib/restRules'

interface ShiftCell {
  employee: string
  time?: string
  department?: string
  role?: string
}

interface HistoricalPattern {
  employee: string
  preferredShifts: { [dayIndex: number]: string[] } // Turni preferiti per giorno
  preferredRestDays: number[] // Giorni di riposo preferiti (0-6)
  avgWeeklyHours: number
  avgRestDays: number // Media giorni di riposo settimanali
  preferredDays: number[] // Giorni preferiti per lavorare (0-6)
  avoidedDays: number[] // Giorni evitati per lavorare
  restPatterns: { [dayIndex: number]: number } // Frequenza riposo per giorno (0-1)
  weekendWorkFrequency: number // Quanto spesso lavora nei weekend (0-1)
  consistency: number // 0-1, quanto è consistente nei pattern
}

interface SchedulingConstraints {
  hardConstraints: {
    maxWeeklyHours: number // 48h CCNL
    minRestHours: number // 11h CCNL
    maxConsecutiveDays: number // 6 giorni CCNL
    minWeeklyRest: number // 36h CCNL
  }
  softConstraints: {
    preferredWorkload: number // Ore settimanali target
    balanceWorkload: boolean // Bilancia ore tra dipendenti
    respectPreferences: boolean // Rispetta preferenze storiche
    minimizeChanges: boolean // Minimizza cambi rispetto ai pattern
  }
}

interface DepartmentRequirements {
  department: string
  minCoverage: { [dayIndex: number]: { [timeSlot: string]: number } }
  specialEvents: { date: string; extraStaff: number }[]
}

export class AutoScheduler {
  private employees: SimpleEmployee[]
  private constraints: SchedulingConstraints
  private historicalData: Map<string, HistoricalPattern>
  
  constructor() {
    this.employees = getEmployeesClient()
    this.constraints = {
      hardConstraints: {
        maxWeeklyHours: 48,
        minRestHours: 11,
        maxConsecutiveDays: 6,
        minWeeklyRest: 36
      },
      softConstraints: {
        preferredWorkload: 40,
        balanceWorkload: true,
        respectPreferences: true,
        minimizeChanges: false
      }
    }
    this.historicalData = new Map()
  }

  /**
   * Analizza i turni delle ultime 12 settimane per identificare pattern (inclusi riposi)
   */
  analyzeHistoricalPatterns(): Map<string, HistoricalPattern> {
    const patterns = new Map<string, HistoricalPattern>()
    const weeksToAnalyze = 12
    
    this.employees.forEach(employee => {
      const pattern: HistoricalPattern = {
        employee: employee.name,
        preferredShifts: {},
        preferredRestDays: [],
        avgWeeklyHours: 0,
        avgRestDays: 0,
        preferredDays: [],
        avoidedDays: [],
        restPatterns: {},
        weekendWorkFrequency: 0,
        consistency: 0
      }
      
      let totalHours = 0
      let totalRestDays = 0
      let weekCount = 0
      let weekendWorkCount = 0
      const dayCounter: { [day: number]: number } = {}
      const restCounter: { [day: number]: number } = {}
      const shiftCounter: { [day: number]: { [shift: string]: number } } = {}
      
      // Analizza ultime 12 settimane
      for (let week = 0; week < weeksToAnalyze; week++) {
        const weekStart = this.getWeekStart(new Date())
        weekStart.setDate(weekStart.getDate() - (week * 7))
        
        const weekShifts = this.loadWeekShifts(weekStart)
        if (!weekShifts) continue
        
        let weekHours = 0
        let weekRestDays = 0
        let weekendWorked = false
        weekCount++
        
        for (let day = 0; day < 7; day++) {
          const key = `${employee.name}-${day}`
          const shift = weekShifts[key]
          const isWeekend = day === 5 || day === 6 // Sabato = 5, Domenica = 6
          
          if (shift?.time) {
            if (shift.time === 'RIPOSO' || shift.time === 'FERIE') {
              // Conta riposi
              restCounter[day] = (restCounter[day] || 0) + 1
              weekRestDays++
            } else {
              // Conta giorni lavorati
              dayCounter[day] = (dayCounter[day] || 0) + 1
              
              // Conta turni per giorno
              if (!shiftCounter[day]) shiftCounter[day] = {}
              shiftCounter[day][shift.time] = (shiftCounter[day][shift.time] || 0) + 1
              
              // Calcola ore
              weekHours += this.calculateShiftHours(shift.time)
              
              // Traccia lavoro weekend
              if (isWeekend) weekendWorked = true
            }
          } else {
            // Nessun turno assegnato = considera riposo implicito
            restCounter[day] = (restCounter[day] || 0) + 1
            weekRestDays++
          }
        }
        
        totalHours += weekHours
        totalRestDays += weekRestDays
        if (weekendWorked) weekendWorkCount++
      }
      
      if (weekCount > 0) {
        // Calcola medie
        pattern.avgWeeklyHours = totalHours / weekCount
        pattern.avgRestDays = totalRestDays / weekCount
        pattern.weekendWorkFrequency = weekendWorkCount / weekCount
        
        // Identifica giorni preferiti per lavorare (>60% delle settimane)
        pattern.preferredDays = Object.entries(dayCounter)
          .filter(([_, count]) => count / weekCount > 0.6)
          .map(([day, _]) => parseInt(day))
        
        // Identifica giorni preferiti per riposare (>60% delle settimane)
        pattern.preferredRestDays = Object.entries(restCounter)
          .filter(([_, count]) => count / weekCount > 0.6)
          .map(([day, _]) => parseInt(day))
        
        // Identifica giorni generalmente evitati per lavorare (<20% delle settimane)
        pattern.avoidedDays = Array.from({length: 7}, (_, i) => i)
          .filter(day => (dayCounter[day] || 0) / weekCount < 0.2)
        
        // Calcola pattern di riposo per giorno (frequenza 0-1)
        for (let day = 0; day < 7; day++) {
          pattern.restPatterns[day] = (restCounter[day] || 0) / weekCount
        }
        
        // Identifica turni preferiti per giorno
        Object.entries(shiftCounter).forEach(([dayStr, shifts]) => {
          const day = parseInt(dayStr)
          const totalShiftsForDay = Object.values(shifts).reduce((a, b) => a + b, 0)
          
          pattern.preferredShifts[day] = Object.entries(shifts)
            .filter(([_, count]) => count / totalShiftsForDay > 0.4)
            .map(([shift, _]) => shift)
            .sort((a, b) => shifts[b] - shifts[a])
        })
        
        // Calcola consistency (quanto sono regolari i pattern)
        const workConsistency = pattern.preferredDays.length / 7
        const restConsistency = pattern.preferredRestDays.length / 7
        const shiftConsistency = Object.keys(pattern.preferredShifts).length / 7
        pattern.consistency = (workConsistency + restConsistency + shiftConsistency) / 3
      }
      
      patterns.set(employee.name, pattern)
    })
    
    this.historicalData = patterns
    return patterns
  }

  /**
   * Genera turni automaticamente per una settimana specifica
   */
  async generateWeekSchedule(weekStart: Date): Promise<{ [key: string]: ShiftCell }> {
    console.log('🤖 Avvio auto-scheduling per settimana:', this.toISODate(weekStart))
    
    // 1. Analizza pattern storici
    if (this.historicalData.size === 0) {
      this.analyzeHistoricalPatterns()
    }
    
    // 2. Raccoglie vincoli della settimana
    const weekConstraints = await this.collectWeekConstraints(weekStart)
    
    // 3. Inizializza schedule vuoto
    const schedule: { [key: string]: ShiftCell } = {}
    
    // 4. Applica vincoli hard (ferie, riposi fissi)
    this.applyHardConstraints(schedule, weekStart, weekConstraints)
    
    // 5. Algoritmo di ottimizzazione con gestione riposi
    const optimizedSchedule = this.optimizeSchedule(schedule, weekStart, weekConstraints)
    
    // 6. Verifica finale compliance CCNL
    const validatedSchedule = this.validateAndFix(optimizedSchedule, weekStart)
    
    console.log('✅ Auto-scheduling completato')
    return validatedSchedule
  }

  /**
   * Raccoglie tutti i vincoli per la settimana specifica
   */
  private async collectWeekConstraints(weekStart: Date) {
    const constraints = {
      leaves: new Map<string, string[]>(),
      fixedRests: new Map<string, number[]>(),
      departmentRequirements: this.getDepartmentRequirements(weekStart),
      specialEvents: this.getSpecialEvents(weekStart)
    }
    
    // Raccoglie ferie/permessi approvati
    this.employees.forEach(employee => {
      const userIdMap: Record<string, string> = {
        'Giuseppe Chef': '1',
        'Maria Cameriera': '2',
        'Luca Barista': '3',
        'Anna Sous Chef': '4',
        'Marco Cameriere': '5',
        'Sofia Cassiera': '6'
      }
      
      const userId = userIdMap[employee.name]
      if (userId) {
        const leaves = getLeaveRequests(userId)
          .filter(req => req.status === 'APPROVED')
          .filter(req => this.dateRangeOverlaps(
            req.startDate, req.endDate, weekStart, this.getWeekEnd(weekStart)
          ))
        
        if (leaves.length > 0) {
          const leaveDays: string[] = []
          leaves.forEach(leave => {
            const days = this.getDaysInRange(leave.startDate, leave.endDate, weekStart)
            leaveDays.push(...days)
          })
          constraints.leaves.set(employee.name, leaveDays)
        }
      }
      
      // Raccoglie giorni fissi di riposo
      const restRule = getRestRuleFor(employee.name)
      if (restRule?.fixedDayIndices) {
        constraints.fixedRests.set(employee.name, restRule.fixedDayIndices)
      }
    })
    
    return constraints
  }

  /**
   * Applica vincoli hard non negoziabili
   */
  private applyHardConstraints(schedule: { [key: string]: ShiftCell }, weekStart: Date, constraints: any) {
    this.employees.forEach(employee => {
      // Applica ferie/permessi
      const leaves = constraints.leaves.get(employee.name) || []
      leaves.forEach((leaveDay: string) => {
        const dayIndex = this.getDayIndexFromDate(leaveDay, weekStart)
        if (dayIndex >= 0 && dayIndex < 7) {
          const key = `${employee.name}-${dayIndex}`
          schedule[key] = {
            employee: employee.name,
            time: 'FERIE',
            department: employee.department,
            role: employee.role
          }
        }
      })
      
      // Applica riposi fissi
      const fixedRests = constraints.fixedRests.get(employee.name) || []
      fixedRests.forEach((dayIndex: number) => {
        if (dayIndex >= 0 && dayIndex < 7) {
          const key = `${employee.name}-${dayIndex}`
          if (!schedule[key]) { // Solo se non già assegnato per ferie
            schedule[key] = {
              employee: employee.name,
              time: 'RIPOSO',
              department: employee.department,
              role: employee.role
            }
          }
        }
      })
    })
  }

  /**
   * Algoritmo di ottimizzazione che include gestione intelligente dei riposi
   */
  private optimizeSchedule(
    baseSchedule: { [key: string]: ShiftCell }, 
    weekStart: Date, 
    constraints: any
  ): { [key: string]: ShiftCell } {
    const schedule = { ...baseSchedule }
    
    // FASE 1: Assegna riposi obbligatori prima dei turni lavorativi
    this.assignMandatoryRests(schedule, weekStart, constraints)
    
    // FASE 2: Ottimizza turni lavorativi per ogni reparto
    const departments = ['cucina', 'sala', 'bar']
    departments.forEach(dept => {
      const deptEmployees = this.employees.filter(emp => emp.department === dept)
      this.optimizeDepartmentSchedule(schedule, deptEmployees, weekStart, constraints)
    })
    
    // FASE 3: Bilancia riposi aggiuntivi se necessario
    this.balanceAdditionalRests(schedule, weekStart)
    
    return schedule
  }

  /**
   * Assegna riposi obbligatori basandosi su vincoli CCNL e pattern storici
   */
  private assignMandatoryRests(
    schedule: { [key: string]: ShiftCell },
    weekStart: Date,
    constraints: any
  ) {
    this.employees.forEach(employee => {
      const pattern = this.historicalData.get(employee.name)
      
      // Conta giorni già assegnati (ferie/riposi fissi)
      let assignedDays = 0
      let restDays = 0
      
      for (let day = 0; day < 7; day++) {
        const key = `${employee.name}-${day}`
        const existing = schedule[key]
        if (existing) {
          assignedDays++
          if (existing.time === 'RIPOSO' || existing.time === 'FERIE') {
            restDays++
          }
        }
      }
      
      // Calcola riposi minimi necessari
      const minRestDays = this.calculateMinRestDays(employee.name, pattern)
      const additionalRestsNeeded = Math.max(0, minRestDays - restDays)
      
      if (additionalRestsNeeded > 0) {
        this.assignOptimalRestDays(employee, schedule, additionalRestsNeeded, pattern)
      }
    })
  }

  /**
   * Calcola giorni di riposo minimi necessari per un dipendente
   */
  private calculateMinRestDays(employeeName: string, pattern?: HistoricalPattern): number {
    // CCNL: minimo 1 giorno di riposo ogni 6 lavorativi
    let minRest = 1
    
    if (pattern) {
      // Considera pattern storici - se solitamente riposa 2+ giorni, mantieni abitudine
      if (pattern.avgRestDays >= 2) {
        minRest = 2
      }
      
      // Se lavora sempre nei weekend storicamente, garantisci almeno 1 giorno weekend libero ogni tanto
      if (pattern.weekendWorkFrequency > 0.8) {
        minRest = Math.max(minRest, 1)
      }
    }
    
    return Math.min(minRest, 2) // Max 2 giorni di riposo per non compromettere copertura
  }

  /**
   * Assegna giorni di riposo ottimali per un dipendente
   */
  private assignOptimalRestDays(
    employee: SimpleEmployee,
    schedule: { [key: string]: ShiftCell },
    restsNeeded: number,
    pattern?: HistoricalPattern
  ) {
    const availableDays: number[] = []
    
    // Trova giorni disponibili (non già assegnati)
    for (let day = 0; day < 7; day++) {
      const key = `${employee.name}-${day}`
      if (!schedule[key]) {
        availableDays.push(day)
      }
    }
    
    if (availableDays.length === 0) return
    
    // Ordina giorni per preferenza di riposo
    const scoredDays = availableDays.map(day => ({
      day,
      score: this.calculateRestDayScore(employee, day, pattern, schedule)
    })).sort((a, b) => b.score - a.score)
    
    // Assegna i migliori giorni di riposo
    for (let i = 0; i < Math.min(restsNeeded, scoredDays.length); i++) {
      const day = scoredDays[i].day
      const key = `${employee.name}-${day}`
      schedule[key] = {
        employee: employee.name,
        time: 'RIPOSO',
        department: employee.department,
        role: employee.role
      }
    }
  }

  /**
   * Calcola punteggio per assegnare un giorno di riposo
   */
  private calculateRestDayScore(
    employee: SimpleEmployee,
    dayIndex: number,
    pattern?: HistoricalPattern,
    schedule?: { [key: string]: ShiftCell }
  ): number {
    let score = 0
    
    if (pattern) {
      // Bonus per giorni storicamente preferiti per riposare
      const restFrequency = pattern.restPatterns[dayIndex] || 0
      score += restFrequency * 100
      
      // Bonus se fa parte dei giorni preferiti di riposo
      if (pattern.preferredRestDays.includes(dayIndex)) {
        score += 50
      }
      
      // Penalità se è un giorno tipicamente lavorativo
      if (pattern.preferredDays.includes(dayIndex)) {
        score -= 30
      }
    }
    
    // Bonus per distribuire riposi nei weekend (equilibrio work-life)
    const isWeekend = dayIndex === 5 || dayIndex === 6
    if (isWeekend) {
      score += 25
    }
    
    // Bonus per evitare troppi giorni consecutivi
    if (schedule) {
      const consecutiveWorkDays = this.calculateConsecutiveWorkDaysAroundDay(
        employee.name, dayIndex, schedule
      )
      if (consecutiveWorkDays > 3) {
        score += consecutiveWorkDays * 10 // Più giorni consecutivi = più importante riposare
      }
    }
    
    return score
  }

  /**
   * Bilancia riposi aggiuntivi per equità tra dipendenti
   */
  private balanceAdditionalRests(schedule: { [key: string]: ShiftCell }, weekStart: Date) {
    const departments = ['cucina', 'sala', 'bar']
    
    departments.forEach(dept => {
      const deptEmployees = this.employees.filter(emp => emp.department === dept)
      
      // Calcola distribuzione attuale dei riposi
      const restDistribution = deptEmployees.map(emp => ({
        employee: emp,
        restDays: this.countRestDays(emp.name, schedule),
        workDays: this.countWorkDays(emp.name, schedule)
      }))
      
      // Trova squilibri (differenze > 1 giorno di riposo)
      const avgRestDays = restDistribution.reduce((sum, emp) => sum + emp.restDays, 0) / restDistribution.length
      
      restDistribution.forEach(empData => {
        const restDifference = empData.restDays - avgRestDays
        
        // Se ha troppi pochi riposi rispetto alla media, prova ad aggiungerne
        if (restDifference < -0.5 && empData.workDays < 6) {
          this.tryAddRestDay(empData.employee, schedule)
        }
      })
    })
  }

  /**
   * Prova ad aggiungere un giorno di riposo se possibile
   */
  private tryAddRestDay(employee: SimpleEmployee, schedule: { [key: string]: ShiftCell }) {
    const pattern = this.historicalData.get(employee.name)
    
    // Trova il giorno migliore per aggiungere riposo
    for (let day = 0; day < 7; day++) {
      const key = `${employee.name}-${day}`
      if (!schedule[key]) {
        // Verifica che non comprometta la copertura minima del reparto
        const deptCoverage = this.calculateDepartmentCoverage(employee.department, day, schedule)
        if (deptCoverage > 1) { // Almeno 1 altro dipendente lavora quel giorno
          schedule[key] = {
            employee: employee.name,
            time: 'RIPOSO',
            department: employee.department,
            role: employee.role
          }
          break
        }
      }
    }
  }

  /**
   * Ottimizza schedule per un singolo reparto
   */
  private optimizeDepartmentSchedule(
    schedule: { [key: string]: ShiftCell },
    employees: SimpleEmployee[],
    weekStart: Date,
    constraints: any
  ) {
    const departmentShifts = this.getDepartmentShifts(employees[0]?.department || 'sala')
    
    // Per ogni giorno della settimana
    for (let day = 0; day < 7; day++) {
      const availableEmployees = employees.filter(emp => {
        const key = `${emp.name}-${day}`
        return !schedule[key] // Non già assegnato (ferie/riposo)
      })
      
      if (availableEmployees.length === 0) continue
      
      // Determina turni necessari per il giorno (algoritmo semplificato)
      const requiredShifts = this.getRequiredShiftsForDay(day, employees[0]?.department || 'sala')
      
      // Assegna turni basandosi su pattern storici e bilanciamento
      this.assignShiftsForDay(schedule, availableEmployees, day, requiredShifts, weekStart)
    }
  }

  /**
   * Assegna turni per un giorno specifico
   */
  private assignShiftsForDay(
    schedule: { [key: string]: ShiftCell },
    employees: SimpleEmployee[],
    dayIndex: number,
    requiredShifts: string[],
    weekStart: Date
  ) {
    // Ordina dipendenti per priority score (preferenze + bilanciamento ore)
    const scoredEmployees = employees.map(emp => ({
      employee: emp,
      score: this.calculateAssignmentScore(emp, dayIndex, schedule, weekStart)
    })).sort((a, b) => b.score - a.score)
    
    // Assegna turni ai migliori candidati
    let shiftIndex = 0
    for (let i = 0; i < Math.min(scoredEmployees.length, requiredShifts.length); i++) {
      const employee = scoredEmployees[i].employee
      const shift = requiredShifts[shiftIndex % requiredShifts.length]
      
      // Verifica vincoli CCNL prima di assegnare
      if (this.canAssignShift(employee.name, dayIndex, shift, schedule, weekStart)) {
        const key = `${employee.name}-${dayIndex}`
        schedule[key] = {
          employee: employee.name,
          time: shift,
          department: employee.department,
          role: employee.role
        }
        shiftIndex++
      }
    }
  }

  /**
   * Calcola punteggio per assegnazione turno includendo considerazioni sui riposi
   */
  private calculateAssignmentScore(
    employee: SimpleEmployee,
    dayIndex: number,
    currentSchedule: { [key: string]: ShiftCell },
    weekStart: Date
  ): number {
    let score = 0
    const pattern = this.historicalData.get(employee.name)
    
    if (pattern) {
      // Bonus per giorni preferiti lavorativi
      if (pattern.preferredDays.includes(dayIndex)) {
        score += 50
      }
      
      // Penalità forte per giorni preferiti di riposo
      if (pattern.preferredRestDays.includes(dayIndex)) {
        score -= 60
      }
      
      // Penalità per giorni evitati
      if (pattern.avoidedDays.includes(dayIndex)) {
        score -= 30
      }
      
      // Bonus per consistency
      score += pattern.consistency * 20
      
      // Considera frequency di riposo storica per questo giorno
      const restFrequency = pattern.restPatterns[dayIndex] || 0
      if (restFrequency > 0.7) {
        score -= 40 // Penalità se solitamente riposa questo giorno
      }
    }
    
    // Bilanciamento ore settimanali
    const currentWeeklyHours = this.calculateCurrentWeeklyHours(employee.name, currentSchedule)
    const targetHours = this.constraints.softConstraints.preferredWorkload
    const hoursDiff = Math.abs(currentWeeklyHours - targetHours)
    score -= hoursDiff * 2
    
    // Bonus se ha avuto pochi riposi finora questa settimana
    const currentRestDays = this.countRestDays(employee.name, currentSchedule)
    const minRestDays = this.calculateMinRestDays(employee.name, pattern)
    if (currentRestDays < minRestDays) {
      score -= 25 // Penalità per assegnare lavoro se ha bisogno di riposo
    }
    
    // Penalità per troppi giorni consecutivi
    const consecutiveDays = this.calculateConsecutiveWorkDaysAroundDay(employee.name, dayIndex, currentSchedule)
    if (consecutiveDays > 4) {
      score -= consecutiveDays * 15
    }
    
    return score
  }

  // === UTILITY FUNCTIONS AGGIUNTIVE PER GESTIONE RIPOSI ===

  /**
   * Conta giorni di riposo assegnati a un dipendente
   */
  private countRestDays(employeeName: string, schedule: { [key: string]: ShiftCell }): number {
    let restDays = 0
    for (let day = 0; day < 7; day++) {
      const shift = schedule[`${employeeName}-${day}`]
      if (shift && (shift.time === 'RIPOSO' || shift.time === 'FERIE')) {
        restDays++
      }
    }
    return restDays
  }

  /**
   * Calcola giorni lavorativi consecutivi intorno a un giorno specifico
   */
  private calculateConsecutiveWorkDaysAroundDay(
    employeeName: string, 
    dayIndex: number, 
    schedule: { [key: string]: ShiftCell }
  ): number {
    let consecutive = 1 // Il giorno corrente
    
    // Conta giorni precedenti
    for (let i = dayIndex - 1; i >= 0; i--) {
      const shift = schedule[`${employeeName}-${i}`]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        consecutive++
      } else {
        break
      }
    }
    
    // Conta giorni successivi
    for (let i = dayIndex + 1; i < 7; i++) {
      const shift = schedule[`${employeeName}-${i}`]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        consecutive++
      } else {
        break
      }
    }
    
    return consecutive
  }

  /**
   * Calcola copertura del reparto per un giorno specifico
   */
  private calculateDepartmentCoverage(
    department: string, 
    dayIndex: number, 
    schedule: { [key: string]: ShiftCell }
  ): number {
    const deptEmployees = this.employees.filter(emp => emp.department === department)
    let coverage = 0
    
    deptEmployees.forEach(emp => {
      const shift = schedule[`${emp.name}-${dayIndex}`]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        coverage++
      }
    })
    
    return coverage
  }

  /**
   * Validazione finale con controllo specifico sui riposi
   */
  private validateAndFix(
    schedule: { [key: string]: ShiftCell },
    weekStart: Date
  ): { [key: string]: ShiftCell } {
    const validatedSchedule = { ...schedule }
    const violations: string[] = []
    
    // Verifica ogni dipendente
    this.employees.forEach(employee => {
      // Controllo ore settimanali
      const weeklyHours = this.calculateCurrentWeeklyHours(employee.name, validatedSchedule)
      if (weeklyHours > 48) {
        violations.push(`${employee.name}: ${weeklyHours}h > 48h`)
        this.removeLastShift(employee.name, validatedSchedule)
      }
      
      // Controllo riposo settimanale minimo
      const restDays = this.countRestDays(employee.name, validatedSchedule)
      const workDays = this.countWorkDays(employee.name, validatedSchedule)
      
      if (restDays === 0 && workDays > 0) {
        violations.push(`${employee.name}: nessun giorno di riposo`)
        this.addMandatoryRest(employee.name, validatedSchedule)
      }
      
      // Controllo giorni consecutivi
      if (workDays > 6) {
        violations.push(`${employee.name}: ${workDays} giorni consecutivi`)
        this.addMandatoryRest(employee.name, validatedSchedule)
      }
      
      // Controllo riposo minimo tra turni
      for (let day = 1; day < 7; day++) {
        const prevShift = validatedSchedule[`${employee.name}-${day-1}`]
        const currentShift = validatedSchedule[`${employee.name}-${day}`]
        
        if (
          prevShift && currentShift &&
          prevShift.time && currentShift.time &&
          prevShift.time !== 'RIPOSO' && prevShift.time !== 'FERIE' &&
          currentShift.time !== 'RIPOSO' && currentShift.time !== 'FERIE'
        ) {
          
          const restHours = this.calculateRestBetweenShifts(prevShift.time, currentShift.time)
          if (restHours < 11) {
            violations.push(`${employee.name}: solo ${restHours}h riposo tra turni`)
            // Fix: trasforma uno dei due turni in riposo
            validatedSchedule[`${employee.name}-${day}`] = {
              employee: employee.name,
              time: 'RIPOSO',
              department: employee.department,
              role: employee.role
            }
          }
        }
      }
    })
    
    if (violations.length > 0) {
      console.warn('Violazioni CCNL corrette automaticamente:', violations)
    }
    
    return validatedSchedule
  }

  /**
   * Verifica se un turno può essere assegnato considerando anche i riposi
   */
  private canAssignShift(
    employeeName: string,
    dayIndex: number,
    shiftTime: string,
    schedule: { [key: string]: ShiftCell },
    weekStart: Date
  ): boolean {
    // 1. Verifica ore settimanali (max 48h)
    const currentHours = this.calculateCurrentWeeklyHours(employeeName, schedule)
    const shiftHours = this.calculateShiftHours(shiftTime)
    if (currentHours + shiftHours > this.constraints.hardConstraints.maxWeeklyHours) {
      return false
    }
    
    // 2. Verifica che abbia almeno 1 giorno di riposo nella settimana
    const currentRestDays = this.countRestDays(employeeName, schedule)
    const currentWorkDays = this.countWorkDays(employeeName, schedule)
    
    // Se assegno questo turno, avrà troppi giorni lavorativi senza riposo?
    if (currentRestDays === 0 && currentWorkDays >= 6) {
      return false
    }
    
    // 3. Verifica riposo minimo tra turni (11h)
    const prevDay = dayIndex - 1
    const nextDay = dayIndex + 1
    
    if (prevDay >= 0) {
      const prevShift = schedule[`${employeeName}-${prevDay}`]
      if (prevShift && prevShift.time && prevShift.time !== 'RIPOSO' && prevShift.time !== 'FERIE') {
        const restHours = this.calculateRestBetweenShifts(prevShift.time, shiftTime)
        if (restHours < this.constraints.hardConstraints.minRestHours) {
          return false
        }
      }
    }
    
    if (nextDay < 7) {
      const nextShift = schedule[`${employeeName}-${nextDay}`]
      if (nextShift && nextShift.time && nextShift.time !== 'RIPOSO' && nextShift.time !== 'FERIE') {
        const restHours = this.calculateRestBetweenShifts(shiftTime, nextShift.time)
        if (restHours < this.constraints.hardConstraints.minRestHours) {
          return false
        }
      }
    }
    
    // 4. Verifica giorni consecutivi (max 6)
    const consecutiveDays = this.calculateConsecutiveWorkDaysAroundDay(employeeName, dayIndex, schedule)
    if (consecutiveDays >= this.constraints.hardConstraints.maxConsecutiveDays) {
      return false
    }
    
    return true
  }

  // === UTILITY FUNCTIONS ===

  private calculateShiftHours(timeString: string): number {
    if (timeString === 'RIPOSO' || timeString === 'FERIE' || timeString === 'custom') return 0
    
    if (timeString.includes('/')) {
      // Turno spezzato
      const [morning, evening] = timeString.split(' / ')
      return this.calculateShiftHours(morning) + this.calculateShiftHours(evening)
    }
    
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

  private calculateRestBetweenShifts(endShift: string, startShift: string): number {
    if (endShift.includes('/') || startShift.includes('/')) {
      return 12 // Gestione semplificata per turni spezzati
    }
    
    const endTime = endShift.split('-')[1]
    const startTime = startShift.split('-')[0]
    
    if (!endTime || !startTime) return 12
    
    const [endHour, endMin] = endTime.split(':').map(Number)
    const [startHour, startMin] = startTime.split(':').map(Number)
    
    let endMinutes = endHour * 60 + endMin
    let startMinutes = startHour * 60 + startMin + (24 * 60)
    
    return (startMinutes - endMinutes) / 60
  }

  private calculateCurrentWeeklyHours(employeeName: string, schedule: { [key: string]: ShiftCell }): number {
    let totalHours = 0
    
    for (let day = 0; day < 7; day++) {
      const key = `${employeeName}-${day}`
      const shift = schedule[key]
      if (shift?.time) {
        totalHours += this.calculateShiftHours(shift.time)
      }
    }
    
    return totalHours
  }

  private calculateConsecutiveDays(employeeName: string, dayIndex: number, schedule: { [key: string]: ShiftCell }): number {
    let consecutive = 1 // Il giorno corrente
    
    // Conta giorni precedenti
    for (let i = dayIndex - 1; i >= 0; i--) {
      const shift = schedule[`${employeeName}-${i}`]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        consecutive++
      } else {
        break
      }
    }
    
    // Conta giorni successivi
    for (let i = dayIndex + 1; i < 7; i++) {
      const shift = schedule[`${employeeName}-${i}`]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        consecutive++
      } else {
        break
      }
    }
    
    return consecutive
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + diff)
    return d
  }

  private getWeekEnd(weekStart: Date): Date {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    return end
  }

  private toISODate(d: Date): string {
    const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
  }

  private loadWeekShifts(weekStart: Date): { [key: string]: ShiftCell } | null {
    try {
      const key = `shifts_${this.toISODate(weekStart)}`
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  private getDepartmentShifts(department: string): string[] {
    const shifts = {
      cucina: ['06:00-14:00', '08:00-16:00', '15:00-23:00', '10:00-22:00'],
      sala: ['07:00-15:00', '11:00-16:00', '17:00-01:00', '11:00-23:00'],
      bar: ['06:00-14:00', '17:00-21:00', '20:00-02:00', '16:00-02:00']
    }
    return shifts[department as keyof typeof shifts] || shifts.sala
  }

  private getRequiredShiftsForDay(dayIndex: number, department: string): string[] {
    // Logica semplificata: weekend richiede più personale
    const isWeekend = dayIndex === 5 || dayIndex === 6
    const baseShifts = this.getDepartmentShifts(department)
    
    if (isWeekend) {
      return baseShifts.slice(0, 3) // Più turni per weekend
    }
    return baseShifts.slice(0, 2) // Turni standard per feriali
  }

  private getDepartmentRequirements(weekStart: Date): DepartmentRequirements[] {
    // Placeholder: da integrare con sistema prenotazioni
    return []
  }

  private getSpecialEvents(weekStart: Date): any[] {
    // Placeholder: da integrare con calendario eventi
    return []
  }

  private dateRangeOverlaps(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 <= end2 && end1 >= start2
  }

  private getDaysInRange(startDate: Date, endDate: Date, weekStart: Date): string[] {
    const days: string[] = []
    const current = new Date(Math.max(startDate.getTime(), weekStart.getTime()))
    const end = new Date(Math.min(endDate.getTime(), this.getWeekEnd(weekStart).getTime()))
    
    while (current <= end) {
      days.push(this.toISODate(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  private getDayIndexFromDate(dateStr: string, weekStart: Date): number {
    const date = new Date(dateStr)
    const diffTime = date.getTime() - weekStart.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  private countWorkDays(employeeName: string, schedule: { [key: string]: ShiftCell }): number {
    let workDays = 0
    for (let day = 0; day < 7; day++) {
      const shift = schedule[`${employeeName}-${day}`]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        workDays++
      }
    }
    return workDays
  }

  private removeLastShift(employeeName: string, schedule: { [key: string]: ShiftCell }): void {
    // Rimuove l'ultimo turno assegnato per rispettare limite ore
    for (let day = 6; day >= 0; day--) {
      const key = `${employeeName}-${day}`
      const shift = schedule[key]
      if (shift && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
        delete schedule[key]
        break
      }
    }
  }

  private addMandatoryRest(employeeName: string, schedule: { [key: string]: ShiftCell }): void {
    // Aggiunge un giorno di riposo per rispettare limite giorni consecutivi
    for (let day = 0; day < 7; day++) {
      const key = `${employeeName}-${day}`
      if (!schedule[key]) {
        schedule[key] = {
          employee: employeeName,
          time: 'RIPOSO',
          department: this.employees.find(e => e.name === employeeName)?.department || 'sala',
          role: this.employees.find(e => e.name === employeeName)?.role || 'DIPENDENTE'
        }
        break
      }
    }
  }
}

// Funzione di utilità per inizializzare l'auto-scheduler
export const createAutoScheduler = (): AutoScheduler => {
  return new AutoScheduler()
}

// Hook per integrazione React
export const useAutoScheduler = () => {
  const scheduler = createAutoScheduler()
  
  const generateSchedule = async (weekStart: Date) => {
    try {
      const schedule = await scheduler.generateWeekSchedule(weekStart)
      return { success: true, schedule, error: null }
    } catch (error) {
      console.error('Errore auto-scheduling:', error)
      return { success: false, schedule: null, error: error as Error }
    }
  }
  
  const analyzePatterns = () => {
    return scheduler.analyzeHistoricalPatterns()
  }
  
  return {
    generateSchedule,
    analyzePatterns
  }
}