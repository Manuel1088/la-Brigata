// Prenotazioni ed eventi — lettura da DB

import { prisma } from '@/lib/db'
import { serializeBooking } from '@/lib/bookings-db'
import { dateFromIso } from '@/lib/shifts'

export interface Booking {
  id: string
  date: string
  time: string
  partySize: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'waiting'
}

export interface CompanyEvent {
  id: string
  name: string
  date: string
  type: 'internal' | 'external' | 'holiday' | 'special'
  expectedCoversMultiplier: number
}

const mockEvents: CompanyEvent[] = [
  {
    id: 'e1',
    name: 'Cenone di Capodanno',
    date: '2024-12-31',
    type: 'special',
    expectedCoversMultiplier: 1.8,
  },
  {
    id: 'e2',
    name: 'Vigilia di Natale',
    date: '2024-12-24',
    type: 'holiday',
    expectedCoversMultiplier: 1.5,
  },
]

export function getCompanyEventsByDate(dateISO: string): CompanyEvent[] {
  return mockEvents.filter((e) => e.date === dateISO)
}

export async function getCompanyEventsByDateDB(
  dateISO: string
): Promise<CompanyEvent[]> {
  return getCompanyEventsByDate(dateISO)
}

/** Prenotazioni per data (tutti i ristoranti visibili se restaurantId omesso). */
export async function getBookingsByDateDB(
  dateISO: string,
  restaurantId?: string
): Promise<Booking[]> {
  if (!process.env.DATABASE_URL) return []

  const dayStart = dateFromIso(dateISO)
  const dayEnd = new Date(`${dateISO}T23:59:59.999`)

  const rows = await prisma.booking.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      ...(restaurantId ? { restaurantId } : {}),
      status: { notIn: ['cancelled', 'canceled', 'annullata'] },
    },
    include: { customer: true, table: true },
    orderBy: { time: 'asc' },
  })

  return rows.map((r) => {
    const s = serializeBooking(r)
    return {
      id: s.id,
      date: s.date,
      time: s.time,
      partySize: s.partySize,
      status: s.status as Booking['status'],
    }
  })
}

/** @deprecated Usa getBookingsByDateDB */
export async function getBookingsByDate(dateISO: string): Promise<Booking[]> {
  return getBookingsByDateDB(dateISO)
}
