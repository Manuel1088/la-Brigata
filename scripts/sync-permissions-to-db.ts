/**
 * Allinea la tabella permissions (Supabase/Postgres) con src/lib/permissions.ts
 * Esegui: npx tsx scripts/sync-permissions-to-db.ts
 */
import { PrismaClient } from '@prisma/client'
import { ensureCategoryPermissionsExist } from '../src/lib/user-permissions-db'
import { PERMISSIONS } from '../src/lib/permissions'

const prisma = new PrismaClient()

async function main() {
  const entries = Object.values(PERMISSIONS)
  let created = 0
  let updated = 0

  for (const p of entries) {
    const existing = await prisma.permission.findUnique({ where: { name: p.id } })
    if (existing) {
      await prisma.permission.update({
        where: { name: p.id },
        data: {
          description: p.description,
          category: p.category,
        },
      })
      updated++
    } else {
      await prisma.permission.create({
        data: {
          name: p.id,
          description: p.description,
          category: p.category,
        },
      })
      created++
    }
  }

  await ensureCategoryPermissionsExist()
  console.log('✅ Permessi categoria (user_permissions) assicurati nel DB')

  console.log(`✅ Permessi sincronizzati: ${created} creati, ${updated} aggiornati (${entries.length} totali)`)
  const gestione = await prisma.permission.findUnique({ where: { name: 'gestione_turni' } })
  console.log(gestione ? '✅ gestione_turni presente nel DB' : '❌ gestione_turni mancante')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
