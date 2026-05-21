import { z } from 'zod'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const getBookingsQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  date: dateIso,
  area: z.string().optional(),
})

export const postBookingBodySchema = z.object({
  restaurantId: z.string().min(1),
  date: dateIso,
  time: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().optional(),
  partySize: z.coerce.number().int().min(1).max(50),
  tableNumber: z.coerce.number().int().optional().nullable(),
  tableId: z.string().optional().nullable(),
  area: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
})

export const patchBookingBodySchema = z.object({
  date: dateIso.optional(),
  time: z.string().optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  partySize: z.coerce.number().int().min(1).max(50).optional(),
  tableNumber: z.coerce.number().int().optional().nullable(),
  tableId: z.string().optional().nullable(),
  area: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
})

export const getCustomersQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  search: z.string().optional(),
})

export const postCustomerBodySchema = z.object({
  id: z.string().optional(),
  restaurantId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  allergies: z.string().optional(),
  recurrences: z.string().optional(),
  preferences: z.string().optional(),
})

export const patchCustomerBodySchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  allergies: z.string().optional(),
  recurrences: z.string().optional(),
  preferences: z.string().optional(),
})

export const getTablesQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
})

export const postTableBodySchema = z.object({
  restaurantId: z.string().min(1),
  tableNumber: z.coerce.number().int().min(1),
  seats: z.coerce.number().int().min(1).max(30),
  status: z.string().optional(),
})
