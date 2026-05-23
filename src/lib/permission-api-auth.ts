import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  canAccessPermissionManagementPage,
  type PermissionActor,
} from '@/lib/category-permissions'

export async function getPermissionActorFromSession(): Promise<PermissionActor | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const actor: PermissionActor = {
    id: session.user.id,
    role: String(session.user.role),
    level: session.user.level,
    ccnlLevel: session.user.ccnlLevel,
    department: session.user.department,
    restaurantId: session.user.restaurantId,
    categoryGrants: session.user.categoryGrants,
  }

  if (!canAccessPermissionManagementPage(actor)) {
    return null
  }

  return actor
}
