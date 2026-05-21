import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { dateFromIso } from '@/lib/shifts'

export type CustomerExtras = {
  allergies?: string
  recurrences?: string
  preferences?: string
  notes?: string
}

const EXTRAS_PREFIX = '__extras__:'

export function encodeCustomerNotes(extras: CustomerExtras): string | null {
  const payload = {
    allergies: extras.allergies?.trim() || undefined,
    recurrences: extras.recurrences?.trim() || undefined,
    preferences: extras.preferences?.trim() || undefined,
    notes: extras.notes?.trim() || undefined,
  }
  const hasAny = Object.values(payload).some(Boolean)
  if (!hasAny) return null
  return `${EXTRAS_PREFIX}${JSON.stringify(payload)}`
}

export function decodeCustomerNotes(raw: string | null | undefined): CustomerExtras {
  if (!raw) return {}
  if (raw.startsWith(EXTRAS_PREFIX)) {
    try {
      return JSON.parse(raw.slice(EXTRAS_PREFIX.length)) as CustomerExtras
    } catch {
      return { notes: raw }
    }
  }
  return { notes: raw }
}

export function bookingTimeFromParts(dateIso: string, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(':').map((x) => parseInt(x, 10) || 0)
  const d = dateFromIso(dateIso)
  d.setHours(h, m, 0, 0)
  return d
}

export function formatBookingTime(time: Date): string {
  return time.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const bookingInclude = {
  customer: true,
  table: true,
} satisfies Prisma.BookingInclude

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>

export function serializeBooking(row: BookingRow) {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    customerId: row.customerId,
    tableId: row.tableId,
    area: row.area,
    customerName: row.customerName,
    customerPhone: row.customerPhone ?? '',
    customerEmail: row.customer?.email ?? undefined,
    date: row.date.toISOString().split('T')[0],
    time: formatBookingTime(row.time),
    partySize: row.partySize,
    tableNumber: row.tableNumber ?? row.table?.tableNumber ?? null,
    status: row.status,
    notes: row.notes ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function resolveTableId(
  restaurantId: string,
  tableNumber: number | null | undefined,
  tableId?: string | null
): Promise<string | null> {
  if (tableId) return tableId
  if (tableNumber == null) return null
  const table = await prisma.table.findUnique({
    where: {
      restaurantId_tableNumber: { restaurantId, tableNumber },
    },
  })
  return table?.id ?? null
}

export async function upsertCustomerForBooking(params: {
  restaurantId: string
  name: string
  phone: string
  email?: string
  notes?: string
  visitDate: Date
  partySize: number
}) {
  const phone = params.phone.trim()
  const email = params.email?.trim()
  const name = params.name.trim()

  const existing = await prisma.customer.findFirst({
    where: {
      restaurantId: params.restaurantId,
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
        { name: { equals: name, mode: 'insensitive' as const } },
      ],
    },
  })

  if (existing) {
    const extras = decodeCustomerNotes(existing.notes)
    const mergedNotes = params.notes
      ? encodeCustomerNotes({ ...extras, notes: params.notes })
      : existing.notes

    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name,
        phone: phone || existing.phone,
        email: email || existing.email,
        notes: mergedNotes,
        visitCount: { increment: 1 },
        lastVisit: params.visitDate,
      },
    })
  }

  return prisma.customer.create({
    data: {
      restaurantId: params.restaurantId,
      name,
      phone: phone || null,
      email: email || null,
      notes: params.notes ? encodeCustomerNotes({ notes: params.notes }) : null,
      visitCount: 1,
      lastVisit: params.visitDate,
    },
  })
}

export function serializeCustomer(row: {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  visitCount: number
  lastVisit: Date | null
}) {
  const extras = decodeCustomerNotes(row.notes)
  const lastVisitDate = row.lastVisit?.toISOString().split('T')[0] ?? ''
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: extras.notes,
    allergies: extras.allergies,
    recurrences: extras.recurrences,
    preferences: extras.preferences,
    totalBookings: row.visitCount,
    totalGuests: row.visitCount,
    lastVisitDate,
    lunchCount: 0,
    dinnerCount: row.visitCount,
    visitCount: row.visitCount,
    lastVisit: row.lastVisit?.toISOString() ?? null,
  }
}
