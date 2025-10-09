import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production'
      ? ['error']  // In produzione solo errori critici
      : [],        // ✅ In development NESSUN log (pulito!)
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Esportato anche come default per compatibilità
export default prisma


