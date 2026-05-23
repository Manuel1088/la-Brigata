/**
 * Imposta admin@labrigata.it come gestore piattaforma (nessun ristorante).
 * Esegui: npx tsx scripts/fix-platform-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import {
  canAccessPermissionManagementPage,
  isSuperAdmin,
  type PermissionActor,
} from '../src/lib/category-permissions'

const prisma = new PrismaClient()
const ADMIN_EMAIL = 'admin@labrigata.it'

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: ADMIN_EMAIL, mode: 'insensitive' } },
  })

  if (!user) {
    console.error(`❌ Utente ${ADMIN_EMAIL} non trovato`)
    process.exit(1)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'ADMIN',
      hierarchyLevel: 11,
      ccnlLevel: null,
      restaurantId: null,
      companyId: null,
      informalCompanyId: null,
      department: null,
      userType: 'EMPLOYEE',
    },
    select: {
      id: true,
      email: true,
      role: true,
      hierarchyLevel: true,
      ccnlLevel: true,
      restaurantId: true,
      companyId: true,
    },
  })

  console.log('✅ Admin piattaforma aggiornato:')
  console.log(JSON.stringify(updated, null, 2))

  const actor: PermissionActor = {
    id: updated.id,
    role: String(updated.role),
    level: updated.hierarchyLevel,
    ccnlLevel: updated.ccnlLevel,
    restaurantId: updated.restaurantId,
  }

  console.log('\n🔍 Verifica isSuperAdmin:', isSuperAdmin(actor))
  console.log(
    '🔍 Verifica canAccessPermissionManagementPage:',
    canAccessPermissionManagementPage(actor)
  )

  if (!isSuperAdmin(actor)) {
    console.error('❌ isSuperAdmin() non riconosce l\'admin — controllare role e hierarchyLevel')
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
