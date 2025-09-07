import prisma from './db'
import { getEmployeesFullClient, type EmployeeFull } from './employees'
import { getBookingsByDate } from './bookings'
import { getLeaveRequests } from '@/lib/leaveSystem'

type DepartmentKey = 'cucina' | 'sala' | 'bar'

export interface ScheduledAssignment {
  dateISO: string
  department: DepartmentKey
  employeeName: string
  startTime: string
  endTime: string
}

export interface WeeklySchedule {
  weekStartISO: string
  assignments: ScheduledAssignment[]
}

interface OptimizeInput {
  constraints: {
    maxDailyHours: number
    maxWeeklyHours: number
    minRestBetweenShifts: number
    maxConsecutiveDays: number
  }
  employees: EmployeeFull[]
  availability: Record<string, string[]> // name -> array of HH:mm-HH:mm windows allowed per weekday
  workload: Record<string, Record<DepartmentKey, number>> // dateISO -> dept -> required headcount per slot
  previousWeeks: WeeklySchedule[]
}

// Slot pattern per reparto
const SLOT_PATTERNS: Record<DepartmentKey, Array<{ start: string; end: string; weight: number }>> = {
  cucina: [
    { start: '06:00', end: '14:00', weight: 1 },
    { start: '10:00', end: '18:00', weight: 1 },
    { start: '15:00', end: '23:00', weight: 1 }
  ],
  sala: [
    { start: '09:00', end: '17:00', weight: 1 },
    { start: '14:00', end: '22:00', weight: 1 },
    { start: '18:00', end: '24:00', weight: 1 }
  ],
  bar: [
    { start: '10:00', end: '18:00', weight: 1 },
    { start: '14:00', end: '22:00', weight: 1 },
    { start: '18:00', end: '02:00', weight: 1 }
  ]
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO)
  d.setDate(d.getDate() + days)
  const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function toISODate(d: Date): string {
  const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function hoursBetween(startHHmm: string, endHHmm: string): number {
  const [sh, sm] = startHHmm.split(':').map(Number)
  const [eh, em] = endHHmm.split(':').map(Number)
  let s = sh * 60 + sm
  let e = eh * 60 + em
  if (e < s) e += 24 * 60
  return (e - s) / 60
}

function restBetween(endHHmm: string, nextStartHHmm: string): number {
  const [eh, em] = endHHmm.split(':').map(Number)
  const [sh, sm] = nextStartHHmm.split(':').map(Number)
  let end = eh * 60 + em
  let next = sh * 60 + sm + 24 * 60
  return (next - end) / 60
}

export class AutoScheduler {
  private lastWeekStartISO: string | null = null
  private lastAssignments: ScheduledAssignment[] = []
  private lastInput: OptimizeInput | null = null
  async generateWeeklySchedule(week: Date): Promise<WeeklySchedule> {
    const weekStart = this.getWeekStart(week)
    const weekStartISO = toISODate(weekStart)
    const constraints = await this.getConstraints()
    const employees = await this.getEmployees()
    const availability = await this.getAvailability()
    const workload = await this.getExpectedWorkload(weekStart)
    const previousWeeks = await this.getPreviousSchedules(weekStart, 4)

    const input: OptimizeInput = {
      constraints,
      employees,
      availability,
      workload,
      previousWeeks
    }

    const schedule = this.optimizeSchedule(input)

    this.lastWeekStartISO = weekStartISO
    this.lastAssignments = schedule
    this.lastInput = input

    return { weekStartISO, assignments: schedule }
  }

  private getWeekStart(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + diff)
    return date
  }

  private async getConstraints(): Promise<OptimizeInput['constraints']> {
    try {
      const rule = await prisma.cCNLRules.findFirst()
      if (rule) {
        return {
          maxDailyHours: rule.maxDailyHours,
          maxWeeklyHours: rule.maxWeeklyHours,
          minRestBetweenShifts: rule.minRestBetweenShifts,
          maxConsecutiveDays: rule.maxConsecutiveDays
        }
      }
    } catch {}
    return {
      maxDailyHours: 8,
      maxWeeklyHours: 40,
      minRestBetweenShifts: 11,
      maxConsecutiveDays: 6
    }
  }

  private async getEmployees(): Promise<EmployeeFull[]> {
    try {
      const users = await prisma.user.findMany({ where: { isActive: true } })
      if (users.length > 0) {
        return users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          department: ((u.department || 'sala') as DepartmentKey),
          level: 2,
          hourlyRate: Number(u.hourlyRate || 12),
          contractType: (u.contractTypeEnum === 'PART_TIME' ? 'part-time' : 'full-time'),
          startDate: toISODate(u.startDate || new Date()),
          isActive: u.isActive,
          avatar: '👤',
          skills: [],
          personalInfo: {}
        }))
      }
    } catch {}
    return getEmployeesFullClient()
  }

  private async getAvailability(): Promise<OptimizeInput['availability']> {
    // Placeholder: tutti disponibili su slot standard
    const map: OptimizeInput['availability'] = {}
    const emps = await this.getEmployees()
    emps.forEach(e => {
      map[e.name] = ['06:00-23:59']
    })
    return map
  }

  private async getExpectedWorkload(weekStart: Date): Promise<OptimizeInput['workload']> {
    const res: OptimizeInput['workload'] = {}
    const startISO = toISODate(weekStart)
    for (let i = 0; i < 7; i++) {
      const dateISO = addDaysISO(startISO, i)
      const bookings = getBookingsByDate(dateISO)
      const guests = bookings.reduce((s, b) => s + b.partySize, 0)
      // Semplice stima per reparto
      res[dateISO] = {
        cucina: Math.max(1, Math.ceil(guests / 40)),
        sala: Math.max(2, Math.ceil(guests / 20)),
        bar: Math.max(1, Math.ceil(guests / 60))
      }
    }
    return res
  }

  private async getPreviousSchedules(weekStart: Date, count: number): Promise<WeeklySchedule[]> {
    // Placeholder: nessuna persistenza ancora
    return []
  }

  private optimizeSchedule(input: OptimizeInput): ScheduledAssignment[] {
    const assignments: ScheduledAssignment[] = []
    const weeklyHours: Record<string, number> = {}
    const consecutiveDays: Record<string, number> = {}
    const lastShiftEnd: Record<string, { dateISO: string; end: string }> = {}

    const dates = Object.keys(input.workload).sort()
    for (const dateISO of dates) {
      for (const dept of Object.keys(input.workload[dateISO]) as DepartmentKey[]) {
        const required = input.workload[dateISO][dept]
        const slots = SLOT_PATTERNS[dept]
        // Assegna per priorità slot
        for (const slot of slots) {
          let need = required
          while (need > 0) {
            // Ordina candidati per minor monte ore e meno consecutivi
            const candidates = input.employees
              .filter(e => e.department === dept)
              .filter(e => this.isAvailable(e.name, dateISO, slot.start, slot.end, input, weeklyHours, consecutiveDays, lastShiftEnd))
              .sort((a, b) => (weeklyHours[a.name] || 0) - (weeklyHours[b.name] || 0))

            if (candidates.length === 0) break

            const chosen = candidates[0]
            assignments.push({
              dateISO,
              department: dept,
              employeeName: chosen.name,
              startTime: slot.start,
              endTime: slot.end
            })

            weeklyHours[chosen.name] = (weeklyHours[chosen.name] || 0) + hoursBetween(slot.start, slot.end)
            consecutiveDays[chosen.name] = (consecutiveDays[chosen.name] || 0) + 1
            lastShiftEnd[chosen.name] = { dateISO, end: slot.end }
            need -= 1
          }
        }
      }
      // reset consecutivi per chi è a riposo quel giorno (non gestiamo riposi qui, ma si può integrare)
      input.employees.forEach(e => {
        const worked = assignments.some(a => a.dateISO === dateISO && a.employeeName === e.name)
        if (!worked) consecutiveDays[e.name] = 0
      })
    }

    return assignments
  }

  private isAvailable(
    name: string,
    dateISO: string,
    start: string,
    end: string,
    input: OptimizeInput,
    weeklyHours: Record<string, number>,
    consecutiveDays: Record<string, number>,
    lastShiftEnd: Record<string, { dateISO: string; end: string }>
  ): boolean {
    const emp = input.employees.find(e => e.name === name)
    if (!emp) return false

    // Ferie/permessi approvati (usa mock leaveSystem: userId mappato non disponibile qui, fallback per nome)
    const leave = getLeaveRequests().find(r => {
      const same = (emp.name.toLowerCase().includes('giuseppe') && r.userId === '1')
        || (emp.name.toLowerCase().includes('anna') && r.userId === '3')
      if (!same) return false
      const d = new Date(dateISO)
      return r.startDate <= d && r.endDate >= d && r.status === 'APPROVED'
    })
    if (leave) return false

    // Vincoli orari
    const dailyHours = hoursBetween(start, end)
    if (dailyHours > (input.constraints.maxDailyHours || 8)) return false
    if ((weeklyHours[name] || 0) + dailyHours > (input.constraints.maxWeeklyHours || 40)) return false

    // Riposo minimo da ultimo turno
    const last = lastShiftEnd[name]
    if (last && last.dateISO !== dateISO) {
      const rest = restBetween(last.end, start)
      if (rest < (input.constraints.minRestBetweenShifts || 11)) return false
    }

    // Giorni consecutivi
    if ((consecutiveDays[name] || 0) >= (input.constraints.maxConsecutiveDays || 6)) return false

    // Disponibilità (grezza)
    const slots = input.availability[name] || []
    const fits = slots.some(window => {
      const [ws, we] = window.split('-')
      const sOk = restBetween(ws, start) >= 0 // start >= ws (approssimazione semplice)
      const eOk = restBetween(end, we) <= 24 // end <= we (approssimazione)
      return sOk && eOk
    })
    if (!fits && slots.length > 0) return false

    return true
  }

  getConflicts() {
    if (!this.lastInput) return []
    const input = this.lastInput
    const assignments = this.lastAssignments
    const conflicts: Array<{ type: string; dateISO?: string; employeeName?: string; details?: string }> = []

    // Overlap nello stesso giorno
    const byEmpDate: Record<string, Record<string, Array<{ start: string; end: string }>>> = {}
    assignments.forEach(a => {
      byEmpDate[a.employeeName] = byEmpDate[a.employeeName] || {}
      byEmpDate[a.employeeName][a.dateISO] = byEmpDate[a.employeeName][a.dateISO] || []
      byEmpDate[a.employeeName][a.dateISO].push({ start: a.startTime, end: a.endTime })
    })
    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + m
    }
    for (const emp of Object.keys(byEmpDate)) {
      for (const dateISO of Object.keys(byEmpDate[emp])) {
        const slots = byEmpDate[emp][dateISO]
        const normalized = slots.map(s => {
          const sMin = toMinutes(s.start)
          let eMin = toMinutes(s.end)
          if (eMin < sMin) eMin += 24 * 60
          return { s: sMin, e: eMin }
        }).sort((a, b) => a.s - b.s)
        for (let i = 1; i < normalized.length; i++) {
          if (normalized[i].s < normalized[i - 1].e) {
            conflicts.push({ type: 'OVERLAP', dateISO, employeeName: emp, details: 'Turni sovrapposti nello stesso giorno' })
          }
        }
      }
    }

    // Rest minimo, ore settimanali, consecutivi e copertura
    const constraints = input.constraints
    const dates = Object.keys(input.workload).sort()
    const empWeeklyHours: Record<string, number> = {}
    const empLastEnd: Record<string, { dateISO: string; end: string }> = {}
    const empConsecutive: Record<string, number> = {}

    for (const dateISO of dates) {
      const todays = assignments.filter(a => a.dateISO === dateISO)
      const workedNames = new Set<string>()
      for (const a of todays) {
        workedNames.add(a.employeeName)
        empWeeklyHours[a.employeeName] = (empWeeklyHours[a.employeeName] || 0) + hoursBetween(a.startTime, a.endTime)
        const last = empLastEnd[a.employeeName]
        if (last && last.dateISO !== dateISO) {
          const rest = restBetween(last.end, a.startTime)
          if (rest < (constraints.minRestBetweenShifts || 11)) {
            conflicts.push({ type: 'MIN_REST', dateISO, employeeName: a.employeeName, details: `Riposo ${rest}h < ${constraints.minRestBetweenShifts}h` })
          }
        }
        empLastEnd[a.employeeName] = { dateISO, end: a.endTime }
      }
      const allNames = input.employees.map(e => e.name)
      for (const name of allNames) {
        if (workedNames.has(name)) {
          empConsecutive[name] = (empConsecutive[name] || 0) + 1
          if ((empConsecutive[name] || 0) > (constraints.maxConsecutiveDays || 6)) {
            conflicts.push({ type: 'CONSECUTIVE_DAYS', dateISO, employeeName: name, details: `Consecutivi > ${constraints.maxConsecutiveDays}` })
          }
        } else {
          empConsecutive[name] = 0
        }
      }
    }
    for (const [name, hours] of Object.entries(empWeeklyHours)) {
      if (hours > (constraints.maxWeeklyHours || 40)) {
        conflicts.push({ type: 'WEEKLY_HOURS', employeeName: name, details: `Ore ${hours}h > ${constraints.maxWeeklyHours}h` })
      }
    }

    // Copertura
    const coverageAssigned: Record<string, Record<DepartmentKey, number>> = {}
    assignments.forEach(a => {
      coverageAssigned[a.dateISO] = coverageAssigned[a.dateISO] || { cucina: 0, sala: 0, bar: 0 }
      coverageAssigned[a.dateISO][a.department] = (coverageAssigned[a.dateISO][a.department] || 0) + 1
    })
    for (const dateISO of Object.keys(input.workload)) {
      for (const dept of Object.keys(input.workload[dateISO]) as DepartmentKey[]) {
        const requiredPerSlot = input.workload[dateISO][dept]
        const requiredTotal = requiredPerSlot * SLOT_PATTERNS[dept].length
        const assigned = coverageAssigned[dateISO]?.[dept] || 0
        if (assigned < requiredTotal) {
          const missing = requiredTotal - assigned
          conflicts.push({ type: 'UNDERSTAFFED', dateISO, details: `${dept}: mancano ${missing} assegnazioni` })
        }
      }
    }

    return conflicts
  }

  getMetrics() {
    if (!this.lastInput) return { totalAssignments: 0, totalHours: 0, coverageRate: 0, conflicts: 0 }
    const input = this.lastInput
    const assignments = this.lastAssignments
    const totalAssignments = assignments.length
    const totalHours = assignments.reduce((s, a) => s + hoursBetween(a.startTime, a.endTime), 0)
    let requiredAll = 0
    for (const dateISO of Object.keys(input.workload)) {
      for (const dept of Object.keys(input.workload[dateISO]) as DepartmentKey[]) {
        requiredAll += input.workload[dateISO][dept] * SLOT_PATTERNS[dept].length
      }
    }
    const coverageRate = requiredAll > 0 ? Math.min(1, assignments.length / requiredAll) : 1
    const conflicts = this.getConflicts().length
    return { totalAssignments, totalHours, coverageRate, conflicts }
  }
}

export default AutoScheduler


