import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'

/**
 * GET /api/onboarding/status
 * Stato onboarding del titolare/manager del ristorante corrente.
 * - hasLocations: il ristorante ha almeno una Sala (RestaurantLocation)
 * - hasEmployees: il ristorante ha almeno un Employment ACTIVE collegato al ristorante
 * - needsOnboarding: titolare/manager senza nessuna Sala → wizard bloccante
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const role = String(session.user.role ?? '')
  const restaurantId = session.user.restaurantId ?? null
  const isOwnerOrManager = isManagerRole(role)

  if (!restaurantId) {
    return NextResponse.json({
      isOwnerOrManager,
      restaurantId: null,
      hasLocations: false,
      hasEmployees: false,
      subscriptionStatus: null,
      needsOnboarding: false,
    })
  }

  const [locationsCount, employeesCount, restaurant] = await Promise.all([
    prisma.restaurantLocation.count({ where: { restaurantId } }),
    prisma.employment.count({ where: { restaurantId, status: 'ACTIVE' } }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { subscriptionStatus: true },
    }),
  ])

  const hasLocations = locationsCount > 0
  const hasEmployees = employeesCount > 0

  return NextResponse.json({
    isOwnerOrManager,
    restaurantId,
    hasLocations,
    hasEmployees,
    subscriptionStatus: restaurant?.subscriptionStatus ?? null,
    // Wizard bloccante solo per titolare/manager senza alcuna Sala
    needsOnboarding: isOwnerOrManager && !hasLocations,
  })
}
