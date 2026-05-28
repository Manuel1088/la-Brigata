/**
 * Seed task ricorrenti di default per ruolo.
 * Esegui con: npx ts-node --transpile-only scripts/seed-task-templates.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const RESTAURANT_ID = 'mirabelle-001'

type Tpl = {
  role: string
  title: string
  recurring: 'GIORNALIERO' | 'SETTIMANALE' | 'MENSILE'
  priority: 'ALTA' | 'MEDIA' | 'BASSA'
}

const TEMPLATES: Tpl[] = [
  // SOMMELIER
  { role: 'SOMMELIER', title: 'Inventario cantina', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'SOMMELIER', title: 'Aggiornamento carta vini', recurring: 'SETTIMANALE', priority: 'MEDIA' },

  // MAITRE
  { role: 'MAITRE', title: 'Smontaggio vetri terrazza', recurring: 'SETTIMANALE', priority: 'MEDIA' },
  { role: 'MAITRE', title: 'Report sala mensile', recurring: 'MENSILE', priority: 'ALTA' },

  // EXECUTIVE_CHEF
  { role: 'EXECUTIVE_CHEF', title: 'Cambio menu stagionale', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'EXECUTIVE_CHEF', title: 'Cambio menu (revisione 2)', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'EXECUTIVE_CHEF', title: 'Cambio menu (revisione 3)', recurring: 'MENSILE', priority: 'MEDIA' },
  { role: 'EXECUTIVE_CHEF', title: 'Cambio menu (revisione 4)', recurring: 'MENSILE', priority: 'MEDIA' },
  { role: 'EXECUTIVE_CHEF', title: 'Briefing cucina settimanale', recurring: 'SETTIMANALE', priority: 'ALTA' },

  // HEAD_BARMAN
  { role: 'HEAD_BARMAN', title: 'Inventario bar', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'HEAD_BARMAN', title: 'Ordine scorte bar', recurring: 'SETTIMANALE', priority: 'MEDIA' },

  // CAPO_PASTICCERE
  { role: 'CAPO_PASTICCERE', title: 'Inventario pasticceria', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'CAPO_PASTICCERE', title: 'Produzione dessert menu settimanale', recurring: 'SETTIMANALE', priority: 'ALTA' },

  // CHEF_DE_PARTIE
  { role: 'CHEF_DE_PARTIE', title: 'Controllo mise en place', recurring: 'GIORNALIERO', priority: 'ALTA' },
  { role: 'CHEF_DE_PARTIE', title: 'Pulizia e igienizzazione postazione', recurring: 'GIORNALIERO', priority: 'ALTA' },

  // CAMERIERE_QUALIFICATO
  { role: 'CAMERIERE_QUALIFICATO', title: 'Controllo mise en place sala', recurring: 'GIORNALIERO', priority: 'ALTA' },
  { role: 'CAMERIERE_QUALIFICATO', title: 'Lucidatura posate e cristalleria', recurring: 'SETTIMANALE', priority: 'MEDIA' },

  // HEAD_SOMMELIER
  { role: 'HEAD_SOMMELIER', title: 'Inventario cantina principale', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'HEAD_SOMMELIER', title: 'Aggiornamento carta vini', recurring: 'SETTIMANALE', priority: 'MEDIA' },
  { role: 'HEAD_SOMMELIER', title: 'Formazione team beverage', recurring: 'MENSILE', priority: 'MEDIA' },

  // SOUS_CHEF
  { role: 'SOUS_CHEF', title: 'Briefing brigata cucina', recurring: 'GIORNALIERO', priority: 'ALTA' },
  { role: 'SOUS_CHEF', title: 'Controllo e inventario scorte', recurring: 'SETTIMANALE', priority: 'MEDIA' },

  // RESPONSABILE_SALA
  { role: 'RESPONSABILE_SALA', title: 'Report presenze sala', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'RESPONSABILE_SALA', title: 'Controllo standard di servizio', recurring: 'SETTIMANALE', priority: 'ALTA' },

  // CASSIERE
  { role: 'CASSIERE', title: 'Chiusura cassa', recurring: 'GIORNALIERO', priority: 'ALTA' },
  { role: 'CASSIERE', title: 'Riconciliazione carte di credito', recurring: 'MENSILE', priority: 'ALTA' },

  // BARMAN
  { role: 'BARMAN', title: 'Inventario bar', recurring: 'MENSILE', priority: 'ALTA' },
  { role: 'BARMAN', title: 'Ordine scorte bar', recurring: 'SETTIMANALE', priority: 'MEDIA' },

  // COMMIS_DI_SALA
  { role: 'COMMIS_DI_SALA', title: 'Mise en place tavoli', recurring: 'GIORNALIERO', priority: 'ALTA' },
  { role: 'COMMIS_DI_SALA', title: 'Pulizia sala e arredi', recurring: 'GIORNALIERO', priority: 'ALTA' },
]

async function main() {
  console.log(`🌱 Seed task templates per ristorante ${RESTAURANT_ID}`)

  // Find a manager to use as assignedById
  const manager = await prisma.user.findFirst({
    where: {
      restaurantId: RESTAURANT_ID,
      role: { in: ['ADMIN', 'MANAGER', 'PROPRIETARIO', 'PROPRIETARIO_OPERATIVO', 'DIRETTORE', 'DIRETTORE_GENERALE'] },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!manager) {
    // Fallback: any user in the restaurant
    const fallback = await prisma.user.findFirst({ where: { restaurantId: RESTAURANT_ID } })
    if (!fallback) {
      console.error(`❌ Nessun utente trovato per restaurantId=${RESTAURANT_ID}`)
      process.exit(1)
    }
    console.warn(`⚠️  Nessun manager trovato — uso utente ${fallback.id} come assignedBy`)
    return await seedWith(fallback.id)
  }

  console.log(`✅ Manager found: ${manager.name ?? manager.id} (${manager.role})`)
  await seedWith(manager.id)
}

async function seedWith(assignedById: string) {
  let created = 0
  let skipped = 0

  for (const tpl of TEMPLATES) {
    const existing = await prisma.task.findFirst({
      where: {
        restaurantId: RESTAURANT_ID,
        title: tpl.title,
        assignedToRole: tpl.role,
      },
    })

    if (existing) {
      console.log(`  ↷ Skip   [${tpl.role}] ${tpl.title}`)
      skipped++
      continue
    }

    await prisma.task.create({
      data: {
        restaurantId: RESTAURANT_ID,
        assignedById,
        title: tpl.title,
        assignedToRole: tpl.role,
        priority: tpl.priority,
        isRecurring: true,
        recurringType: tpl.recurring,
        status: 'DA_FARE',
        description: `Task ricorrente (${tpl.recurring.toLowerCase()}) per ruolo ${tpl.role}`,
      },
    })
    console.log(`  ✓ Create [${tpl.role}] ${tpl.title} (${tpl.recurring})`)
    created++
  }

  console.log(`\n🏁 Done — ${created} creati, ${skipped} già presenti (skip)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
