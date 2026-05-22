/**
 * Seed dipendenti cucina Mirabelle — User + Employee + Employment ACTIVE
 *
 * Esegui con: npx tsx scripts/seed-cucina-mirabelle.ts
 */

import {
  type CCNLLevel,
  type ContractType,
  PrismaClient,
  type UserRole,
} from '@prisma/client'
import { hash } from 'bcryptjs'
import {
  buildEmployeeId,
  DEFAULT_EMPLOYEE_PASSWORD,
  hierarchyLevelForUserRole,
  normalizeEmail,
  toEmployeeRole,
  toUserRole,
} from '../src/lib/employee-create'

const prisma = new PrismaClient()

const RESTAURANT_ID = 'mirabelle-001'
const EMAIL_DOMAIN = 'mirabelle.it'
const DEPARTMENT = 'cucina'

type SeedPerson = {
  displayName: string
  /** Se valorizzato, email = cognome.nome; altrimenti solo cognome@ */
  firstName?: string
  lastName?: string
  roleInput: string
  position: string
  ccnlLevel: CCNLLevel
}

const CUCINA_CHEF_DE_PARTIE: string[] = [
  'Marzetti',
  "D'Onghia",
  'Barrovecchio',
  'Rivieccio',
  'Piemontese',
  'Rosato',
  'Evelyn',
  'Fonte',
  'Di Simone',
  'Santaroli',
  'Cavallari',
  'De Salvo',
  'Casini',
  'Ruggeri',
  'Maidana',
  'Cassotta',
]

const PASTICCERIA: string[] = ['Delandre', 'Moscara', 'Spera', 'Michetti']

const LAVAGGIO_CUCINA: string[] = ['Selim Reza', 'Haminur', 'Civitella']

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function fullName(person: SeedPerson): string {
  if (person.firstName && person.lastName) {
    return `${person.firstName} ${person.lastName}`
  }
  return person.displayName
}

/** cognome.nome@mirabelle.it oppure cognome@ se nome non disponibile */
function buildEmail(person: SeedPerson): string {
  if (person.firstName && person.lastName) {
    const cognome = slugPart(person.lastName)
    const nome = slugPart(person.firstName)
    return `${cognome}.${nome}@${EMAIL_DOMAIN}`
  }
  const cognome = slugPart(person.displayName)
  return `${cognome}@${EMAIL_DOMAIN}`
}

function toSeedPerson(
  displayName: string,
  roleInput: string,
  position: string,
  ccnlLevel: CCNLLevel
): SeedPerson {
  return { displayName, roleInput, position, ccnlLevel }
}

const PEOPLE: SeedPerson[] = [
  ...CUCINA_CHEF_DE_PARTIE.map((n) =>
    toSeedPerson(n, 'CHEF_DE_PARTIE', 'Chef de Partie', 'LIVELLO_1')
  ),
  ...PASTICCERIA.map((n) => toSeedPerson(n, 'CHEF', 'Pasticcere', 'LIVELLO_3')),
  { displayName: 'Selim Reza', firstName: 'Selim', lastName: 'Reza', roleInput: 'LAVAPIATTI', position: 'Lavapiatti Cucina', ccnlLevel: 'LIVELLO_6' },
  ...LAVAGGIO_CUCINA.filter((n) => n !== 'Selim Reza').map((n) =>
    toSeedPerson(n, 'LAVAPIATTI', 'Lavapiatti Cucina', 'LIVELLO_6')
  ),
]

async function main() {
  console.log('🍳 Seed cucina Mirabelle\n')

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: RESTAURANT_ID },
    select: { id: true, name: true, companyId: true },
  })

  if (!restaurant) {
    throw new Error(`Ristorante ${RESTAURANT_ID} non trovato`)
  }

  const reviewer = await prisma.user.findFirst({
    where: {
      restaurantId: RESTAURANT_ID,
      role: { in: ['MANAGER', 'DIRETTORE', 'PROPRIETARIO', 'RESTAURANT_MANAGER'] },
    },
    select: { id: true, email: true },
  })

  const reviewedBy = reviewer?.id ?? null
  const hashedPassword = await hash(DEFAULT_EMPLOYEE_PASSWORD, 12)
  const startDate = new Date()

  let created = 0
  let skipped = 0
  let failed = 0

  for (const person of PEOPLE) {
    const name = fullName(person)
    const email = normalizeEmail(buildEmail(person))

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    if (existingUser) {
      console.log(`   ⏭️  Email già presente: ${name} (${email})`)
      skipped++
      continue
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        restaurantId: RESTAURANT_ID,
        OR: [{ email }, { name }],
      },
      select: { id: true, name: true },
    })

    if (existingEmployee) {
      console.log(`   ⏭️  Dipendente già presente: ${existingEmployee.name}`)
      skipped++
      continue
    }

    const userRole = toUserRole(person.roleInput)
    const hierarchyLevel = hierarchyLevelForUserRole(userRole)
    const employeeRole = toEmployeeRole(userRole, DEPARTMENT)
    const employeeId = buildEmployeeId(name)

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: userRole,
            hierarchyLevel,
            restaurantId: RESTAURANT_ID,
            companyId: restaurant.companyId,
            department: DEPARTMENT,
            contractType: 'full-time',
            contractTypeEnum: 'INDETERMINATO' as ContractType,
            startDate,
            userType: 'EMPLOYEE',
            isActive: true,
            position: person.position,
            ccnlLevel: person.ccnlLevel,
          },
        })

        await tx.employee.create({
          data: {
            id: employeeId,
            name,
            email,
            score: 5,
            restDays: [],
            role: employeeRole,
            restaurantId: RESTAURANT_ID,
            userId: user.id,
            isActive: true,
            canInsertTips: false,
            canEditTips: false,
            canDeleteTips: false,
            canViewAll: false,
            ccnlLevel: person.ccnlLevel,
            updatedAt: new Date(),
            createdBy: reviewedBy,
          },
        })

        await tx.employment.create({
          data: {
            userId: user.id,
            restaurantId: RESTAURANT_ID,
            status: 'ACTIVE',
            role: userRole,
            department: DEPARTMENT,
            startDate,
            reviewedAt: new Date(),
            reviewedBy,
          },
        })
      })

      console.log(
        `   ✅ ${name} — ${person.position} (${person.ccnlLevel}) → ${email}`
      )
      created++
    } catch (err) {
      console.error(`   ❌ ${name}:`, err instanceof Error ? err.message : err)
      failed++
    }
  }

  console.log('\n📊 Riepilogo')
  console.log(`   Totale in lista: ${PEOPLE.length}`)
  console.log(`   Creati:          ${created}`)
  console.log(`   Saltati:         ${skipped}`)
  console.log(`   Errori:          ${failed}`)
  console.log(`\n🔑 Password: ${DEFAULT_EMPLOYEE_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('❌ Errore:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
