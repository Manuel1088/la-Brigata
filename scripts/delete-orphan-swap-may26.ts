/**
 * Rimuove richiesta cambio turno duplicata (26 mag, PEER_PENDING, Martinez → Moreira).
 * Esegui: npx tsx scripts/delete-orphan-swap-may26.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const ORPHAN_ID = 'cmplr4qwb0005itfd21z1v599'

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL / DIRECT_URL mancante')

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })

  try {
    const before = await prisma.shiftSwapRequest.findUnique({
      where: { id: ORPHAN_ID },
      include: {
        requester: { select: { name: true } },
        target: { select: { name: true } },
      },
    })
    if (!before) {
      console.log('Richiesta già assente:', ORPHAN_ID)
      return
    }
    console.log('Elimino:', {
      id: before.id,
      status: before.status,
      requester: before.requester.name,
      target: before.target.name,
      date: before.requesterDate.toISOString().slice(0, 10),
    })

    await prisma.$executeRawUnsafe(
      `DELETE FROM shift_swap_requests WHERE id = '${ORPHAN_ID}'`
    )

    const after = await prisma.shiftSwapRequest.count()
    console.log('Swap rimanenti nel DB:', after)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
