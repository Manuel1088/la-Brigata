import { z } from 'zod'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

export const shiftAssignmentSchema = z.object({
  userId: z.string().min(1),
  date: dateIso,
  department: z.enum(['cucina', 'sala', 'beverage', 'accoglienza', 'direzione']),
  time: z.string().min(1),
})

export const postShiftsBodySchema = z.object({
  restaurantId: z.string().min(1),
  rangeFrom: dateIso,
  rangeTo: dateIso,
  assignments: z.array(shiftAssignmentSchema),
})

export const getShiftsQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  date: dateIso,
  days: z.coerce.number().int().min(1).max(31).default(7),
  userId: z.string().min(1).optional(),
})

export type PostShiftsBody = z.infer<typeof postShiftsBodySchema>
export type ShiftAssignment = z.infer<typeof shiftAssignmentSchema>
