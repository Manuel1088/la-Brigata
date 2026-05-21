import { z } from 'zod'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

export const postShiftSwapBodySchema = z.object({
  restaurantId: z.string().min(1),
  targetUserId: z.string().min(1),
  targetDate: dateIso,
  requesterDate: dateIso.optional(),
  targetShiftTime: z.string().min(1),
  offeredShiftTime: z.string().min(1),
  notes: z.string().optional(),
})

export const getShiftSwapQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export const patchShiftSwapBodySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
})
