import { z } from 'zod'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const postTipsBodySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  locationId: z.string().min(1),
  date: dateIso,
  amounts: z.object({
    cash: z.coerce.number().min(0).optional(),
    card: z.coerce.number().min(0).optional(),
    foreign: z.coerce.number().min(0).optional(),
  }),
  notes: z.string().max(2000).optional(),
})

export const getTipsQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
})

/** month: 0–11 (come Date.getMonth()), year: es. 2026 */
export const getTipsMyQuerySchema = z.object({
  month: z.coerce.number().int().min(0).max(11).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
})

export const getTipsEntriesQuerySchema = getTipsMyQuerySchema.extend({
  restaurantId: z.string().min(1).optional(),
})

export type PostTipsBody = z.infer<typeof postTipsBodySchema>
