import type { PrismaClient } from '@prisma/client'
import { isManagerRole, MANAGER_ROLES } from '@/lib/roles'

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
        restaurantId,
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

export async function assertRestaurantAccess(
  prisma: PrismaClient,
  userId: string,
  restaurantId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true },
  })
  if (!user) return false

  if (user.restaurantId === restaurantId) return true

  if (!isManagerRole(user.role)) return false

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })

  return !!(restaurant?.companyId && user.companyId === restaurant.companyId)
}
