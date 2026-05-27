import { z } from 'zod'
import { normalizeOpeningHours } from '@/lib/location-hours'

export const LOCATION_TYPES = [
  'RISTORANTE',
  'BAR',
  'SKYBAR',
  'COLAZIONI',
  'EVENTI',
  'ALTRO',
] as const

const locationTypeSchema = z.enum(LOCATION_TYPES)

const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  isClosed: z.boolean(),
})

const openingHoursSchema = z
  .record(z.string(), dayHoursSchema)
  .optional()
  .transform((val) => (val ? normalizeOpeningHours(val) : undefined))

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Nome sala richiesto'),
  outletName: z.string().min(1, 'Punto ristoro richiesto'),
  type: locationTypeSchema.default('RISTORANTE'),
  capacity: z.coerce.number().int().min(0).optional().nullable(),
  tables: z.coerce.number().int().min(0).optional().nullable(),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  openingHours: openingHoursSchema,
  address: z.string().optional().nullable(),
})

export const updateLocationSchema = createLocationSchema.partial()

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
