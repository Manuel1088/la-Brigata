// types/next-auth.d.ts
import type { UserRoleString } from '@/types/roles'
import type { CCNLLevel } from '@/lib/ccnl'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: UserRoleString
    level?: number
    ccnlLevel?: CCNLLevel | string | null
    avatar?: string
    department?: string
    companyId?: string
    restaurantId?: string
    phone?: string
  }
  interface Session {
    user?: User & {
      id: string
      role: UserRoleString
      level: number
      ccnlLevel?: CCNLLevel | string | null
      avatar: string
      department?: string
      companyId?: string
      restaurantId?: string
      phone?: string
      userType?: string
      informalCompanyId?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRoleString
    level?: number
    ccnlLevel?: CCNLLevel | string | null
    avatar?: string
    userType?: string
    companyId?: string | null
    informalCompanyId?: string | null
    restaurantId?: string
    department?: string
  }
}


