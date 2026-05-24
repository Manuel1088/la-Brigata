/**
 * Imposta ccnlLevel = LIVELLO_4 su utenti cucina (e Employee collegati / COOK).
 *
 * Esegui: npx tsx scripts/set-cucina-ccnl-l4.ts
 */

import { PrismaClient, CCNLLevel, type EmployeeRole } from '@prisma/client'

const prisma = new PrismaClient()
const TARGET = CCNLLevel.LIVELLO_4

function isCucinaDepartment(dept: string | null | undefined): boolean {
  const d = (dept || '').toLowerCase().trim()
  return d === 'cucina'
}

async function main() {
  console.log('🍳 Impostazione CCNL LIVELLO_4 per utenti cucina\n')

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      ccnlLevel: true,
      role: true,
    },
  })

  const cucinaUsers = allUsers.filter((u) => isCucinaDepartment(u.department))
  const cucinaUserIds = new Set(cucinaUsers.map((u) => u.id))

  let usersUpdated = 0
  let usersSkipped = 0

  for (const u of cucinaUsers) {
    if (u.ccnlLevel === TARGET) {
      usersSkipped++
      console.log(`   ⏭️  User già L4: ${u.name} (${u.email})`)
      continue
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { ccnlLevel: TARGET },
    })
    usersUpdated++
    console.log(
      `   ✅ User: ${u.name} (${u.email}) — ${u.ccnlLevel ?? 'null'} → ${TARGET}`
    )
  }

  const cookRole: EmployeeRole = 'COOK'
  const employees = await prisma.employee.findMany({
    where: {
      OR: [{ role: cookRole }, { userId: { in: [...cucinaUserIds] } }],
    },
    select: {
      id: true,
      name: true,
      role: true,
      userId: true,
      ccnlLevel: true,
    },
  })

  let employeesUpdated = 0
  let employeesSkipped = 0

  for (const e of employees) {
    if (e.ccnlLevel === TARGET) {
      employeesSkipped++
      continue
    }
    await prisma.employee.update({
      where: { id: e.id },
      data: { ccnlLevel: TARGET, updatedAt: new Date() },
    })
    employeesUpdated++
    console.log(
      `   ✅ Employee: ${e.name} (${e.role}) — ${e.ccnlLevel ?? 'null'} → ${TARGET}`
    )
  }

  console.log('\n📊 Riepilogo')
  console.log(`   Utenti cucina trovati:     ${cucinaUsers.length}`)
  console.log(`   Utenti aggiornati:         ${usersUpdated}`)
  console.log(`   Utenti già L4 (saltati):   ${usersSkipped}`)
  console.log(`   Employee COOK/collegati:   ${employees.length}`)
  console.log(`   Employee aggiornati:       ${employeesUpdated}`)
  console.log(`   Employee già L4 (saltati): ${employeesSkipped}`)
}

main()
  .catch((err) => {
    console.error('❌ Errore:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
