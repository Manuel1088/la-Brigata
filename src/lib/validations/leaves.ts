import { z } from 'zod'
import {
  REQUESTABLE_LEAVE_TYPES,
  type LeaveTypeId,
} from '@/lib/leave-types'

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

const SICK_LEAVE_TYPES = ['SICK_LEAVE', 'SICK_LEAVE_CHILD'] as const

function isSickLeaveType(type: LeaveTypeId): boolean {
  return (SICK_LEAVE_TYPES as readonly string[]).includes(type)
}

/** Re-export: tipi richiedibili dal form (PAID_LEAVE escluso: requestable false). */
export { SUPPORTED_LEAVE_TYPES } from '@/lib/leave-types'

const requestableLeaveTypes = REQUESTABLE_LEAVE_TYPES as [
  LeaveTypeId,
  ...LeaveTypeId[],
]

export const leaveTypeSchema = z.enum(requestableLeaveTypes)

export const leaveStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
  'REVOKED',
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

export const postLeaveBodySchema = z
  .object({
    startDate: dateIso,
    endDate: dateIso,
    type: leaveTypeSchema,
    /** Ore (solo ROL); supporta decimali es. 3.5 */
    requestedHours: z
      .number()
      .positive('Le ore devono essere maggiori di zero')
      .max(999.99)
      .optional(),
    reason: z.string().max(2000).optional(),
    isUrgent: z.boolean().optional(),
    /** Numero certificato (solo malattia); opzionale in creazione. */
    certificateNumber: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'ROL') {
      if (data.requestedHours == null) {
        ctx.addIssue({
          code: 'custom',
          message: 'requestedHours obbligatorio per il ROL',
          path: ['requestedHours'],
        })
      }
    } else if (data.requestedHours != null) {
      ctx.addIssue({
        code: 'custom',
        message: 'requestedHours consentito solo per il ROL',
        path: ['requestedHours'],
      })
    }

    const cert = data.certificateNumber?.trim()
    if (cert && !isSickLeaveType(data.type)) {
      ctx.addIssue({
        code: 'custom',
        message: 'certificateNumber consentito solo per malattia',
        path: ['certificateNumber'],
      })
    }
  })

export const patchLeaveBodySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().max(2000).optional(),
})

export const revokeLeaveBodySchema = z.object({
  reason: z.string().max(2000).optional(),
})

export type PostLeaveBody = z.infer<typeof postLeaveBodySchema>
export type PatchLeaveBody = z.infer<typeof patchLeaveBodySchema>
export type RevokeLeaveBody = z.infer<typeof revokeLeaveBodySchema>
