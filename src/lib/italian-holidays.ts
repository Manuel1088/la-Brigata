/** Festività nazionali italiane (date ISO YYYY-MM-DD). Pasqua/Pasquetta calcolate per anno. */

export type HolidaySeed = {
  name: string
  date: string
  description: string
}

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const FIXED: Array<{ name: string; month: number; day: number; description: string }> = [
  { name: 'Capodanno', month: 1, day: 1, description: 'Festività nazionale' },
  { name: 'Epifania', month: 1, day: 6, description: 'Festività nazionale' },
  { name: 'Liberazione', month: 4, day: 25, description: 'Festa della Liberazione' },
  { name: 'Lavoro', month: 5, day: 1, description: 'Festa dei Lavoratori' },
  { name: 'Repubblica', month: 6, day: 2, description: 'Festa della Repubblica' },
  { name: 'Ferragosto', month: 8, day: 15, description: 'Assunzione di Maria' },
  { name: 'Ognissanti', month: 11, day: 1, description: 'Festività nazionale' },
  { name: 'Immacolata', month: 12, day: 8, description: 'Immacolata Concezione' },
  { name: 'Natale', month: 12, day: 25, description: 'Festività nazionale' },
  { name: 'Santo Stefano', month: 12, day: 26, description: 'Festività nazionale' },
]

export function italianHolidaysForYear(year: number): HolidaySeed[] {
  const easter = easterSunday(year)
  const pasquetta = addDays(easter, 1)
  const rows: HolidaySeed[] = FIXED.map((h) => ({
    name: h.name,
    date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
    description: h.description,
  }))
  rows.push(
    { name: 'Pasqua', date: toIso(easter), description: 'Domenica di Pasqua' },
    { name: 'Pasquetta', date: toIso(pasquetta), description: 'Lunedì dell\'Angelo' }
  )
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

export function italianHolidays2026And2027(): HolidaySeed[] {
  return [...italianHolidaysForYear(2026), ...italianHolidaysForYear(2027)]
}
