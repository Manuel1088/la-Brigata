import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/db'
import {
  planFromStripePriceId,
  stripe,
  subscriptionPeriodEnd,
  type CheckoutPlanId,
} from '@/lib/stripe'
import type {
  EmployeeSubscriptionStatus,
  SubscriptionStatus,
} from '@prisma/client'

export const runtime = 'nodejs'

async function updateRestaurantSubscription(
  restaurantId: string,
  status: SubscriptionStatus,
  periodEnd: Date | null,
  stripeCustomerId?: string | null
) {
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      subscriptionStatus: status,
      subscriptionPeriodEnd: periodEnd,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    },
  })
}

async function updateEmployeeSubscription(
  userId: string,
  status: EmployeeSubscriptionStatus,
  periodEnd: Date | null,
  stripeCustomerId?: string | null
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      employeeSubscriptionStatus: status,
      employeeSubscriptionPeriodEnd: periodEnd,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    },
  })
}

async function resolvePlanFromSubscription(
  subscription: Stripe.Subscription
): Promise<CheckoutPlanId | null> {
  const metaPlan = subscription.metadata?.plan
  if (metaPlan === 'PREMIUM' || metaPlan === 'BASIC' || metaPlan === 'PRO') {
    return metaPlan
  }

  const priceId = subscription.items.data[0]?.price?.id
  if (priceId) return planFromStripePriceId(priceId)
  return null
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const scope = session.metadata?.scope as 'employee' | 'restaurant' | undefined
  const plan = session.metadata?.plan as CheckoutPlanId | undefined

  let periodEnd: Date | null = null
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    periodEnd = subscriptionPeriodEnd(subscription)
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id

  if (scope === 'employee') {
    const userId = session.metadata?.userId
    if (!userId || plan !== 'PREMIUM') {
      console.warn('checkout employee senza userId o piano non PREMIUM')
      return
    }
    await updateEmployeeSubscription(
      userId,
      'PREMIUM',
      periodEnd,
      customerId ?? null
    )
    return
  }

  const restaurantId = session.metadata?.restaurantId
  if (!restaurantId || (plan !== 'BASIC' && plan !== 'PRO')) {
    console.warn('checkout restaurant senza restaurantId o piano non valido')
    return
  }

  await updateRestaurantSubscription(
    restaurantId,
    plan,
    periodEnd,
    customerId ?? null
  )
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const scope = subscription.metadata?.scope as
    | 'employee'
    | 'restaurant'
    | undefined

  if (scope === 'employee') {
    const userId = subscription.metadata?.userId
    if (userId) {
      await updateEmployeeSubscription(userId, 'EXPIRED', null)
      return
    }
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id
    if (customerId) {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      })
      if (user) {
        await updateEmployeeSubscription(user.id, 'EXPIRED', null)
      }
    }
    return
  }

  const restaurantId = subscription.metadata?.restaurantId
  if (restaurantId) {
    await updateRestaurantSubscription(restaurantId, 'EXPIRED', null)
    return
  }

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

  if (customerId) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    })
    if (restaurant) {
      await updateRestaurantSubscription(restaurant.id, 'EXPIRED', null)
      return
    }

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    })
    if (user) {
      await updateEmployeeSubscription(user.id, 'EXPIRED', null)
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (
    subscription.status !== 'active' &&
    subscription.status !== 'trialing'
  ) {
    return
  }

  const plan = await resolvePlanFromSubscription(subscription)
  if (!plan) return

  const periodEnd = subscriptionPeriodEnd(subscription)
  const scope = subscription.metadata?.scope as
    | 'employee'
    | 'restaurant'
    | undefined

  if (scope === 'employee' && plan === 'PREMIUM') {
    const userId = subscription.metadata?.userId
    if (userId) {
      await updateEmployeeSubscription(userId, 'PREMIUM', periodEnd)
    }
    return
  }

  if (scope === 'restaurant' && (plan === 'BASIC' || plan === 'PRO')) {
    const restaurantId = subscription.metadata?.restaurantId
    if (restaurantId) {
      await updateRestaurantSubscription(restaurantId, plan, periodEnd)
    }
  }
}

/** POST /api/stripe/webhook */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET non configurato')
    return NextResponse.json({ error: 'Webhook non configurato' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Firma mancante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )
        break

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('POST /api/stripe/webhook handler error:', error)
    return NextResponse.json(
      { error: 'Errore elaborazione webhook' },
      { status: 500 }
    )
  }
}
