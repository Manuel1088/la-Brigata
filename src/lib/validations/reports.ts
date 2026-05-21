import { z } from 'zod'

export const reportsQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(0).max(11).optional(),
})
