import Stripe from 'stripe'
import type { SubscriptionStatus } from '@prisma/client'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  typescript: true,
})

export type CheckoutPlanId = 'PREMIUM' | 'BASIC' | 'PRO'
export type CheckoutScope = 'employee' | 'restaurant'
export type BillingInterval = 'monthly' | 'annual'

export type PaidRestaurantPlan = 'BASIC' | 'PRO'

export const BILLING_MANAGER_ROLES = new Set([
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'MANAGER',
  'RESTAURANT_MANAGER',
])

export function canManageBilling(role: string | undefined | null): boolean {
  return BILLING_MANAGER_ROLES.has(String(role ?? ''))
}

export function checkoutScopeForPlan(plan: CheckoutPlanId): CheckoutScope {
  return plan === 'PREMIUM' ? 'employee' : 'restaurant'
}

export function stripePriceIdForPlan(
  plan: CheckoutPlanId,
  interval: BillingInterval = 'monthly'
): string | null {
  const annual = interval === 'annual'
  if (plan === 'PREMIUM') {
    return annual
      ? process.env.STRIPE_PRICE_ID_PREMIUM_EMPLOYEE_ANNUAL ??
          process.env.STRIPE_PRICE_ID_PREMIUM_EMPLOYEE ??
          null
      : process.env.STRIPE_PRICE_ID_PREMIUM_EMPLOYEE ?? null
  }
  if (plan === 'BASIC') {
    return annual
      ? process.env.STRIPE_PRICE_ID_BASIC_ANNUAL ??
          process.env.STRIPE_PRICE_ID_BASIC ??
          null
      : process.env.STRIPE_PRICE_ID_BASIC ?? null
  }
  if (plan === 'PRO') {
    return annual
      ? process.env.STRIPE_PRICE_ID_PRO_ANNUAL ??
          process.env.STRIPE_PRICE_ID_PRO ??
          null
      : process.env.STRIPE_PRICE_ID_PRO ?? null
  }
  return null
}

export function planFromStripePriceId(
  priceId: string
): CheckoutPlanId | null {
  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM_EMPLOYEE) return 'PREMIUM'
  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM_EMPLOYEE_ANNUAL) {
    return 'PREMIUM'
  }
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return 'BASIC'
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC_ANNUAL) return 'BASIC'
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'PRO'
  if (priceId === process.env.STRIPE_PRICE_ID_PRO_ANNUAL) return 'PRO'
  return null
}

/** Fine periodo da subscription item (Stripe API 2026+) */
export function subscriptionPeriodEnd(
  subscription: Stripe.Subscription
): Date | null {
  const end = subscription.items?.data?.[0]?.current_period_end
  return end ? new Date(end * 1000) : null
}

export function isPaidRestaurantPlan(
  status: SubscriptionStatus
): status is PaidRestaurantPlan {
  return status === 'BASIC' || status === 'PRO'
}
