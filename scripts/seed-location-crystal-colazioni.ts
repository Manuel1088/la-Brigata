/**
 * Aggiunge RestaurantLocation "Crystal - Colazioni" (outlet Mirabelle).
 * Non modifica Mirabelle né Adele.
 *
 * Esegui: npx tsx scripts/seed-location-crystal-colazioni.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RESTAURANT_ID = 'mirabelle-001'
const LOCATION_NAME = 'Crystal - Colazioni'

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: RESTAURANT_ID },
    select: { id: true, name: true },
  })
  if (!restaurant) {
    throw new Error(`Ristorante ${RESTAURANT_ID} non trovato`)
  }

  const maxSort = await prisma.restaurantLocation.aggregate({
    where: { restaurantId: RESTAURANT_ID },
    _max: { sortOrder: true },
  })
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1

  const loc = await prisma.restaurantLocation.upsert({
    where: {
      restaurantId_name: {
        restaurantId: RESTAURANT_ID,
        name: LOCATION_NAME,
      },
    },
    update: {},
    create: {
      id: 'loc-crystal-colazioni-001',
      name: LOCATION_NAME,
      outletName: 'Mirabelle',
      type: 'COLAZIONI',
      restaurantId: RESTAURANT_ID,
      isActive: true,
      sortOrder,
      icon: '☕',
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Location creata/verificata: ${loc.name} (${loc.id})`)
  console.log(`   outlet: ${loc.outletName} | type: ${loc.type} | sortOrder: ${loc.sortOrder}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
