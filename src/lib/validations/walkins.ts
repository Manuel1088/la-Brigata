import { z } from 'zod'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeHHmm = z.string().regex(/^\d{2}:\d{2}$/)

export const getWalkinsQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  date: dateIso,
  area: z.string().optional(),
})

export const postWalkinBodySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  date: dateIso,
  time: timeHHmm.optional().nullable(),
  covers: z.coerce.number().int().min(1).max(500),
  area: z.string().optional().nullable(),
  tableNumber: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const patchWalkinBodySchema = z.object({
  date: dateIso.optional(),
  time: timeHHmm.optional().nullable(),
  covers: z.coerce.number().int().min(1).max(500).optional(),
  area: z.string().optional().nullable(),
  tableNumber: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
})
