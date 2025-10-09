import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // Solo errori e warning, no query (troppo verbose)
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Esportato anche come default per compatibilità
export default prisma


