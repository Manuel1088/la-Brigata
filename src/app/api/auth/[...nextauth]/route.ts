import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { logLogin, logLogout } from '@/lib/audit'
import { getEmployeesFullClient } from '@/lib/employees'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

// Configurazione ruoli e livelli gerarchici
const roleConfig = {
  ADMIN: { level: 11, name: 'Amministratore', avatar: '🛡️' },        // Team La Brigata (gestione piattaforma)
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
      name: 'Amministratore', 
      role: 'ADMIN',
      level: 11,  // Team La Brigata
      avatar: '🛡️'
    } 
  },
  // 🗑️ Tutti gli altri account demo sono stati rimossi
  // Gli utenti reali verranno caricati dal database PostgreSQL
}

export const authOptions: AuthOptions = {
  // Usa SECRET stabile: env in prod, fallback dev per evitare warning/decryption fail
  secret: process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === 'development' ? 'dev-nextauth-secret' : undefined),
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
            // Mappa account admin
            const loginToEmployeeId: Record<string, string> = {
              admin: '1'  // 🛡️ SOLO ADMIN disponibile
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
    strategy: 'jwt' as const,
    maxAge: 8 * 60 * 60, // 8 ore
  },
  callbacks: {
    async jwt({ token, user, trigger }: any) {
      // Al primo login, salva i dati dell'utente
      if (user && 'role' in user) {
        token.role = (user as any).role;
        token.level = (user as any).level;
        token.avatar = (user as any).avatar;
        token.name = user.name;
        token.email = user.email;
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
      
      // Ricarica i dati dal database ogni volta per avere sempre i dati freschi
      // (o almeno quando c'è un update trigger)
      if (token.sub && !user) {
        try {
          const dbUser = await prisma.user.findUnique({ 
            where: { id: token.sub as string }
          })
          if (dbUser) {
            token.name = dbUser.name
            token.email = dbUser.email
            token.role = dbUser.role as any
            token.avatar = (dbUser as any).avatar ?? '👤'
          }
        } catch (e) {
          console.error('Error refreshing user data in JWT:', e)
        }
      }
      
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).name = token.name;  // ← Aggiornato dal JWT
        (session.user as any).email = token.email;  // ← Aggiornato dal JWT
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
};

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
