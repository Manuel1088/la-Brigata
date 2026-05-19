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

export type PostTipsBody = z.infer<typeof postTipsBodySchema>
