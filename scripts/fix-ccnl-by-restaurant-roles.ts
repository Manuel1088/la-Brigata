/**
 * Corregge ccnlLevel su User (+ Employee collegati) per cucina, beverage, accoglienza
 * secondo RESTAURANT_ROLES. Non modifica sala né dirigenti.
 *
 * Esegui: npx tsx scripts/fix-ccnl-by-restaurant-roles.ts
 */

import { PrismaClient, CCNLLevel, type UserRole } from '@prisma/client'

const prisma = new PrismaClient()

/** reparto normalizzato → ruolo User → CCNL atteso */
const FIXES: Record<string, Partial<Record<string, CCNLLevel>>> = {
  cucina: {
    EXECUTIVE_CHEF: CCNLLevel.QA,
    SOUS_CHEF: CCNLLevel.QB,
    CHEF_DE_PARTIE: CCNLLevel.LIVELLO_1,
    CHEF: CCNLLevel.LIVELLO_3,
    LAVAPIATTI: CCNLLevel.LIVELLO_6,
  },
  beverage: {
    HEAD_BARMAN: CCNLLevel.LIVELLO_1,
    HEAD_SOMMELIER: CCNLLevel.LIVELLO_1,
    BARMAN: CCNLLevel.LIVELLO_3,
    SOMMELIER: CCNLLevel.LIVELLO_3,
    DIPENDENTE_BAR: CCNLLevel.LIVELLO_3,
  },
  accoglienza: {
    CASSIERE: CCNLLevel.LIVELLO_4,
    EVENT_COORDINATOR: CCNLLevel.LIVELLO_3,
    DIPENDENTE: CCNLLevel.LIVELLO_3,
  },
}

function normalizeDept(dept: string | null | undefined): string | null {
  if (!dept?.trim()) return null
  const d = dept.toLowerCase().trim()
  if (d === 'bar' || d === 'sommellerie') return 'beverage'
  return d
}

function targetCcnl(dept: string | null, role: string): CCNLLevel | null {
  if (!dept) return null
  const map = FIXES[dept]
  if (!map) return null
  return map[role] ?? null
}

type RoleStats = {
  department: string
  role: string
  expected: CCNLLevel
  usersUpdated: number
  usersSkipped: number
  employeesUpdated: number
}

async function main() {
  console.log('🔧 Correzione CCNL (cucina, beverage, accoglienza)\n')

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      ccnlLevel: true,
      linkedEmployees: { select: { id: true, ccnlLevel: true } },
    },
  })

  const statsByKey = new Map<string, RoleStats>()
  let totalUsersUpdated = 0
  let totalEmployeesUpdated = 0

  for (const u of users) {
    const dept = normalizeDept(u.department)
    if (!dept || dept === 'sala' || dept === 'dirigenti' || dept === 'pasticceria') {
      continue
    }

    const role = String(u.role)
    const expected = targetCcnl(dept, role)
    if (!expected) continue

    const statKey = `${dept}|${role}`
    if (!statsByKey.has(statKey)) {
      statsByKey.set(statKey, {
        department: dept,
        role,
        expected,
        usersUpdated: 0,
        usersSkipped: 0,
        employeesUpdated: 0,
      })
    }
    const stat = statsByKey.get(statKey)!

    const current = u.ccnlLevel ? String(u.ccnlLevel) : null
    if (current === expected) {
      stat.usersSkipped++
      continue
    }

    await prisma.user.update({
      where: { id: u.id },
      data: { ccnlLevel: expected },
    })
    stat.usersUpdated++
    totalUsersUpdated++
    console.log(
      `   ✅ User [${dept}] ${u.name} (${role}): ${current ?? 'null'} → ${expected}`
    )

    for (const emp of u.linkedEmployees) {
      const empCurrent = emp.ccnlLevel ? String(emp.ccnlLevel) : null
      if (empCurrent === expected) continue
      await prisma.employee.update({
        where: { id: emp.id },
        data: { ccnlLevel: expected, updatedAt: new Date() },
      })
      stat.employeesUpdated++
      totalEmployeesUpdated++
    }
  }

  const deptOrder = ['cucina', 'beverage', 'accoglienza']
  const deptLabels: Record<string, string> = {
    cucina: '🍳 Cucina',
    beverage: '🍸 Bar / Beverage',
    accoglienza: '🛎️ Accoglienza',
  }

  console.log('\n📊 Aggiornamenti per ruolo\n')
  for (const dept of deptOrder) {
    const rows = [...statsByKey.values()]
      .filter((s) => s.department === dept)
      .sort((a, b) => a.role.localeCompare(b.role))
    if (rows.length === 0) {
      console.log(`\n${deptLabels[dept] ?? dept}: nessun utente nei ruoli target\n`)
      continue
    }
    console.log(`\n${deptLabels[dept] ?? dept}`)
    console.log('| Ruolo | CCNL impostato | Utenti aggiornati | Già corretti | Employee aggiornati |')
    console.log('|-------|----------------|-------------------|--------------|---------------------|')
    for (const s of rows) {
      console.log(
        `| ${s.role} | ${s.expected} | ${s.usersUpdated} | ${s.usersSkipped} | ${s.employeesUpdated} |`
      )
    }
  }

  console.log('\n📋 Totale')
  console.log(`   Utenti aggiornati:    ${totalUsersUpdated}`)
  console.log(`   Employee aggiornati:  ${totalEmployeesUpdated}`)
  console.log(`   Sala / dirigenti:     non modificati\n`)
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
