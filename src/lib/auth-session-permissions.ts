import type { CategoryGrants } from '@/lib/category-permissions'
import { expandCategoryGrants, EMPTY_CATEGORY_GRANTS } from '@/lib/category-permissions'
import { loadCategoryGrantsForUser } from '@/lib/user-permissions-db'

export type SessionPermissionPayload = {
  categoryGrants: CategoryGrants
  dbGrantedPermissionIds: string[]
}

export async function loadSessionPermissionPayload(
  userId: string
): Promise<SessionPermissionPayload> {
  const categoryGrants = await loadCategoryGrantsForUser(userId)
  const dbGrantedPermissionIds = expandCategoryGrants(categoryGrants)
  return { categoryGrants, dbGrantedPermissionIds }
}

export function emptySessionPermissionPayload(): SessionPermissionPayload {
  return {
    categoryGrants: { ...EMPTY_CATEGORY_GRANTS },
    dbGrantedPermissionIds: [],
  }
}
