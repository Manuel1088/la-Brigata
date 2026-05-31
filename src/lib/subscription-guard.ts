import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Errore lanciato quando l'abbonamento del ristorante è scaduto (EXPIRED).
 * Le route lo intercettano nel catch e restituiscono 402.
 */
export class SubscriptionExpiredError extends Error {
  readonly status = 402
  constructor(
    message = 'Abbonamento scaduto. Rinnova il tuo piano per continuare.'
  ) {
    super(message)
    this.name = 'SubscriptionExpiredError'
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      { error: 'subscription_expired', message: this.message },
      { status: this.status }
    )
  }
}

/**
 * Verifica che il piano del ristorante non sia scaduto.
 * - EXPIRED → throw SubscriptionExpiredError (402)
 * - FREE / BASIC / PRO → passa (per ora si blocca solo per scadenza, non per piano)
 *
 * Da usare SOLO sulle azioni di scrittura, mai sulle letture.
 */
export async function requireActiveRestaurantPlan(
  restaurantId: string
): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { subscriptionStatus: true },
  })

  // Se il ristorante non esiste, lasciamo che siano gli altri controlli
  // (accesso/validazione) a gestire l'errore: qui blocchiamo solo per scadenza.
  if (restaurant?.subscriptionStatus === 'EXPIRED') {
    throw new SubscriptionExpiredError()
  }
}

/** Helper opzionale per intercettare l'errore nei catch delle route. */
export function subscriptionErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof SubscriptionExpiredError) {
    return error.toResponse()
  }
  return null
}
