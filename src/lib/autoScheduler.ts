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
  async generateWeeklySchedule(week: Date): Promise<WeeklySchedule> {
    const weekStart = this.getWeekStart(week)
    const weekStartISO = toISODate(weekStart)
    const constraints = await this.getConstraints()
    const employees = await this.getEmployees()
    const availability = await this.getAvailability()
    const workload = await this.getExpectedWorkload(weekStart)
    const previousWeeks = await this.getPreviousSchedules(weekStart, 4)

    const schedule = this.optimizeSchedule({
      constraints,
      employees,
      availability,
      workload,
      previousWeeks
    })

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
}

export default AutoScheduler


