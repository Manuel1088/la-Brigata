import type { PrismaClient } from '@prisma/client'
import { resolveEmployeeForUser } from '@/lib/tips'

/** ADMIN e MANAGER bypassano i flag Employee per edit/delete mance */
export const TIPS_PRIVILEGED_ROLES = new Set(['ADMIN', 'MANAGER'])

export async function userCanEditTips(
  prisma: PrismaClient,
  userId: string,
  role: string,
  restaurantId: string
): Promise<boolean> {
  if (TIPS_PRIVILEGED_ROLES.has(role)) return true
  const employee = await resolveEmployeeForUser(prisma, userId, restaurantId)
  return !!employee?.canEditTips
}

export async function userCanDeleteTips(
  prisma: PrismaClient,
  userId: string,
  role: string,
  restaurantId: string
): Promise<boolean> {
  if (TIPS_PRIVILEGED_ROLES.has(role)) return true
  const employee = await resolveEmployeeForUser(prisma, userId, restaurantId)
  return !!employee?.canDeleteTips
}
