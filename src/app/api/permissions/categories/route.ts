import { NextResponse } from 'next/server'
import { CCNLLevel, Prisma, PrismaClient } from '@prisma/client'
import { CCNLLevel as CcnlLevelConst } from '@/lib/ccnl'
import { inferCcnlFromRole } from '@/lib/ccnl-infer'
import {
  canGrantCategoryToTarget,
  canManageTargetUser,
  compareUsersForPermissionTable,
  groupForCcnl,
  GROUP_LABELS,
  isSuperAdmin,
  PERMISSION_CATEGORIES,
  type PermissionCategory,
} from '@/lib/category-permissions'
import { normalizeCcnlLevel } from '@/lib/permissions'
import { getPermissionActorFromSession } from '@/lib/permission-api-auth'
import {
  loadCategoryGrantsForUsers,
  setCategoryGrant,
} from '@/lib/user-permissions-db'

const prisma = new PrismaClient()

const LISTABLE_CCNL: CCNLLevel[] = [
  CCNLLevel.QA,
  CCNLLevel.QB,
  CCNLLevel.LIVELLO_1,
  CCNLLevel.LIVELLO_2,
  CCNLLevel.LIVELLO_3,
  CCNLLevel.LIVELLO_4,
]

const LISTABLE_CCNL_SET = new Set<string>(LISTABLE_CCNL)

function effectiveCcnlLevel(
  ccnlLevel: string | null,
  role: string
): string {
  if (ccnlLevel) return String(ccnlLevel)
  return inferCcnlFromRole(role)
}

function isListableCcnl(ccnlLevel: string | null, role: string): boolean {
  const effective = effectiveCcnlLevel(ccnlLevel, role)
  const normalized = normalizeCcnlLevel(effective)
  return normalized != null && LISTABLE_CCNL_SET.has(normalized)
}

export async function GET() {
  const actor = await getPermissionActorFromSession()
  if (!actor) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const superAdmin = isSuperAdmin(actor)

  const where: Prisma.UserWhereInput = {
    isActive: true,
    OR: [{ ccnlLevel: { in: LISTABLE_CCNL } }, { ccnlLevel: null }],
  }

  if (!superAdmin && actor.restaurantId) {
    where.restaurantId = actor.restaurantId
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ccnlLevel: true,
      department: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  const manageable = users
    .filter((u) => isListableCcnl(u.ccnlLevel, String(u.role)))
    .filter((u) => {
      const ccnl = effectiveCcnlLevel(u.ccnlLevel, String(u.role))
      return canManageTargetUser(actor, {
        id: u.id,
        ccnlLevel: ccnl,
        department: u.department,
        restaurantId: u.restaurantId,
      })
    })

  const grantsMap = await loadCategoryGrantsForUsers(manageable.map((u) => u.id))

  const employees = manageable
    .map((u) => {
      const ccnl = effectiveCcnlLevel(u.ccnlLevel, String(u.role))
      const group = groupForCcnl(ccnl)
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        ccnlLevel: ccnl,
        department: u.department,
        restaurantName: u.restaurant?.name ?? null,
        group,
        groupLabel: group ? GROUP_LABELS[group] : null,
        grants: grantsMap[u.id] ?? {
          mance: false,
          turni: false,
          ferie: false,
          staff: false,
          report: false,
          delega: false,
        },
      }
    })
    .sort(compareUsersForPermissionTable)

  return NextResponse.json({
    employees,
    categories: PERMISSION_CATEGORIES,
    actor: {
      id: actor.id,
      canGrantDelega:
        actor.role === 'ADMIN' ||
        actor.ccnlLevel === CcnlLevelConst.QA ||
        actor.ccnlLevel === CcnlLevelConst.QB,
    },
  })
}

export async function PATCH(request: Request) {
  const actor = await getPermissionActorFromSession()
  if (!actor) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let body: { userId?: string; category?: string; granted?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { userId, category, granted } = body
  if (!userId || !category || typeof granted !== 'boolean') {
    return NextResponse.json(
      { error: 'userId, category e granted sono obbligatori' },
      { status: 400 }
    )
  }

  if (!PERMISSION_CATEGORIES.includes(category as PermissionCategory)) {
    return NextResponse.json({ error: 'Categoria non valida' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      ccnlLevel: true,
      department: true,
      restaurantId: true,
    },
  })

  if (!target) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const targetWithCcnl = {
    ...target,
    ccnlLevel: effectiveCcnlLevel(target.ccnlLevel, String(target.role)),
  }

  const check = canGrantCategoryToTarget(
    actor,
    targetWithCcnl,
    category as PermissionCategory,
    granted
  )
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 403 })
  }

  const updatedGrants = await setCategoryGrant(
    userId,
    category as PermissionCategory,
    granted,
    actor.id
  )

  return NextResponse.json({ userId, grants: updatedGrants })
}
