// Lib semplice per prenotazioni ed eventi (mock per integrazione AI)

export interface Booking {
  id: string
  date: string // yyyy-mm-dd
  time: string // HH:mm
  partySize: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'waiting'
}

export interface CompanyEvent {
  id: string
  name: string
  date: string // yyyy-mm-dd
  type: 'internal' | 'external' | 'holiday' | 'special'
  expectedCoversMultiplier: number
}

// Dati mock di base: in produzione arrivano dal DB/API
const mockBookings: Booking[] = [
  { id: 'b1', date: '2024-12-20', time: '19:30', partySize: 4, status: 'confirmed' },
  { id: 'b2', date: '2024-12-20', time: '20:00', partySize: 2, status: 'confirmed' },
  { id: 'b3', date: '2024-12-31', time: '21:00', partySize: 6, status: 'confirmed' }
]

const mockEvents: CompanyEvent[] = [
  { id: 'e1', name: 'Cenone di Capodanno', date: '2024-12-31', type: 'special', expectedCoversMultiplier: 1.8 },
  { id: 'e2', name: 'Vigilia di Natale', date: '2024-12-24', type: 'holiday', expectedCoversMultiplier: 1.5 }
]

export function getBookingsByDate(dateISO: string): Booking[] {
  return mockBookings.filter(b => b.date === dateISO)
}

export function getCompanyEventsByDate(dateISO: string): CompanyEvent[] {
  return mockEvents.filter(e => e.date === dateISO)
}


