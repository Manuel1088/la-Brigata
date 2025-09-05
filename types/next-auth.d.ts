// types/next-auth.d.ts
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id?: string
    role?: string
    level?: number
    avatar?: string
  }
  interface Session {
    user?: User & {
      id: string
      role: string
      level: number
      avatar: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    level?: number
    avatar?: string
  }
}
