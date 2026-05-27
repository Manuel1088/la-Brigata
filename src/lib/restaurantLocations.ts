import type { PrismaClient } from '@prisma/client'
import { MANAGER_ROLES } from '@/lib/roles'
import { assertRestaurantAccess as _assertRestaurantAccess } from '@/lib/restaurant-access'

export { MANAGER_ROLES }

const DEFAULT_LOCATION_NAMES = ['Mirabelle', 'Adele'] as const

/** Crea Mirabelle/Adele se il ristorante non ha ancora location (es. seed incompleto) */
export async function ensureRestaurantLocations(
  prisma: PrismaClient,
  restaurantId: string
) {
  const existing = await prisma.restaurantLocation.findMany({
    where: { restaurantId },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  })

  if (existing.length > 0) return existing

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  })
  if (!restaurant) return []

  const now = new Date()
  for (const name of DEFAULT_LOCATION_NAMES) {
    await prisma.restaurantLocation.upsert({
      where: {
        restaurantId_name: { restaurantId, name },
      },
      create: {
        id: `loc-${name.toLowerCase()}-${restaurantId}`,
        name,
        outletName: name,
        type: 'RISTORANTE',
        restaurantId,
        isActive: true,
        sortOrder: name === 'Adele' ? 1 : 0,
        icon: '🍽️',
        updatedAt: now,
      },
      update: { updatedAt: now },
    })
  }

  return prisma.restaurantLocation.findMany({
    where: { restaurantId },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  })
}

/** @deprecated Use assertRestaurantAccess from lib/restaurant-access directly. */
export async function assertRestaurantAccess(
  _prisma: PrismaClient,
  userId: string,
  restaurantId: string
): Promise<boolean> {
  return _assertRestaurantAccess(userId, restaurantId)
}
