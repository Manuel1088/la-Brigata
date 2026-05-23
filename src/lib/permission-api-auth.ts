import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  canAccessPermissionManagementPage,
  type PermissionActor,
} from '@/lib/category-permissions'
import { prisma } from '@/lib/db'

export async function getPermissionActorFromSession(): Promise<PermissionActor | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  let level = session.user.level
  let restaurantId = session.user.restaurantId
  let role = String(session.user.role)
  let ccnlLevel = session.user.ccnlLevel
  let department = session.user.department

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        hierarchyLevel: true,
        restaurantId: true,
        role: true,
        ccnlLevel: true,
        department: true,
      },
    })
    if (dbUser) {
      level = dbUser.hierarchyLevel ?? level
      restaurantId = dbUser.restaurantId ?? restaurantId
      role = String(dbUser.role)
      ccnlLevel = dbUser.ccnlLevel ?? ccnlLevel
      department = dbUser.department ?? department
    }
  } catch {
    // session values are enough if DB read fails
  }

  const actor: PermissionActor = {
    id: session.user.id,
    role,
    level,
    ccnlLevel,
    department,
    restaurantId,
    categoryGrants: session.user.categoryGrants,
  }

  if (!canAccessPermissionManagementPage(actor)) {
    return null
  }

  return actor
}
