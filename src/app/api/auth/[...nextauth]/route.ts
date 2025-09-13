import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { logLogin, logLogout } from '@/lib/audit'
import { getEmployeesFullClient } from '@/lib/employees'

// Configurazione ruoli e livelli gerarchici
const roleConfig = {
  PROPRIETARIO: { level: 10, name: 'Proprietario', avatar: '👑' },
  DIRETTORE: { level: 9, name: 'Direttore', avatar: '👔' },
  MANAGER: { level: 8, name: 'Manager', avatar: '📊' },
  RESPONSABILE_SALA: { level: 7, name: 'Responsabile Sala', avatar: '🍽️' },
  HEAD_CHEF: { level: 7, name: 'Head Chef', avatar: '👨‍🍳' },
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
      name: 'Rita Responsabile Sala',
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
      name: 'Carlo Head Chef',
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

        // Estrai username dall'email (prima parte prima di @)
        const username = credentials.email.split('@')[0]
        
        // Verifica credenziali demo
        if (demoAccounts[username as keyof typeof demoAccounts]) {
          const account = demoAccounts[username as keyof typeof demoAccounts]
          if (account.password === credentials.password) {
            // Log del login
            await logLogin(account.user.id)
            return account.user
          }
        }
        // Verifica account demo per dipendenti esistenti (password universale: demo123)
        try {
          const employees = getEmployeesFullClient()
          const emp = employees.find(e => e.email.toLowerCase() === credentials.email.toLowerCase())
          if (emp && credentials.password === 'demo123') {
            // Mappa ruolo employee a ruoli del sistema permessi
            const mapRole = (r: string): keyof typeof roleConfig => {
              const key = r.toUpperCase()
              if (key.includes('RESPONSABILE') && key.includes('SALA')) return 'RESPONSABILE_SALA'
              if (key.includes('CHEF')) return 'HEAD_CHEF'
              if (key.includes('CASSIERE')) return 'CASSIERE'
              return 'DIPENDENTE'
            }
            const mapped = mapRole(emp.role)
            const user = {
              id: emp.id,
              email: emp.email,
              name: emp.name,
              role: mapped,
              level: roleConfig[mapped]?.level ?? emp.level ?? 5,
              avatar: emp.avatar || roleConfig[mapped]?.avatar || '👤'
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
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role as string;
        (session.user as any).level = token.level as number;
        (session.user as any).avatar = token.avatar as string;
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
