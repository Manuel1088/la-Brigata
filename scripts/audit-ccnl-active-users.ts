/**
 * Audit read-only: ruoli utenti attivi vs ccnlLevel DB vs atteso CCNL ristorazione.
 * Esegui: npx tsx scripts/audit-ccnl-active-users.ts
 */

import { PrismaClient } from '@prisma/client'
import {
  departmentFromStorage,
  suggestedCcnlForRole,
  type RestaurantDepartment,
} from '../src/lib/restaurant-roles'
import {
  inferCcnlFromEmployeeRole,
  inferCcnlFromRole,
  resolveSessionCcnlLevel,
} from '../src/lib/ccnl-infer'
import { isPlatformAdmin } from '../src/lib/platform-admin'

const prisma = new PrismaClient()

const DEPT_ORDER: Record<string, number> = {
  dirigenti: 0,
  amministrazione: 0,
  gestione: 0,
  cucina: 1,
  pasticceria: 2,
  sala: 3,
  beverage: 4,
  bar: 4,
  accoglienza: 5,
  altro: 9,
}

function normalizeDept(dept: string | null | undefined): string {
  if (!dept?.trim()) return 'altro'
  const d = dept.toLowerCase().trim()
  if (d === 'bar' || d === 'sommellerie') return 'beverage'
  if (d === 'gestione' || d === 'direzione') return 'dirigenti'
  return d
}

function expectedCcnlForUser(
  role: string,
  department: string | null,
  hierarchyLevel: number | null,
  employeeRole: string | null
): string | null {
  if (isPlatformAdmin(role, hierarchyLevel ?? undefined)) return null

  const dept = normalizeDept(department)
  const deptKeys = [
    'cucina',
    'pasticceria',
    'sala',
    'beverage',
    'accoglienza',
    'dirigenti',
  ] as const

  if (deptKeys.includes(dept as (typeof deptKeys)[number])) {
    const suggested = suggestedCcnlForRole(
      departmentFromStorage(dept) as RestaurantDepartment,
      role
    )
    if (suggested) return suggested
  }

  if (employeeRole) {
    const fromEmp = inferCcnlFromEmployeeRole(employeeRole)
    if (fromEmp) return fromEmp
  }

  return resolveSessionCcnlLevel(role, hierarchyLevel, null, {
    employeeRole,
  })
}

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      ccnlLevel: true,
      hierarchyLevel: true,
      position: true,
      linkedEmployees: { select: { role: true, ccnlLevel: true }, take: 1 },
    },
    orderBy: [{ department: 'asc' }, { role: 'asc' }, { name: 'asc' }],
  })

  console.log(`\n📋 Utenti attivi nel DB: ${users.length}\n`)

  type Row = {
    dept: string
    role: string
    count: number
    currentLevels: Map<string | null, number>
    expected: string | null
    mismatches: number
    examples: string[]
  }

  const byRoleDept = new Map<string, Row>()

  for (const u of users) {
    const dept = normalizeDept(u.department)
    const empRole = u.linkedEmployees[0]?.role ?? null
    const current = u.ccnlLevel ? String(u.ccnlLevel) : null
    const expected = expectedCcnlForUser(
      String(u.role),
      u.department,
      u.hierarchyLevel,
      empRole ? String(empRole) : null
    )
    const key = `${dept}|${u.role}`
    let row = byRoleDept.get(key)
    if (!row) {
      row = {
        dept,
        role: String(u.role),
        count: 0,
        currentLevels: new Map(),
        expected,
        mismatches: 0,
        examples: [],
      }
      byRoleDept.set(key, row)
    }
    row.count++
    row.currentLevels.set(current, (row.currentLevels.get(current) ?? 0) + 1)
    if (current !== expected) {
      row.mismatches++
      if (row.examples.length < 3) {
        row.examples.push(
          `${u.name} (attuale: ${current ?? '—'}, atteso: ${expected ?? '—'}${empRole ? `, emp: ${empRole}` : ''})`
        )
      }
    }
  }

  const sorted = [...byRoleDept.values()].sort((a, b) => {
    const da = DEPT_ORDER[a.dept] ?? 9
    const db = DEPT_ORDER[b.dept] ?? 9
    if (da !== db) return da - db
    return a.role.localeCompare(b.role)
  })

  const deptLabels: Record<string, string> = {
    dirigenti: '👔 Dirigenti / amministrazione',
    cucina: '🍳 Cucina',
    pasticceria: '🍰 Pasticceria',
    sala: '🍽️ Sala',
    beverage: '🍸 Bar / Beverage',
    accoglienza: '🛎️ Accoglienza',
    altro: '❓ Reparto non impostato',
  }

  let lastDept = ''
  let totalMismatch = 0

  for (const row of sorted) {
    if (row.dept !== lastDept) {
      lastDept = row.dept
      console.log(`\n## ${deptLabels[row.dept] ?? row.dept}\n`)
      console.log(
        '| Ruolo User | N° utenti | CCNL attuale (distribuzione) | CCNL atteso (CCNL Turismo) | OK? |'
      )
      console.log(
        '|------------|-----------|------------------------------|----------------------------|-----|'
      )
    }

    const currentStr = [...row.currentLevels.entries()]
      .map(([lvl, n]) => `${lvl ?? 'null'}×${n}`)
      .join(', ')
    const ok = row.mismatches === 0 ? '✅' : `⚠️ ${row.mismatches}`
    if (row.mismatches > 0) totalMismatch += row.mismatches

    console.log(
      `| ${row.role} | ${row.count} | ${currentStr} | ${row.expected ?? 'null (admin)'} | ${ok} |`
    )
    for (const ex of row.examples) {
      console.log(`| | | _es: ${ex}_ | | |`)
    }
  }

  // Ruoli distinti nel DB
  const distinctRoles = [...new Set(users.map((u) => String(u.role)))].sort()
  console.log('\n---\n')
  console.log('### Tutti i ruoli UserRole presenti (utenti attivi)\n')
  for (const r of distinctRoles) {
    const n = users.filter((u) => String(u.role) === r).length
    const exp = inferCcnlFromRole(r)
    console.log(`- **${r}** (${n} utenti) — inferenza generica ruolo: \`${exp}\``)
  }

  // Reference table RESTAURANT_ROLES
  console.log('\n### Mappatura di riferimento (RESTAURANT_ROLES nel codice)\n')
  const { RESTAURANT_ROLES } = await import('../src/lib/restaurant-roles')
  const byRefDept = new Map<string, typeof RESTAURANT_ROLES>()
  for (const opt of RESTAURANT_ROLES) {
    const list = byRefDept.get(opt.department) ?? []
    list.push(opt)
    byRefDept.set(opt.department, list)
  }
  for (const [dept, opts] of [...byRefDept.entries()].sort()) {
    console.log(`\n**${deptLabels[dept] ?? dept}**`)
    for (const o of opts) {
      console.log(`- ${o.label} (\`${o.value}\`) → **${o.suggestedCcnl}**`)
    }
  }

  console.log(`\n📊 Totale utenti attivi con CCNL diverso dall'atteso: **${totalMismatch}** / ${users.length}\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
