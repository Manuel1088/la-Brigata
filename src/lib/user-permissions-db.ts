import {
  CATEGORY_DB_IDS,
  type CategoryGrants,
  EMPTY_CATEGORY_GRANTS,
  expandCategoryGrants,
  grantsFromPermissionNames,
  PERMISSION_CATEGORIES,
  type PermissionCategory,
} from '@/lib/category-permissions'
import { PERMISSIONS, type Permission } from '@/lib/permissions'
import { prisma } from '@/lib/db'

const CATEGORY_DB_ID_LIST = Object.values(CATEGORY_DB_IDS)

export async function ensureCategoryPermissionsExist(): Promise<void> {
  const defs: Array<{ name: string; description: string; category: string }> = [
    {
      name: 'category_mance',
      description: 'Gestione mance (bundle CCNL/override)',
      category: 'mance',
    },
    {
      name: 'category_turni',
      description: 'Gestione turni (bundle CCNL/override)',
      category: 'turni',
    },
    {
      name: 'category_ferie',
      description: 'Gestione ferie (bundle CCNL/override)',
      category: 'ferie',
    },
    {
      name: 'category_staff',
      description: 'Gestione personale (bundle CCNL/override)',
      category: 'staff',
    },
    {
      name: 'category_report',
      description: 'Report e analisi (bundle CCNL/override)',
      category: 'report',
    },
    {
      name: 'category_delega',
      description: 'Delega gestione permessi ai livelli inferiori',
      category: 'admin',
    },
    {
      name: 'perm_delega_manage',
      description: 'Accesso UI gestione permessi per reparto',
      category: 'admin',
    },
  ]

  for (const d of defs) {
    await prisma.permission.upsert({
      where: { name: d.name },
      create: d,
      update: { description: d.description, category: d.category },
    })
  }
}

export async function loadCategoryGrantsForUser(
  userId: string
): Promise<CategoryGrants> {
  const rows = await prisma.userPermission.findMany({
    where: {
      userId,
      granted: true,
      permission: { name: { in: CATEGORY_DB_ID_LIST } },
    },
    include: { permission: true },
  })
  const names = rows.map((r) => r.permission.name)
  return grantsFromPermissionNames(names)
}

export async function loadExpandedDbPermissionIds(
  userId: string
): Promise<string[]> {
  const grants = await loadCategoryGrantsForUser(userId)
  return expandCategoryGrants(grants)
}

export async function setCategoryGrant(
  userId: string,
  category: PermissionCategory,
  granted: boolean,
  grantedBy: string
): Promise<CategoryGrants> {
  await ensureCategoryPermissionsExist()
  const permissionName = CATEGORY_DB_IDS[category]
  const permission = await prisma.permission.findUnique({
    where: { name: permissionName },
  })
  if (!permission) {
    throw new Error(`Permesso ${permissionName} non trovato`)
  }

  if (granted) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      create: {
        userId,
        permissionId: permission.id,
        granted: true,
        grantedBy,
      },
      update: {
        granted: true,
        grantedBy,
        grantedAt: new Date(),
      },
    })

    if (category === 'delega') {
      const delegaManage = await prisma.permission.findUnique({
        where: { name: 'perm_delega_manage' },
      })
      if (delegaManage) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: delegaManage.id,
            },
          },
          create: {
            userId,
            permissionId: delegaManage.id,
            granted: true,
            grantedBy,
          },
          update: { granted: true, grantedBy, grantedAt: new Date() },
        })
      }
    }
  } else {
    await prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId: permission.id,
      },
    })
    if (category === 'delega') {
      const delegaManage = await prisma.permission.findUnique({
        where: { name: 'perm_delega_manage' },
      })
      if (delegaManage) {
        await prisma.userPermission.deleteMany({
          where: { userId, permissionId: delegaManage.id },
        })
      }
    }
  }

  return loadCategoryGrantsForUser(userId)
}

export async function loadCategoryGrantsForUsers(
  userIds: string[]
): Promise<Record<string, CategoryGrants>> {
  if (userIds.length === 0) return {}

  const rows = await prisma.userPermission.findMany({
    where: {
      userId: { in: userIds },
      granted: true,
      permission: { name: { in: CATEGORY_DB_ID_LIST } },
    },
    include: { permission: true },
  })

  const result: Record<string, CategoryGrants> = {}
  for (const id of userIds) {
    result[id] = { ...EMPTY_CATEGORY_GRANTS }
  }
  for (const row of rows) {
    const grants = result[row.userId] ?? { ...EMPTY_CATEGORY_GRANTS }
    for (const cat of PERMISSION_CATEGORIES) {
      if (row.permission.name === CATEGORY_DB_IDS[cat]) {
        grants[cat] = true
      }
    }
    result[row.userId] = grants
  }
  return result
}

/** Registra le definizioni categoria in PERMISSIONS (sync metadata). */
function permissionCategoryFor(cat: PermissionCategory): Permission['category'] {
  if (cat === 'delega') return 'admin'
  if (cat === 'staff') return 'personale'
  return cat
}

export function registerCategoryPermissionDefs(): void {
  for (const cat of PERMISSION_CATEGORIES) {
    const id = CATEGORY_DB_IDS[cat]
    if (!PERMISSIONS[id]) {
      PERMISSIONS[id] = {
        id,
        name: `Categoria ${cat}`,
        description: `Grant categoria ${cat} da user_permissions`,
        category: permissionCategoryFor(cat),
        level: 7,
      }
    }
  }
  if (!PERMISSIONS['perm_delega_manage']) {
    PERMISSIONS['perm_delega_manage'] = {
      id: 'perm_delega_manage',
      name: 'Gestione permessi (delega)',
      description: 'Può gestire permessi dei livelli inferiori nel reparto',
      category: 'admin',
      level: 7,
    }
  }
}

registerCategoryPermissionDefs()
