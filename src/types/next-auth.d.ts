// types/next-auth.d.ts
import type { UserRoleString } from '@/types/roles'
import type { CCNLLevel } from '@/lib/ccnl'
import type { CategoryGrants } from '@/lib/category-permissions'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: UserRoleString
    level?: number
    ccnlLevel?: CCNLLevel | string | null
    avatar?: string
    department?: string
    position?: string | null
    companyId?: string
    restaurantId?: string
    phone?: string
    categoryGrants?: CategoryGrants
    dbGrantedPermissionIds?: string[]
  }
  interface Session {
    user?: User & {
      id: string
      role: UserRoleString
      level: number
      ccnlLevel?: CCNLLevel | string | null
      avatar: string
      department?: string
      position?: string | null
      companyId?: string
      restaurantId?: string
      phone?: string
      userType?: string
      informalCompanyId?: string | null
      categoryGrants?: CategoryGrants
      dbGrantedPermissionIds?: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRoleString
    level?: number
    ccnlLevel?: CCNLLevel | string | null
    avatar?: string
    phone?: string | null
    userType?: string
    companyId?: string | null
    informalCompanyId?: string | null
    restaurantId?: string
    department?: string
    position?: string | null
    categoryGrants?: CategoryGrants
    dbGrantedPermissionIds?: string[]
  }
}


