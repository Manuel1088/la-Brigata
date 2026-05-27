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

const SHORT_DAY_LABELS: Record<DayId, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mer',
  thursday: 'Gio',
  friday: 'Ven',
  saturday: 'Sab',
  sunday: 'Dom',
}

function daySlotKey(day: DayHours): string {
  if (day.isClosed) return 'closed'
  return `${day.open}|${day.close}`
}

function formatSlotLabel(slotKey: string): string {
  if (slotKey === 'closed') return 'Chiuso'
  const [open, close] = slotKey.split('|')
  return `${open} - ${close}`
}

/** Riepilogo compatto per visualizzazione (es. "Tutti i giorni 12:00 - 23:00" o "Lun-Ven 16:30 - 00:00 · Sab Chiuso"). */
export function formatCompactOpeningHours(hours: OpeningHours): string {
  const dayIds = DAYS_OF_WEEK.map((d) => d.id)
  const slotKeys = dayIds.map((id) => daySlotKey(hours[id]))

  if (slotKeys.every((k) => k === slotKeys[0])) {
    if (slotKeys[0] === 'closed') return 'Chiuso tutti i giorni'
    return `Tutti i giorni ${formatSlotLabel(slotKeys[0])}`
  }

  const segments: string[] = []
  let rangeStart = 0

  for (let i = 1; i <= slotKeys.length; i++) {
    if (i === slotKeys.length || slotKeys[i] !== slotKeys[rangeStart]) {
      const startId = dayIds[rangeStart]
      const endId = dayIds[i - 1]
      const rangeLabel =
        rangeStart === i - 1
          ? SHORT_DAY_LABELS[startId]
          : `${SHORT_DAY_LABELS[startId]}-${SHORT_DAY_LABELS[endId]}`
      segments.push(`${rangeLabel} ${formatSlotLabel(slotKeys[rangeStart])}`)
      rangeStart = i
    }
  }

  return segments.join(' · ')
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
