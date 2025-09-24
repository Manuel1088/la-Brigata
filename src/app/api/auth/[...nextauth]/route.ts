import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { logLogin, logLogout } from '@/lib/audit'
import { getEmployeesFullClient } from '@/lib/employees'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

// Configurazione ruoli e livelli gerarchici
const roleConfig = {
  PROPRIETARIO: { level: 10, name: 'Proprietario', avatar: '👑' },
  DIRETTORE: { level: 9, name: 'Direttore', avatar: '👔' },
  MANAGER: { level: 8, name: 'Manager', avatar: '📊' },
  RESPONSABILE_SALA: { level: 7, name: 'Responsabile Sala', avatar: '🍽️' },
  HEAD_CHEF: { level: 7, name: 'Head Chef', avatar: '👨‍🍳' },
  HEAD_BARMAN: { level: 7, name: 'Head Barman', avatar: '🍸' },
  HEAD_SOMMELIER: { level: 7, name: 'Head Sommelier', avatar: '🍷' },
  CASSIERE: { level: 6, name: 'Cassiere', avatar: '💰' },
  DIPENDENTE: { level: 5, name: 'Dipendente', avatar: '👤' }
}

// Account demo con credenziali specifiche
const demoAccounts = {
  'admin': { 
    password: 'admin123', 
    user: { 
      id: '1', 
      email: 'admin@brigata.it', 
      name: 'Admin Proprietario', 
      role: 'ADMIN',
      level: 10,
      avatar: '👑'
    } 
  },
  'proprietario': {
    password: 'prop123',
    user: {
      id: '10',
      email: 'proprietario@brigata.it',
      name: 'Proprietario Demo',
      role: 'PROPRIETARIO',
      level: 10,
      avatar: '👑'
    }
  },
  'direttore': { 
    password: 'dir123', 
    user: { 
      id: '2', 
      email: 'direttore@brigata.it', 
      name: 'Marco Direttore', 
      role: 'DIRETTORE',
      level: 9,
      avatar: '👔'
    } 
  },
  'manager': { 
    password: 'mgr123', 
    user: { 
      id: '3', 
      email: 'manager@brigata.it', 
      name: 'Anna Manager', 
      role: 'MANAGER',
      level: 8,
      avatar: '📊'
    } 
  },
  'responsabile': {
    password: 'resp123',
    user: {
      id: '7',
      email: 'responsabile@brigata.it',
      name: 'Responsabile Sala Demo',
      role: 'RESPONSABILE_SALA',
      level: 7,
      avatar: '🍽️'
    }
  },
  'headchef': {
    password: 'chef123',
    user: {
      id: '8',
      email: 'headchef@brigata.it',
      name: 'Head Chef Demo',
      role: 'HEAD_CHEF',
      level: 7,
      avatar: '👨‍🍳'
    }
  },
  'cassiere': { 
    password: 'cassa123', 
    user: { 
      id: '4', 
      email: 'cassiere@brigata.it', 
      name: 'Luca Cassiere', 
      role: 'CASSIERE',
      level: 6,
      avatar: '💰'
    } 
  },
  'headbarman': {
    password: 'hb123',
    user: {
      id: '11',
      email: 'headbarman@brigata.it',
      name: 'Head Barman Demo',
      role: 'HEAD_BARMAN',
      level: 7,
      avatar: '🍸'
    }
  },
  'sommelier': {
    password: 'som123',
    user: {
      id: '12',
      email: 'sommelier@brigata.it',
      name: 'Head Sommelier Demo',
      role: 'HEAD_SOMMELIER',
      level: 7,
      avatar: '🍷'
    }
  },
  'dipendente': { 
    password: 'dip123', 
    user: { 
      id: '5', 
      email: 'dipendente@brigata.it', 
      name: 'Sofia Dipendente', 
      role: 'DIPENDENTE',
      level: 5,
      avatar: '👤'
    } 
  }
}

const handler = NextAuth({
  // Usa SECRET stabile: env in prod, fallback dev per evitare warning/decryption fail
  secret: process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === 'development' ? 'dev-nextauth-secret' : undefined),
  // Consente host dinamici in dev/preview se NEXTAUTH_URL non è impostato
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase()
        // 1) Login utenti registrati in DB (Prisma)
        try {
          const dbUser = await prisma.user.findUnique({ where: { email } })
          if (dbUser && dbUser.password) {
            const ok = await compare(credentials.password, dbUser.password)
            if (ok) {
              const user = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role as any,
                level: (dbUser as any).hierarchyLevel ?? 5,
                avatar: (dbUser as any).avatar ?? '👤',
                userType: (dbUser as any).userType ?? 'EMPLOYEE',
                companyId: (dbUser as any).companyId ?? null,
                informalCompanyId: (dbUser as any).informalCompanyId ?? null
              }
              await logLogin(user.id)
              return user as any
            }
          }
        } catch {}

        // 2) Account demo
        // Estrai username dall'email (prima parte prima di @)
        const username = email.split('@')[0]
        
        // Verifica credenziali demo
        if (demoAccounts[username as keyof typeof demoAccounts]) {
          const account = demoAccounts[username as keyof typeof demoAccounts]
          if (account.password === credentials.password) {
            // Mappa gli account demo a un dipendente reale (per gestione accessi)
            const loginToEmployeeId: Record<string, string> = {
              // Direzione
              admin: '1',
              proprietario: '1',
              direttore: '2',
              manager: '2',
              // Reparti
              headchef: '1', // EXECUTIVE_CHEF
              responsabile: '4', // DIPENDENTE_SALA (usata come responsabile demo)
              cassiere: '5', // DIPENDENTE_BAR
              dipendente: '3', // CHEF_DE_PARTIE
              headbarman: '6', // HEAD_BARMAN
              sommelier: '7', // HEAD_SOMMELIER
            }
            const mappedId = loginToEmployeeId[username]
            // Collega tutti i demo (tranne admin) ad una stessa azienda demo
            let companyId: string | null = null
            if (username !== 'admin') {
              try {
                const demoFiscalCode = 'DEMO_CF_0001'
                const demoName = 'Azienda Demo'
                const company = await prisma.company.upsert({
                  where: { fiscalCode: demoFiscalCode },
                  update: {},
                  create: { name: demoName, fiscalCode: demoFiscalCode, isActive: true }
                })
                companyId = company.id
              } catch {}
            }
            const user = { ...account.user, id: mappedId || account.user.id, companyId }
            await logLogin(user.id)
            return user as any
          }
        }

        // 3) Login demo per ogni dipendente: usa la loro email e password "demo"
        try {
          const employees = getEmployeesFullClient()
          const found = employees.find(e => e.email.toLowerCase() === email)
          if (found && credentials.password === 'demo') {
            // Mappa i ruoli dei dipendenti alle categorie della piattaforma
            const roleMap: Record<string, string> = {
              EXECUTIVE_CHEF: 'HEAD_CHEF',
              SOUS_CHEF: 'HEAD_CHEF',
              CHEF_DE_PARTIE: 'DIPENDENTE',
              DIPENDENTE_SALA: 'DIPENDENTE',
              DIPENDENTE_BAR: 'DIPENDENTE'
            }
            const mappedRole = roleMap[found.role] || 'DIPENDENTE'
            const user = {
              id: found.id,
              email: found.email,
              name: found.name,
              role: mappedRole,
              level: found.level || 5,
              avatar: found.avatar || '👤'
            }
            await logLogin(user.id)
            return user as any
          }
        } catch {}
        
        return null
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 ore
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'role' in user) {
        token.role = (user as any).role;
        token.level = (user as any).level;
        token.avatar = (user as any).avatar;
      }
      if (user && 'id' in user) {
        token.sub = (user as any).id;
      }
      // Propaga sempre companyId/informalCompanyId se presenti (anche per account demo)
      if (user && 'userType' in user) {
        (token as any).userType = (user as any).userType;
      }
      if (user && 'companyId' in user) {
        (token as any).companyId = (user as any).companyId;
      }
      if (user && 'informalCompanyId' in user) {
        (token as any).informalCompanyId = (user as any).informalCompanyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role as string;
        (session.user as any).level = token.level as number;
        (session.user as any).avatar = token.avatar as string;
        (session.user as any).userType = (token as any).userType as string | undefined;
        (session.user as any).companyId = (token as any).companyId as string | null | undefined;
        (session.user as any).informalCompanyId = (token as any).informalCompanyId as string | null | undefined;
      }
      return session;
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.sub) {
        await logLogout(token.sub as string)
      }
    }
  }
})

export { handler as GET, handler as POST }
