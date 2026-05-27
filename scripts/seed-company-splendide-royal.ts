/**
 * Crea la Company "Splendide Royal" e la collega al ristorante mirabelle-001
 * e a tutti i suoi utenti.
 *
 * Esegui con: npx tsx scripts/seed-company-splendide-royal.ts
 */

import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

function cuid(): string {
  return 'c' + randomBytes(11).toString('hex')
}

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Avvio creazione Company Splendide Royal...\n')

  // 1. Crea la Company
  const companyId = cuid()
  const company = await prisma.company.create({
    data: {
      id: companyId,
      name: 'Splendide Royal',
      fiscalCode: '06876680635',
      isActive: true,
    },
  })
  console.log(`✅ Company creata: ${company.name} (id: ${company.id})`)

  // 2. Collega il ristorante mirabelle-001
  const updatedRestaurant = await prisma.restaurant.update({
    where: { id: 'mirabelle-001' },
    data: { companyId: company.id },
    select: { id: true, name: true, companyId: true },
  })
  console.log(`✅ Ristorante aggiornato: ${updatedRestaurant.name} → companyId: ${updatedRestaurant.companyId}`)

  // 3. Aggiorna tutti gli utenti con restaurantId = 'mirabelle-001' e companyId null
  const { count: usersUpdated } = await prisma.user.updateMany({
    where: {
      restaurantId: 'mirabelle-001',
      companyId: null,
    },
    data: { companyId: company.id },
  })
  console.log(`✅ Utenti aggiornati: ${usersUpdated} utenti con companyId impostato`)

  console.log('\n📊 Riepilogo:')
  console.log(`   Company id : ${company.id}`)
  console.log(`   Ristorante : 1 (mirabelle-001)`)
  console.log(`   Utenti     : ${usersUpdated}`)
}

main()
  .catch((err) => {
    console.error('❌ Errore:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
