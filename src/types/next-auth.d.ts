// types/next-auth.d.ts
import NextAuth from 'next-auth'
import type { UserRoleString } from '@/types/roles'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: UserRoleString
    level?: number
    avatar?: string
  }
  interface Session {
    user?: User & {
      id: string
      role: UserRoleString
      level: number
      avatar: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRoleString
    level?: number
    avatar?: string
  }
}


