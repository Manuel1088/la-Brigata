/**
 * Seed turni predefiniti per mirabelle-001
 *
 * Esegui con:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-shift-templates.ts
 */
import { PrismaClient, ShiftTemplateType } from '@prisma/client'

const prisma = new PrismaClient()

const RESTAURANT_ID = 'mirabelle-001'

const DEFAULT_TEMPLATES: Array<{
  name: string
  startTime: string
  endTime: string
  type: ShiftTemplateType
  color: string
  sortOrder: number
}> = [
  { name: 'Pranzo',      startTime: '12:00', endTime: '15:00', type: 'PRANZO',    color: '#F59E0B', sortOrder: 0 },
  { name: 'Cena',        startTime: '17:00', endTime: '23:00', type: 'CENA',      color: '#3B82F6', sortOrder: 1 },
  { name: 'Spezzato',    startTime: '12:00', endTime: '23:00', type: 'SPEZZATO',  color: '#8B5CF6', sortOrder: 2 },
  { name: 'Breakfast',   startTime: '07:00', endTime: '11:00', type: 'BREAKFAST', color: '#F97316', sortOrder: 3 },
  { name: 'Apertura',    startTime: '10:00', endTime: '15:00', type: 'ALTRO',     color: '#10B981', sortOrder: 4 },
  { name: 'Chiusura',    startTime: '18:00', endTime: '23:00', type: 'ALTRO',     color: '#6366F1', sortOrder: 5 },
  { name: 'Serale',      startTime: '19:00', endTime: '00:00', type: 'NOTTURNO',  color: '#1E293B', sortOrder: 6 },
]

async function main() {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: RESTAURANT_ID } })
  if (!restaurant) {
    console.error(`❌  Ristorante '${RESTAURANT_ID}' non trovato nel DB`)
    process.exit(1)
  }

  console.log(`🍽️  Seed turni per: ${restaurant.name} (${RESTAURANT_ID})`)

  let created = 0
  let skipped = 0

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await prisma.shiftTemplate.findFirst({
      where: { restaurantId: RESTAURANT_ID, name: tpl.name },
    })
    if (existing) {
      console.log(`  ⏭️  Già presente: ${tpl.name}`)
      skipped++
      continue
    }
    await prisma.shiftTemplate.create({
      data: { ...tpl, restaurantId: RESTAURANT_ID, isActive: true },
    })
    console.log(`  ✅  Creato: ${tpl.name} (${tpl.startTime}–${tpl.endTime})`)
    created++
  }

  console.log(`\nFine seed: ${created} creati, ${skipped} già presenti.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
