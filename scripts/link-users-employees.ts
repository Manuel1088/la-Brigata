/**
 * Collega Employee.userId → User.id per i record esistenti.
 *
 * Esegui: npx tsx scripts/link-users-employees.ts
 * Poi:    npx prisma db push  (se non hai ancora applicato lo schema con user_id)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null
  return email.trim().toLowerCase()
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, email: true, restaurantId: true, userId: true },
    orderBy: { name: 'asc' },
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, restaurantId: true },
  })

  let linked = 0
  let alreadyLinked = 0
  let noMatch = 0
  let skippedConflict = 0
  const unmatched: string[] = []
  const conflicts: string[] = []

  for (const emp of employees) {
    if (emp.userId) {
      alreadyLinked++
      continue
    }

    const emailNorm = normalizeEmail(emp.email)

    let user =
      users.find(
        (u) => u.restaurantId === emp.restaurantId && namesMatch(u.name, emp.name)
      ) ?? null

    if (!user && emailNorm) {
      user =
        users.find(
          (u) =>
            u.restaurantId === emp.restaurantId &&
            normalizeEmail(u.email) === emailNorm
        ) ?? null
    }

    if (!user) {
      user = users.find((u) => namesMatch(u.name, emp.name)) ?? null
    }

    if (!user && emailNorm) {
      user = users.find((u) => normalizeEmail(u.email) === emailNorm) ?? null
    }

    if (!user) {
      noMatch++
      unmatched.push(`${emp.name} (${emp.id})`)
      continue
    }

    const taken = await prisma.employee.findFirst({
      where: {
        userId: user.id,
        id: { not: emp.id },
      },
      select: { id: true, name: true },
    })

    if (taken) {
      skippedConflict++
      conflicts.push(
        `Employee "${emp.name}" → User "${user.name}" (${user.id}) già usato da "${taken.name}"`
      )
      continue
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { userId: user.id, updatedAt: new Date() },
    })
    linked++
    console.log(`✓ ${emp.name} → User ${user.name} (${user.id})`)
  }

  console.log('\n--- Riepilogo ---')
  console.log({ linked, alreadyLinked, noMatch, skippedConflict })
  if (unmatched.length > 0) {
    console.log('\nSenza match User:')
    unmatched.forEach((line) => console.log(`  - ${line}`))
  }
  if (conflicts.length > 0) {
    console.log('\nConflitti (userId già assegnato):')
    conflicts.forEach((line) => console.log(`  - ${line}`))
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
