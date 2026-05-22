/**
 * Corregge ruoli/reparti utenti Mirabelle — User + Employment + Employee collegato
 *
 * Esegui con: npx tsx scripts/fix-roles-mirabelle.ts
 */

import { PrismaClient, type UserRole } from '@prisma/client'
import {
  hierarchyLevelForUserRole,
  toEmployeeRole,
} from '../src/lib/employee-create'

const prisma = new PrismaClient()
const RESTAURANT_ID = 'mirabelle-001'

type UserFix = {
  email: string
  role: UserRole
  department?: string
  position?: string
}

const FIXES: UserFix[] = [
  {
    email: 'matrone.sandra@mirabelle.it',
    role: 'EVENT_COORDINATOR',
    department: 'accoglienza',
    position: 'Event Coordinator',
  },
  {
    email: 'barbieri.giorgia@mirabelle.it',
    role: 'CASSIERE',
    department: 'accoglienza',
  },
  {
    email: 'brughitta.francesco@mirabelle.it',
    role: 'CAMERIERE_QUALIFICATO',
    department: 'sala',
  },
  {
    email: 'mamun@mirabelle.it',
    role: 'LAVAPIATTI',
    department: 'sala',
  },
  {
    email: 'delandre@mirabelle.it',
    role: 'CAPO_PASTICCERE',
    department: 'pasticceria',
    position: 'Capo Pasticcere',
  },
  {
    email: 'michetti@mirabelle.it',
    role: 'CHEF',
    department: 'pasticceria',
    position: 'Pasticcere',
  },
  {
    email: 'moscara@mirabelle.it',
    role: 'SOUS_CHEF',
    department: 'pasticceria',
    position: 'Secondo Pasticcere',
  },
  {
    email: 'spera@mirabelle.it',
    role: 'CHEF',
    department: 'pasticceria',
    position: 'Pasticcere',
  },
  {
    email: 'costanzi.luca@mirabelle.it',
    role: 'MANAGER',
    department: 'dirigenti',
    position: 'F&B Manager',
  },
]

async function main() {
  console.log('🔧 Fix ruoli Mirabelle\n')

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const fix of FIXES) {
    const user = await prisma.user.findFirst({
      where: { email: fix.email, restaurantId: RESTAURANT_ID },
      select: { id: true, name: true, email: true, role: true, department: true, position: true },
    })

    if (!user) {
      console.log(`   ⏭️  Non trovato: ${fix.email}`)
      skipped++
      continue
    }

    const department = fix.department ?? user.department ?? 'sala'
    const position = fix.position ?? user.position
    const hierarchyLevel = hierarchyLevelForUserRole(fix.role)
    const employeeRole = toEmployeeRole(fix.role, department)

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            role: fix.role,
            hierarchyLevel,
            department,
            position,
          },
        })

        await tx.employment.updateMany({
          where: { userId: user.id, restaurantId: RESTAURANT_ID },
          data: {
            role: fix.role,
            department,
          },
        })

        await tx.employee.updateMany({
          where: { userId: user.id, restaurantId: RESTAURANT_ID },
          data: { role: employeeRole },
        })
      })

      console.log(
        `   ✅ ${user.name} → ${fix.role} | ${department}${position ? ` | ${position}` : ''}`
      )
      updated++
    } catch (err) {
      console.error(
        `   ❌ ${user.name}:`,
        err instanceof Error ? err.message : err
      )
      failed++
    }
  }

  console.log('\n📊 Riepilogo')
  console.log(`   Aggiornati: ${updated}`)
  console.log(`   Saltati:    ${skipped}`)
  console.log(`   Errori:     ${failed}`)
}

main()
  .catch((err) => {
    console.error('❌ Errore:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
