'use client'

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  totalBookings: number
  totalGuests: number
  lastVisitDate: string // ISO yyyy-mm-dd
  lunchCount: number
  dinnerCount: number
  allergies?: string
  recurrences?: string
  preferences?: string
  notes?: string
}

export interface BookingLike {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: string
  time: string
  partySize: number
  status: string
}

const STORAGE_KEY = 'customers_v1'

export const getCustomers = (): Customer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const saveCustomers = (list: Customer[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
  try { window.dispatchEvent(new CustomEvent('customers_updated')) } catch {}
}

const idFrom = (name: string, phone?: string, email?: string) => {
  const base = (name || '').trim().toLowerCase()
  const key = `${base}|${phone || ''}|${email || ''}`
  return `c_${btoa(unescape(encodeURIComponent(key))).slice(0, 20)}`
}

export const addOrUpdateCustomerFromBooking = (b: BookingLike) => {
  const name = (b.customerName || '').trim()
  const phone = (b.customerPhone || '').trim()
  const email = (b.customerEmail || '').trim()
  if (!name && !phone && !email) return // niente dati utili
  if (name.toLowerCase() === 'walk-in') return // ignora passanti anonimi

  const customers = getCustomers()
  // match: per phone o email, altrimenti per name
  const idx = customers.findIndex(c => (phone && c.phone === phone) || (email && c.email === email) || (name && c.name.toLowerCase() === name.toLowerCase()))

  const hour = parseInt((b.time || '0').split(':')[0] || '0', 10)
  const lunch = hour >= 11 && hour < 16

  if (idx >= 0) {
    const c = customers[idx]
    c.totalBookings += 1
    c.totalGuests += (b.partySize || 0)
    c.lastVisitDate = b.date
    if (lunch) c.lunchCount += 1; else c.dinnerCount += 1
    // aggiorna eventuali contatti
    if (phone) c.phone = phone
    if (email) c.email = email
    customers[idx] = c
  } else {
    customers.push({
      id: idFrom(name, phone, email),
      name,
      phone: phone || undefined,
      email: email || undefined,
      totalBookings: 1,
      totalGuests: b.partySize || 0,
      lastVisitDate: b.date,
      lunchCount: lunch ? 1 : 0,
      dinnerCount: lunch ? 0 : 1,
    })
  }

  saveCustomers(customers)
}

export const rebuildCustomersFromAllAreas = () => {
  const customersMap = new Map<string, Customer>()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || ''
      if (!key.startsWith('bookings_v1_')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const list: BookingLike[] = JSON.parse(raw)
      list.forEach(b => {
        const name = (b.customerName || '').trim()
        const phone = (b.customerPhone || '').trim()
        const email = (b.customerEmail || '').trim()
        if (!name && !phone && !email) return
        if (name.toLowerCase() === 'walk-in') return
        const hour = parseInt((b.time || '0').split(':')[0] || '0', 10)
        const lunch = hour >= 11 && hour < 16
        const cid = idFrom(name, phone, email)
        const existing = customersMap.get(cid)
        if (existing) {
          existing.totalBookings += 1
          existing.totalGuests += (b.partySize || 0)
          existing.lastVisitDate = b.date > existing.lastVisitDate ? b.date : existing.lastVisitDate
          if (lunch) existing.lunchCount += 1; else existing.dinnerCount += 1
          if (phone) existing.phone = phone
          if (email) existing.email = email
        } else {
          customersMap.set(cid, {
            id: cid,
            name,
            phone: phone || undefined,
            email: email || undefined,
            totalBookings: 1,
            totalGuests: b.partySize || 0,
            lastVisitDate: b.date,
            lunchCount: lunch ? 1 : 0,
            dinnerCount: lunch ? 0 : 1,
          })
        }
      })
    }
  } catch {}

  saveCustomers(Array.from(customersMap.values()))
}


