import NextAuth, { AuthOptions, type User } from 'next-auth'
import type { UserRoleString } from '@/types/roles'
import CredentialsProvider from 'next-auth/providers/credentials'
import { logLogin, logLogout } from '@/lib/audit'
import { loadSessionPermissionPayload } from '@/lib/auth-session-permissions'
import {
  inferCcnlFromEmployeeRole,
  inferCcnlFromRole,
  resolveSessionCcnlLevel,
} from '@/lib/ccnl-infer'
import { getEmployeesFullClient } from '@/lib/employees'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'

async function attachPermissionsToToken(
  token: import('next-auth/jwt').JWT,
  userId: string
): Promise<void> {
  try {
    const payload = await loadSessionPermissionPayload(userId)
    ;(token as { categoryGrants?: typeof payload.categoryGrants }).categoryGrants =
      payload.categoryGrants
    ;(token as { dbGrantedPermissionIds?: string[] }).dbGrantedPermissionIds =
      payload.dbGrantedPermissionIds
  } catch (e) {
    console.error('Error loading user permissions for session:', e)
  }
}

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
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase()
        // 1) Login utenti registrati in DB (Prisma)
        try {
          const dbUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
          if (dbUser && dbUser.password) {
            const ok = await compare(credentials.password, dbUser.password)
            if (ok) {
            const linkedEmployee = await prisma.employee.findFirst({
              where: {
                OR: [
                  { userId: dbUser.id },
                  { email: { equals: dbUser.email, mode: 'insensitive' } },
                ],
              },
              select: { role: true, ccnlLevel: true },
            })
            const user: User = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: String(dbUser.role) as UserRoleString,
              level: Number((dbUser as unknown as { hierarchyLevel?: number }).hierarchyLevel ?? 5),
              ccnlLevel: resolveSessionCcnlLevel(
                String(dbUser.role),
                dbUser.hierarchyLevel,
                dbUser.ccnlLevel ?? linkedEmployee?.ccnlLevel,
                { employeeRole: linkedEmployee?.role ?? null }
              ),
              avatar: (dbUser as unknown as { avatar?: string }).avatar ?? '👤',
              userType: (dbUser as unknown as { userType?: string }).userType ?? 'EMPLOYEE',
              companyId: (dbUser as unknown as { companyId?: string | null }).companyId ?? null,
              informalCompanyId: (dbUser as unknown as { informalCompanyId?: string | null }).informalCompanyId ?? null,
              restaurantId: dbUser.restaurantId,
              department: dbUser.department ?? undefined,
              position: dbUser.position ?? undefined,
            } as unknown as User
              await logLogin((user as unknown as { id: string }).id)
              return user
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
            const user: User = {
              id: mappedId || account.user.id,
              email: account.user.email,
              name: account.user.name,
              role: account.user.role as UserRoleString,
              level: account.user.level,
              avatar: account.user.avatar,
              companyId
            } as unknown as User
            await logLogin((user as unknown as { id: string }).id)
            return user
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
            const mappedRole = (roleMap[found.role] || 'DIPENDENTE') as UserRoleString
            const demoCcnl =
              (found as { ccnlLevel?: string | null }).ccnlLevel ??
              inferCcnlFromEmployeeRole(found.role) ??
              inferCcnlFromRole(found.role)
            const user: User = {
              id: found.id,
              email: found.email,
              name: found.name,
              role: mappedRole,
              level: found.level || 5,
              ccnlLevel: demoCcnl,
              avatar: found.avatar || '👤'
            } as unknown as User
            await logLogin((user as unknown as { id: string }).id)
            return user
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
    async jwt({ token, user }: { token: import('next-auth/jwt').JWT; user?: User | null }) {
      // Al primo login, salva i dati dell'utente
      if (user && 'role' in user) {
        token.role = (user as unknown as { role?: import('@/types/roles').UserRoleString }).role;
        token.level = (user as unknown as { level?: number }).level;
        const loginCcnl = (user as unknown as { ccnlLevel?: string | null }).ccnlLevel
        token.ccnlLevel = loginCcnl
          ? String(loginCcnl)
          : inferCcnlFromRole(
              String(
                (user as unknown as { role?: import('@/types/roles').UserRoleString })
                  .role ?? ''
              )
            )
        token.avatar = (user as unknown as { avatar?: string }).avatar;
        token.name = user.name;
        token.email = user.email;
      }
      if (user && 'id' in user) {
        token.sub = (user as unknown as { id: string }).id;
      }
      // Propaga sempre companyId/informalCompanyId se presenti (anche per account demo)
      if (user && 'userType' in user) {
        (token as unknown as { userType?: string }).userType = (user as unknown as { userType?: string }).userType;
      }
      if (user && 'companyId' in user) {
        (token as unknown as { companyId?: string | null }).companyId = (user as unknown as { companyId?: string | null }).companyId;
      }
      if (user && 'informalCompanyId' in user) {
        (token as unknown as { informalCompanyId?: string | null }).informalCompanyId = (user as unknown as { informalCompanyId?: string | null }).informalCompanyId;
      }
      if (user && 'restaurantId' in user) {
        (token as { restaurantId?: string }).restaurantId = (user as { restaurantId?: string }).restaurantId;
      }
      if (user && 'department' in user) {
        (token as { department?: string }).department = (user as { department?: string }).department;
      }
      if (user && 'position' in user) {
        (token as { position?: string | null }).position =
          (user as { position?: string | null }).position ?? null;
      }

      if (user && 'id' in user && (user as { id?: string }).id) {
        await attachPermissionsToToken(token, (user as { id: string }).id)
      }
      
      // Ricarica i dati dal database ogni volta per avere sempre i dati freschi
      // (o almeno quando c'è un update trigger)
      if (token.sub && !user) {
        try {
          const dbUser = await prisma.user.findUnique({ 
            where: { id: token.sub as string }
          })
          if (dbUser) {
            const linkedEmployee = await prisma.employee.findFirst({
              where: {
                OR: [
                  { userId: dbUser.id },
                  { email: { equals: dbUser.email, mode: 'insensitive' } },
                ],
              },
              select: { role: true, ccnlLevel: true },
            })
            token.name = dbUser.name
            token.email = dbUser.email
            token.role = String(dbUser.role) as import('@/types/roles').UserRoleString
            token.level = dbUser.hierarchyLevel ?? token.level
            token.ccnlLevel = resolveSessionCcnlLevel(
              String(dbUser.role),
              dbUser.hierarchyLevel,
              dbUser.ccnlLevel ?? linkedEmployee?.ccnlLevel,
              { employeeRole: linkedEmployee?.role ?? null }
            )
            token.avatar = (dbUser as unknown as { avatar?: string }).avatar ?? '👤'
            ;(token as { restaurantId?: string | null }).restaurantId =
              dbUser.restaurantId ?? null
            ;(token as { department?: string | null }).department = dbUser.department
            ;(token as { position?: string | null }).position = dbUser.position
            await attachPermissionsToToken(token, dbUser.id)
          }
        } catch (e) {
          console.error('Error refreshing user data in JWT:', e)
          if (token.sub) {
            await attachPermissionsToToken(token, token.sub as string)
          }
        }
      }
      
      return token;
    },
    async session({ session, token }: { session: import('next-auth').Session; token: import('next-auth/jwt').JWT }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name as string | undefined;
        session.user.email = token.email as string | undefined;
        session.user.role = token.role as unknown as import('@/types/roles').UserRoleString;
        session.user.level = token.level as number;
        session.user.ccnlLevel = (token.ccnlLevel as string | null | undefined) ?? null;
        session.user.avatar = token.avatar as string;
        session.user.userType = token.userType as string | undefined;
        session.user.companyId = (token.companyId as string | null | undefined) ?? undefined;
        session.user.informalCompanyId = token.informalCompanyId as string | null | undefined;
        session.user.restaurantId = (token as { restaurantId?: string }).restaurantId;
        session.user.department = (token as { department?: string }).department;
        session.user.position = (token as { position?: string | null }).position ?? null;
        session.user.categoryGrants = (
          token as { categoryGrants?: import('@/lib/category-permissions').CategoryGrants }
        ).categoryGrants;
        session.user.dbGrantedPermissionIds = (
          token as { dbGrantedPermissionIds?: string[] }
        ).dbGrantedPermissionIds;
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
