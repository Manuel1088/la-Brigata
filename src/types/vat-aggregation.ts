/**
 * Tipi allineati agli enum Prisma per aggregazione P.IVA.
 * Logica business (CONFERMATO da entrambi → CONFIRMED) sarà implementata in seguito.
 */

export const VAT_AGGREGATION_STATUS = ['PENDING', 'CONFIRMED', 'ANOMALIA'] as const
export type VatAggregationStatus = (typeof VAT_AGGREGATION_STATUS)[number]

export const VAT_AGGREGATION_RESPONSE_STATUS = [
  'IN_ATTESA',
  'CONFERMATO',
  'RIFIUTATO',
] as const
export type VatAggregationResponseStatus =
  (typeof VAT_AGGREGATION_RESPONSE_STATUS)[number]

export type VatRegistrationSummary = {
  id: string
  vatNumber: string
  legalName: string | null
  aggregationStatus: VatAggregationStatus
  confirmedAt: string | null
  linkedUserCount: number
}

export type VatAggregationNotificationSummary = {
  id: string
  vatRegistrationId: string
  vatNumber: string
  senderUserId: string
  recipientUserId: string
  responseStatus: VatAggregationResponseStatus
  expiresAt: string
  respondedAt: string | null
}
