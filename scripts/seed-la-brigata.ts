/**
 * LA BRIGATA - Script di importazione dati da Excel
 * 
 * Esegui con:  npx tsx scripts/seed-la-brigata.ts
 * 
 * Cosa fa:
 * 1. Crea il ristorante Mirabelle (cliente #1)
 * 2. Importa tutti i dipendenti dall'Anagrafica
 * 3. Importa tutte le mance dal DataBase
 * 4. Crea l'utente admin (tu)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── DATI DAL TUO EXCEL ─────────────────────────────────────────────────────

const RESTAURANT = {
  name: 'Mirabelle',
  address: 'Roma, Italia',
}

const LOCATIONS = ['Mirabelle', 'Adele']

const EMPLOYEES = [
  { name: 'Cucina',                score: 20, role: 'CHEF',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Costanzi Luca',         score: 10, role: 'MANAGER',   active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'De Carli Roberto',      score: 10, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Cardinali Matteo',      score: 10, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Catalin',               score: 10, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Alicinio Manuel',       score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Colaianni Fabrizio',    score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Silvestro Massimiliano',score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Defina Domenico',       score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Sette Daniele',         score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Donati Flavio',         score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Martinez Sandra',       score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Brughitta Francesco',   score:  3, role: 'COOK',      active: false, acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Moreira Ginger',        score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Mariano Simone',        score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Ludmilla',              score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Iannella Nicola',       score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Sottile Massimo',       score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Serino Antonio',        score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Paolinelli Edoardo',    score:  3, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Barbieri Giorgia',      score:  4, role: 'COOK',      active: false, acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Sara Bohannon',         score:  2, role: 'HOST',      active: true,  acceptsCash: false, acceptsCard: true,  acceptsForeign: false },
  { name: 'Matrone Sandra',        score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Izzo Laura',            score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Iveghes Gina',          score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Valentino Francesco',   score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Aloisio Christian',     score: 10, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Espinoza Victor',       score:  4, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Elena',                 score:  3, role: 'COOK',      active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Panico Gianmarco',      score: 10, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Cedullo Nikko',         score:  4, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Sean Paul Dima',        score:  2, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Bensiamar Omar',        score:  4, role: 'WAITER',    active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Faedda Giovanni',       score: 10, role: 'BARTENDER', active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Papitto Mauro',         score:  3, role: 'BARTENDER', active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Brocucci Daniele',      score: 10, role: 'BARTENDER', active: true,  acceptsCash: true,  acceptsCard: true,  acceptsForeign: true  },
  { name: 'Angela',                score:  1, role: 'DISHWASHER',active: true,  acceptsCash: true,  acceptsCard: false, acceptsForeign: false },
  { name: 'Tofik',                 score:  1, role: 'DISHWASHER',active: true,  acceptsCash: true,  acceptsCard: false, acceptsForeign: false },
  { name: 'Miah',                  score:  1, role: 'DISHWASHER',active: true,  acceptsCash: true,  acceptsCard: false, acceptsForeign: false },
  { name: 'Mamun',                 score:  1, role: 'DISHWASHER',active: false, acceptsCash: true,  acceptsCard: false, acceptsForeign: false },
  { name: 'Idris Gharami',         score:  1, role: 'DISHWASHER',active: true,  acceptsCash: true,  acceptsCard: false, acceptsForeign: false },
  { name: 'Kabir Hossain',         score:  1, role: 'DISHWASHER',active: true,  acceptsCash: true,  acceptsCard: false, acceptsForeign: false },
]

// Mance dal DataBase Excel (Jan-May 2026)
const TIPS = [
  { date: '2026-01-01', payment: 'Contanti', service: 'Non Festivo', location: 'Mirabelle', amount: 240.00 },
  { date: '2026-01-01', payment: 'Carta',    service: 'Non Festivo', location: 'Mirabelle', amount: 437.55 },
  { date: '2026-01-02', payment: 'Contanti', service: 'Non Festivo', location: 'Mirabelle', amount: 142.00 },
  { date: '2026-01-02', payment: 'Carta',    service: 'Non Festivo', location: 'Mirabelle', amount: 873.00 },
  // ⚠️ NOTA: questo file contiene solo i primi record come esempio.
  // Lo script completo con tutte le 442 mance viene generato automaticamente
  // dal file Excel tramite il comando: npx tsx scripts/generate-tips-seed.ts
]

// ─── SCRIPT PRINCIPALE ───────────────────────────────────────────────────────

async function main() {
  console.log('🚀 La Brigata — Importazione dati in corso...\n')

  // 1. Crea il ristorante Mirabelle
  console.log('🏨 Creazione ristorante Mirabelle...')
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'mirabelle-001' },
    update: { name: RESTAURANT.name },
    create: {
      id: 'mirabelle-001',
      name: RESTAURANT.name,
      address: RESTAURANT.address,
    }
  })
  console.log(`   ✅ ${restaurant.name} (ID: ${restaurant.id})`)

  // 2. Crea le location
  console.log('\n📍 Creazione location...')
  const locationMap: Record<string, string> = {}
  for (const locName of LOCATIONS) {
    const loc = await prisma.restaurantLocation.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name: locName } },
      update: {},
      create: {
        id: `loc-${locName.toLowerCase()}-001`,
        name: locName,
        restaurantId: restaurant.id,
        updatedAt: new Date(),
      }
    })
    locationMap[locName] = loc.id
    console.log(`   ✅ ${loc.name}`)
  }

  // 3. Crea i dipendenti
  console.log('\n👥 Importazione dipendenti...')
  const employeeMap: Record<string, string> = {}
  let empCount = 0
  for (const emp of EMPLOYEES) {
    const id = `emp-${emp.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-001`
    await prisma.employee.upsert({
      where: { id },
      update: {
        score: emp.score,
        isActive: emp.active,
      },
      create: {
        id,
        name: emp.name,
        score: emp.score,
        role: emp.role as any,
        isActive: emp.active,
        canInsertTips: ['MANAGER', 'HOST'].includes(emp.role),
        canViewAll: emp.role === 'MANAGER',
        restDays: [],
        restaurantId: restaurant.id,
        updatedAt: new Date(),
      }
    })
    employeeMap[emp.name] = id
    empCount++
  }
  console.log(`   ✅ ${empCount} dipendenti importati`)

  // 4. Crea utente admin (tu)
  console.log('\n🔐 Creazione utente admin...')
  const hashedPassword = await bcrypt.hash('LaBrigata2026!', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@labrigata.it' },
    update: {},
    create: {
      email: 'admin@labrigata.it',
      name: 'Manuel Alicinio',
      password: hashedPassword,
      role: 'ADMIN',
      hierarchyLevel: 11,
      restaurantId: restaurant.id,
      department: 'amministrazione',
      avatar: '👨‍🍳',
      userType: 'OWNER',
    }
  })
  console.log(`   ✅ Admin creato: ${adminUser.email}`)
  console.log(`   🔑 Password: LaBrigata2026!  (cambiala dopo il primo login)`)

  // 5. Importa mance
  console.log('\n💰 Importazione mance...')
  let tipCount = 0
  const defaultEmployeeId = employeeMap['Costanzi Luca'] || Object.values(employeeMap)[0]

  for (const tip of TIPS) {
    const locationId = locationMap[tip.location] || locationMap['Mirabelle']
    const paymentType = tip.payment === 'Carta' ? 'CARD' : tip.payment === 'Contanti' ? 'CASH' : 'FOREIGN'
    const id = `tip-${tip.date}-${paymentType}-${tip.location}-${Math.random().toString(36).substr(2, 6)}`

    await prisma.tipEntry.upsert({
      where: { id },
      update: {},
      create: {
        id,
        date: new Date(tip.date),
        location: tip.location,
        type: paymentType as any,
        amount: tip.amount,
        restaurantId: restaurant.id,
        locationId,
        createdBy: defaultEmployeeId,
        updatedAt: new Date(),
        notes: tip.service !== 'Non Festivo' ? tip.service : undefined,
      }
    })
    tipCount++
  }
  console.log(`   ✅ ${tipCount} mance importate`)

  // 6. Riepilogo finale
  console.log('\n' + '═'.repeat(50))
  console.log('✅ IMPORTAZIONE COMPLETATA')
  console.log('═'.repeat(50))
  console.log(`🏨 Ristorante:  ${restaurant.name}`)
  console.log(`👥 Dipendenti:  ${empCount} (${EMPLOYEES.filter(e => e.active).length} attivi)`)
  console.log(`💰 Mance:       ${tipCount} record`)
  console.log(`📧 Login:       admin@labrigata.it`)
  console.log(`🔑 Password:    LaBrigata2026!`)
  console.log('═'.repeat(50))
  console.log('\n👉 Prossimo passo: npm run dev → http://localhost:3000\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
