/**
 * Crea utenti (tabella users) a partire dai dipendenti (tabella employees).
 *
 * Esegui con: npx tsx scripts/seed-users-from-employees.ts
 */

import { PrismaClient, type EmployeeRole, type UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const RESTAURANT_ID = 'mirabelle-001'
const DEFAULT_PASSWORD = 'Brigata2026!'
const EMAIL_DOMAIN = 'mirabelle.it'
const MANAGER_NAME = 'Costanzi Luca'

function hierarchyLevelForRole(role: UserRole): number {
  if (role === 'MANAGER') return 8
  if (role === 'DIPENDENTE') return 5
  return 5
}

/** Spazi → punto, lowercase, solo caratteri email-safe */
function emailFromName(name: string): string {
  const local = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')

  return local ? `${local}@${EMAIL_DOMAIN}` : `user@${EMAIL_DOMAIN}`
}

function departmentFromEmployeeRole(role: EmployeeRole): string {
  switch (role) {
    case 'CHEF':
    case 'SOUS_CHEF':
    case 'COOK':
    case 'DISHWASHER':
      return 'cucina'
    case 'WAITER':
    case 'HOST':
    case 'CASHIER':
      return 'sala'
    case 'BARTENDER':
      return 'beverage'
    case 'MANAGER':
    case 'OWNER':
      return 'sala'
    default:
      return 'sala'
  }
}

function userRoleForEmployee(name: string): UserRole {
  if (name.trim() === MANAGER_NAME) return 'MANAGER'
  return 'DIPENDENTE'
}

async function main() {
  console.log('👤 Seed users da employees\n')

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: RESTAURANT_ID },
    select: { id: true, name: true, companyId: true },
  })

  if (!restaurant) {
    throw new Error(`Ristorante ${RESTAURANT_ID} non trovato — esegui prima seed-la-brigata.ts`)
  }

  const employees = await prisma.employee.findMany({
    where: { restaurantId: RESTAURANT_ID },
    orderBy: { name: 'asc' },
  })

  if (employees.length === 0) {
    console.log('⚠️  Nessun employee trovato per', RESTAURANT_ID)
    return
  }

  const hashedPassword = await hash(DEFAULT_PASSWORD, 12)
  const usedEmails = new Set<string>()
  let created = 0
  let updated = 0
  let skipped = 0

  for (const emp of employees) {
    if (emp.name.trim().toLowerCase() === 'cucina') {
      console.log(`   ⏭️  Saltato (non persona): ${emp.name}`)
      skipped++
      continue
    }

    let email = emp.email?.trim().toLowerCase() || emailFromName(emp.name)

    if (usedEmails.has(email)) {
      const base = email.replace(`@${EMAIL_DOMAIN}`, '')
      let n = 2
      while (usedEmails.has(`${base}${n}@${EMAIL_DOMAIN}`)) n++
      email = `${base}${n}@${EMAIL_DOMAIN}`
    }
    usedEmails.add(email)

    const role = userRoleForEmployee(emp.name)
    const hierarchyLevel = hierarchyLevelForRole(role)
    const department = departmentFromEmployeeRole(emp.role)

    const existing = await prisma.user.findUnique({ where: { email } })

    const userData = {
      name: emp.name,
      password: hashedPassword,
      role,
      hierarchyLevel,
      restaurantId: RESTAURANT_ID,
      companyId: restaurant.companyId,
      department,
      isActive: emp.isActive,
      userType: 'EMPLOYEE' as const,
      phone: emp.phone ?? undefined,
    }

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: userData,
      })
      updated++
      console.log(`   🔄 Aggiornato: ${emp.name} → ${email} (${role})`)
    } else {
      await prisma.user.create({
        data: {
          email,
          ...userData,
        },
      })
      created++
      console.log(`   ✅ Creato: ${emp.name} → ${email} (${role})`)
    }

    if (!emp.email || emp.email !== email) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { email, updatedAt: new Date() },
      })
    }
  }

  console.log('\n📊 Riepilogo')
  console.log(`   Dipendenti letti: ${employees.length}`)
  console.log(`   Utenti creati:    ${created}`)
  console.log(`   Utenti aggiornati: ${updated}`)
  console.log(`   Saltati:          ${skipped}`)
  console.log(`\n🔑 Password default: ${DEFAULT_PASSWORD}`)
  console.log(`   Manager: ${MANAGER_NAME} → ${emailFromName(MANAGER_NAME)} (MANAGER)`)
}

main()
  .catch((err) => {
    console.error('❌ Errore:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
