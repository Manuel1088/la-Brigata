/**
 * Precarica festività italiane 2026–2027 per ogni ristorante attivo.
 * Esegui: npx tsx scripts/seed-italian-holidays.ts
 */

import { EventType, PrismaClient } from '@prisma/client'
import { italianHolidays2026And2027 } from '../src/lib/italian-holidays'

const prisma = new PrismaClient()

async function main() {
  const restaurants = await prisma.restaurant.findMany({ select: { id: true, name: true } })
  if (restaurants.length === 0) {
    console.log('Nessun ristorante trovato.')
    return
  }

  const holidays = italianHolidays2026And2027()
  let created = 0
  let skipped = 0

  for (const restaurant of restaurants) {
    for (const h of holidays) {
      const date = new Date(`${h.date}T12:00:00.000Z`)
      try {
        await prisma.restaurantEvent.upsert({
          where: {
            restaurantId_date_name: {
              restaurantId: restaurant.id,
              date,
              name: h.name,
            },
          },
          create: {
            restaurantId: restaurant.id,
            name: h.name,
            description: h.description,
            date,
            expectedGuests: 0,
            eventType: EventType.FESTA,
          },
          update: {
            description: h.description,
            eventType: EventType.FESTA,
          },
        })
        created++
      } catch {
        skipped++
      }
    }
    console.log(`✅ ${restaurant.name}: ${holidays.length} festività`)
  }

  console.log(`\nFatto. Upsert: ${created}, saltati: ${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
