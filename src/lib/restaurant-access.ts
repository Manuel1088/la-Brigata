import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'

export async function resolveRestaurantAccess(userId: string, restaurantId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true, ccnlLevel: true },
  })
  if (!user) return { allowed: false as const, user: null }

  if (user.restaurantId === restaurantId) {
    return { allowed: true as const, user }
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })

  if (
    restaurant?.companyId &&
    user.companyId === restaurant.companyId &&
    isManagerRole(user.role)
  ) {
    return { allowed: true as const, user }
  }

  return { allowed: false as const, user: null }
}

export async function restaurantIdsForManager(user: {
  restaurantId: string | null
  companyId: string | null
  role: string
}): Promise<string[]> {
  if (user.restaurantId) return [user.restaurantId]
  if (user.companyId && isManagerRole(user.role)) {
    const restaurants = await prisma.restaurant.findMany({
      where: { companyId: user.companyId },
      select: { id: true },
    })
    return restaurants.map((r) => r.id)
  }
  return []
}
