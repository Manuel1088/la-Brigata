export type DayId =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type DayHours = {
  open: string
  close: string
  isClosed: boolean
}

export type OpeningHours = Record<DayId, DayHours>

export const DAYS_OF_WEEK: Array<{ id: DayId; label: string }> = [
  { id: 'monday', label: 'Lunedì' },
  { id: 'tuesday', label: 'Martedì' },
  { id: 'wednesday', label: 'Mercoledì' },
  { id: 'thursday', label: 'Giovedì' },
  { id: 'friday', label: 'Venerdì' },
  { id: 'saturday', label: 'Sabato' },
  { id: 'sunday', label: 'Domenica' },
]

export function getDefaultOpeningHours(): OpeningHours {
  return {
    monday: { open: '12:00', close: '23:00', isClosed: false },
    tuesday: { open: '12:00', close: '23:00', isClosed: false },
    wednesday: { open: '12:00', close: '23:00', isClosed: false },
    thursday: { open: '12:00', close: '23:00', isClosed: false },
    friday: { open: '12:00', close: '00:00', isClosed: false },
    saturday: { open: '12:00', close: '00:00', isClosed: false },
    sunday: { open: '12:00', close: '22:00', isClosed: false },
  }
}

export function normalizeOpeningHours(
  hours: Partial<Record<DayId, Partial<DayHours>>> | null | undefined
): OpeningHours {
  const base = getDefaultOpeningHours()
  if (!hours || typeof hours !== 'object') return base
  const result = { ...base }
  for (const day of Object.keys(base) as DayId[]) {
    const h = hours[day]
    if (h) {
      result[day] = {
        open: h.open ?? base[day].open,
        close: h.close ?? base[day].close,
        isClosed: h.isClosed ?? base[day].isClosed,
      }
    }
  }
  return result
}
