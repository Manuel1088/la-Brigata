import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { canManageBilling } from '@/lib/stripe'

/** GET /api/stripe/subscription — piani ristorante + dipendente */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const [user, restaurant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          employeeSubscriptionStatus: true,
          employeeSubscriptionPeriodEnd: true,
          stripeCustomerId: true,
        },
      }),
      session.user.restaurantId
        ? prisma.restaurant.findUnique({
            where: { id: session.user.restaurantId },
            select: {
              id: true,
              name: true,
              subscriptionStatus: true,
              subscriptionPeriodEnd: true,
              stripeCustomerId: true,
            },
          })
        : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      employee: {
        status: user?.employeeSubscriptionStatus ?? 'FREE',
        periodEnd: user?.employeeSubscriptionPeriodEnd ?? null,
        hasStripeCustomer: Boolean(user?.stripeCustomerId),
      },
      restaurant: restaurant
        ? {
            status: restaurant.subscriptionStatus,
            periodEnd: restaurant.subscriptionPeriodEnd,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            hasStripeCustomer: Boolean(restaurant.stripeCustomerId),
          }
        : {
            status: 'FREE' as const,
            periodEnd: null,
            restaurantId: null,
            restaurantName: null,
            hasStripeCustomer: false,
          },
      canManageBilling: canManageBilling(session.user.role),
    })
  } catch (error) {
    console.error('GET /api/stripe/subscription error:', error)
    return NextResponse.json(
      {
        error: 'Errore nel caricamento abbonamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
