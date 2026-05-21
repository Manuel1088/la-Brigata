import { z } from 'zod'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

export const SUPPORTED_LEAVE_TYPES = [
  'VACATION',
  'SICK_LEAVE',
  'ROL',
  'PAID_LEAVE',
] as const

export const leaveTypeSchema = z.enum(SUPPORTED_LEAVE_TYPES)

export const leaveStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
])

export const getLeavesQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  status: leaveStatusSchema.optional(),
  month: z.coerce.number().int().min(0).max(11).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  includeBalances: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})

export const postLeaveBodySchema = z.object({
  startDate: dateIso,
  endDate: dateIso,
  type: leaveTypeSchema,
  reason: z.string().max(2000).optional(),
  isUrgent: z.boolean().optional(),
})

export const patchLeaveBodySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().max(2000).optional(),
})

export type PostLeaveBody = z.infer<typeof postLeaveBodySchema>
export type PatchLeaveBody = z.infer<typeof patchLeaveBodySchema>
