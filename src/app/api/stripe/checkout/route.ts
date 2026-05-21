import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { canManageBilling } from '@/lib/roles'
import {
  checkoutScopeForPlan,
  getStripe,
  stripePriceIdForPlan,
  type BillingInterval,
  type CheckoutPlanId,
} from '@/lib/stripe'

/** POST /api/stripe/checkout — checkout dipendente (PREMIUM) o ristorante (BASIC/PRO) */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await req.json()
    const plan = body?.plan as CheckoutPlanId
    const interval: BillingInterval =
      body?.interval === 'annual' ? 'annual' : 'monthly'

    if (plan !== 'PREMIUM' && plan !== 'BASIC' && plan !== 'PRO') {
      return NextResponse.json(
        { error: 'Piano non valido. Usa PREMIUM, BASIC o PRO.' },
        { status: 400 }
      )
    }

    const scope = checkoutScopeForPlan(plan)

    if (scope === 'restaurant' && !canManageBilling(session.user.role)) {
      return NextResponse.json(
        {
          error:
            'Solo Manager, Titolare o Admin possono acquistare piani ristorante',
        },
        { status: 403 }
      )
    }

    const priceId = stripePriceIdForPlan(plan, interval)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Configurazione Stripe incompleta (price id)' },
        { status: 500 }
      )
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY non configurata' },
        { status: 500 }
      )
    }

    const baseUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
    const stripe = getStripe()

    if (scope === 'employee') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          stripeCustomerId: true,
          employeeSubscriptionStatus: true,
        },
      })

      if (!user) {
        return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
      }

      if (user.employeeSubscriptionStatus === 'PREMIUM') {
        return NextResponse.json(
          { error: 'Sei già sul piano Premium Dipendente' },
          { status: 400 }
        )
      }

      let customerId = user.stripeCustomerId
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: user.name,
          email: user.email,
          metadata: { userId: user.id, scope: 'employee' },
        })
        customerId = customer.id
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        })
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/subscription?success=1&scope=employee`,
        cancel_url: `${baseUrl}/subscription?canceled=1`,
        metadata: {
          scope: 'employee',
          userId: user.id,
          plan: 'PREMIUM',
        },
        subscription_data: {
          metadata: {
            scope: 'employee',
            userId: user.id,
            plan: 'PREMIUM',
          },
        },
        allow_promotion_codes: true,
      })

      if (!checkoutSession.url) {
        return NextResponse.json(
          { error: 'Impossibile creare la sessione di checkout' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
      })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Ristorante non associato al tuo account' },
        { status: 400 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 })
    }

    if (restaurant.subscriptionStatus === plan) {
      return NextResponse.json(
        { error: `Il ristorante è già sul piano ${plan}` },
        { status: 400 }
      )
    }

    let customerId = restaurant.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: restaurant.name,
        email: session.user.email ?? undefined,
        metadata: { restaurantId: restaurant.id, scope: 'restaurant' },
      })
      customerId = customer.id
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscription?success=1&scope=restaurant`,
      cancel_url: `${baseUrl}/subscription?canceled=1`,
      metadata: {
        scope: 'restaurant',
        restaurantId: restaurant.id,
        plan,
      },
      subscription_data: {
        metadata: {
          scope: 'restaurant',
          restaurantId: restaurant.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    })

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: 'Impossibile creare la sessione di checkout' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('POST /api/stripe/checkout error:', error)
    return NextResponse.json(
      {
        error: 'Errore durante il checkout',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
