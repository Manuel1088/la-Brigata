import type { SubscriptionStatus } from '@prisma/client'

export function cityFromAddress(address?: string | null): string {
  if (!address?.trim()) return '—'
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    return parts[parts.length - 2] ?? parts[0]
  }
  const known = ['Roma', 'Milano', 'Napoli', 'Torino', 'Firenze', 'Bologna']
  const lower = address.toLowerCase()
  for (const city of known) {
    if (lower.includes(city.toLowerCase())) return city
  }
  return parts[0] ?? address.trim()
}

const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  FREE: 'Gratuito',
  BASIC: 'Basic',
  PRO: 'Pro',
  EXPIRED: 'Scaduto',
}

export function subscriptionStatusLabel(status: SubscriptionStatus): string {
  return SUBSCRIPTION_LABELS[status] ?? status
}

export function subscriptionStatusClass(status: SubscriptionStatus): string {
  switch (status) {
    case 'PRO':
      return 'bg-purple-100 text-purple-800'
    case 'BASIC':
      return 'bg-blue-100 text-blue-800'
    case 'EXPIRED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
