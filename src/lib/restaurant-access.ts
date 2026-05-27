import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'

async function fetchUserAccess(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true, ccnlLevel: true },
  })
}

type UserAccessRow = NonNullable<Awaited<ReturnType<typeof fetchUserAccess>>>

async function fetchRestaurantCompany(restaurantId: string): Promise<string | null> {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })
  return r?.companyId ?? null
}

/**
 * Unified restaurant access check — single source of truth.
 *
 * @param userId       ID dell'utente loggato
 * @param restaurantId ID del ristorante target
 * @param requireManager Se true, anche l'accesso al proprio ristorante richiede ruolo manager.
 *                       Usato da route di report/mance dove i dati aggregati sono solo per manager.
 */
export async function assertRestaurantAccess(
  userId: string,
  restaurantId: string,
  requireManager = false
): Promise<boolean> {
  const user = await fetchUserAccess(userId)
  if (!user) return false

  if (user.restaurantId === restaurantId) {
    return requireManager ? isManagerRole(user.role) : true
  }

  if (!isManagerRole(user.role)) return false

  const companyId = await fetchRestaurantCompany(restaurantId)
  return !!(companyId && user.companyId === companyId)
}

/**
 * Versione completa che restituisce anche l'oggetto user (per route che ne hanno bisogno).
 */
export async function resolveRestaurantAccess(userId: string, restaurantId: string) {
  const user = await fetchUserAccess(userId)
  if (!user) return { allowed: false as const, user: null }

  if (user.restaurantId === restaurantId) {
    return { allowed: true as const, user }
  }

  const companyId = await fetchRestaurantCompany(restaurantId)
  if (companyId && user.companyId === companyId && isManagerRole(user.role)) {
    return { allowed: true as const, user }
  }

  return { allowed: false as const, user: null }
}

/**
 * Controlla se `managerId` è un manager che può gestire l'utente `targetUserId`.
 * Il manager deve avere ruolo manager E lo stesso restaurantId o companyId del target.
 */
export async function assertManagerOfUser(
  managerId: string,
  targetUserId: string
): Promise<boolean> {
  const [manager, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: managerId },
      select: { restaurantId: true, companyId: true, role: true },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { restaurantId: true, companyId: true },
    }),
  ])
  if (!manager || !target) return false
  if (!isManagerRole(manager.role)) return false

  if (manager.restaurantId && manager.restaurantId === target.restaurantId) return true

  if (manager.companyId && target.companyId && manager.companyId === target.companyId) return true

  // Controlla se target appartiene a un ristorante della stessa company del manager
  if (manager.companyId && target.restaurantId) {
    const companyId = await fetchRestaurantCompany(target.restaurantId)
    if (companyId && companyId === manager.companyId) return true
  }

  return false
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
