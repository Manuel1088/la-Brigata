// types/next-auth.d.ts
import NextAuth from 'next-auth'
import type { UserRoleString } from '@/types/roles'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: UserRoleString
    level?: number
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
    avatar?: string
    userType?: string
    companyId?: string | null
    informalCompanyId?: string | null
  }
}


