import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { CCNLLevel } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  hierarchyLevelForUserRole,
  toEmployeeRole,
  toUserRole,
} from '@/lib/employee-create'
import { isManagerRole } from '@/lib/roles'
import { normalizeDepartmentInput } from '@/lib/restaurant-roles'

/**
 * Mappa i valori CCNL semplificati usati dalla UI ('QA','QB','1'…'7','6S')
 * o valori già in formato enum verso l'enum Prisma CCNLLevel.
 */
const CCNL_SIMPLE_TO_ENUM: Record<string, CCNLLevel> = {
  QA: CCNLLevel.QA,
  QB: CCNLLevel.QB,
  '1': CCNLLevel.LIVELLO_1,
  '2': CCNLLevel.LIVELLO_2,
  '3': CCNLLevel.LIVELLO_3,
  '4': CCNLLevel.LIVELLO_4,
  '5': CCNLLevel.LIVELLO_5,
  '6S': CCNLLevel.LIVELLO_6S,
  '6': CCNLLevel.LIVELLO_6,
  '7': CCNLLevel.LIVELLO_7,
}

/**
 * Risolve un valore CCNL in ingresso:
 *  - stringa vuota → null (azzera il livello)
 *  - valore semplificato o già-enum valido → CCNLLevel
 *  - altrimenti → 'INVALID'
 */
function resolveCcnlLevel(raw: string): CCNLLevel | null | 'INVALID' {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const upper = trimmed.toUpperCase()
  const mapped = CCNL_SIMPLE_TO_ENUM[upper] ?? upper
  return (Object.values(CCNLLevel) as string[]).includes(mapped)
    ? (mapped as CCNLLevel)
    : 'INVALID'
}

const patchEmployeeSchema = z
  .object({
    score: z.number().int().min(1).max(10).optional(),
    canInsertTips: z.boolean().optional(),
    canEditTips: z.boolean().optional(),
    canDeleteTips: z.boolean().optional(),
    restDays: z.array(z.string()).optional(),
    ccnlLevel: z.string().optional(),
  })
  .strict()

const patchProfileSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  role: z.string().optional(),
  department: z
    .enum(['cucina', 'pasticceria', 'sala', 'beverage', 'accoglienza', 'dirigenti'])
    .optional(),
  ccnlLevel: z.string().optional(),
  restDays: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
})

async function canManageRestaurant(
  userId: string,
  restaurantId: string | null
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true, hierarchyLevel: true },
  })
  if (!user) return false
  if (String(user.role) === 'ADMIN') return true
  if (!restaurantId) return false
  if (user.restaurantId === restaurantId) return isManagerRole(user.role)

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })
  return !!(
    restaurant?.companyId &&
    user.companyId === restaurant.companyId &&
    isManagerRole(user.role)
  )
}

function serializeUserEmployee(
  user: {
    id: string
    name: string
    firstName?: string | null
    lastName?: string | null
    email: string
    phone: string | null
    role: string
    department: string | null
    hierarchyLevel: number
    ccnlLevel: string | null
    restaurantId: string | null
    avatar: string | null
    startDate: Date | null
    contractType: string | null
    notes: string | null
    skills: { skill: string }[]
  },
  locationIds: string[] = []
) {
  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role,
    department: user.department ?? 'sala',
    level: user.hierarchyLevel,
    ccnlLevel: user.ccnlLevel,
    isActive: true,
    avatar: user.avatar || '👤',
    contractType: user.contractType ?? 'full-time',
    startDate: user.startDate?.toISOString().split('T')[0] ?? '',
    notes: user.notes,
    skills: user.skills.map((s) => s.skill),
    locationIds,
    restaurantId: user.restaurantId,
  }
}

/** GET /api/employees/[id] — profilo dipendente (User) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        hierarchyLevel: true,
        ccnlLevel: true,
        restaurantId: true,
        avatar: true,
        startDate: true,
        contractType: true,
        notes: true,
        skills: { select: { skill: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 })
    }

    if (!(await canManageRestaurant(session.user.id, user.restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const empRecord = await prisma.employee.findFirst({
      where: { userId: id },
      select: { employeeLocations: { select: { locationId: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const locationIds = empRecord?.employeeLocations.map((el) => el.locationId) ?? []

    return NextResponse.json({
      employee: serializeUserEmployee(user, locationIds),
    })
  } catch (error) {
    console.error('GET /api/employees/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/employees/[id]
 * - Se [id] è un User → ramo PROFILO (anagrafica + CCNL + riposi su Employee collegato).
 * - Se [id] è un Employee → ramo MANCE (score/permessi + riposi + CCNL su Employee e User collegato).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const userRow = await prisma.user.findUnique({
      where: { id },
      select: { id: true, restaurantId: true },
    })

    // ── RAMO PROFILO (id = User) ───────────────────────────────────────────
    if (userRow) {
      const profileParsed = patchProfileSchema.safeParse(body)
      if (!profileParsed.success) {
        return NextResponse.json(
          { error: 'Body non valido', details: profileParsed.error.flatten() },
          { status: 400 }
        )
      }
      const data = profileParsed.data

      if (!(await canManageRestaurant(session.user.id, userRow.restaurantId))) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
      }

      const role = data.role ? toUserRole(data.role) : undefined
      const department = data.department
        ? normalizeDepartmentInput(data.department)
        : undefined

      let ccnlLevel: CCNLLevel | null | undefined = undefined
      if (data.ccnlLevel !== undefined) {
        const resolved = resolveCcnlLevel(data.ccnlLevel)
        if (resolved === 'INVALID') {
          return NextResponse.json({ error: 'Livello CCNL non valido' }, { status: 400 })
        }
        ccnlLevel = resolved
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id },
          data: {
            ...(data.name ? { name: data.name.trim() } : {}),
            ...(data.firstName !== undefined ? { firstName: data.firstName?.trim() || null } : {}),
            ...(data.lastName !== undefined ? { lastName: data.lastName?.trim() || null } : {}),
            ...(role ? { role, hierarchyLevel: hierarchyLevelForUserRole(role) } : {}),
            ...(department ? { department } : {}),
            ...(ccnlLevel !== undefined ? { ccnlLevel } : {}),
          },
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            department: true,
            hierarchyLevel: true,
            ccnlLevel: true,
            restaurantId: true,
            avatar: true,
            startDate: true,
            contractType: true,
            notes: true,
            skills: { select: { skill: true } },
          },
        })

        const linked = await tx.employee.findFirst({ where: { userId: id } })
        if (linked) {
          await tx.employee.update({
            where: { id: linked.id },
            data: {
              ...(data.name ? { name: data.name.trim() } : {}),
              ...(role && department ? { role: toEmployeeRole(role, department) } : {}),
              ...(ccnlLevel !== undefined ? { ccnlLevel } : {}),
              ...(data.restDays !== undefined ? { restDays: data.restDays } : {}),
              updatedAt: new Date(),
            },
          })
          if (data.locationIds !== undefined) {
            await tx.employeeLocation.deleteMany({ where: { employeeId: linked.id } })
            if (data.locationIds.length > 0) {
              await tx.employeeLocation.createMany({
                data: data.locationIds.map((locId: string) => ({
                  id: `${linked.id.slice(-8)}-${locId.slice(-8)}-${Math.random().toString(36).slice(2, 6)}`,
                  employeeId: linked.id,
                  locationId: locId,
                })),
                skipDuplicates: true,
              })
            }
          }
        }

        return u
      })

      const updatedEmp = await prisma.employee.findFirst({
        where: { userId: id },
        select: { employeeLocations: { select: { locationId: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const updatedLocationIds = updatedEmp?.employeeLocations.map((el) => el.locationId) ?? []

      return NextResponse.json({
        success: true,
        employee: serializeUserEmployee(updated, updatedLocationIds),
      })
    }

    // ── RAMO MANCE (id = Employee) ─────────────────────────────────────────
    const empParsed = patchEmployeeSchema.safeParse(body)
    if (!empParsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: empParsed.error.flatten() },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, name: true, restaurantId: true, score: true, userId: true },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 })
    }

    if (!(await canManageRestaurant(session.user.id, employee.restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    let ccnlLevel: CCNLLevel | null | undefined = undefined
    if (empParsed.data.ccnlLevel !== undefined) {
      const resolved = resolveCcnlLevel(empParsed.data.ccnlLevel)
      if (resolved === 'INVALID') {
        return NextResponse.json({ error: 'Livello CCNL non valido' }, { status: 400 })
      }
      ccnlLevel = resolved
    }

    const empData: Prisma.EmployeeUpdateInput = { updatedAt: new Date() }
    if (empParsed.data.score !== undefined) empData.score = empParsed.data.score
    if (empParsed.data.canInsertTips !== undefined) empData.canInsertTips = empParsed.data.canInsertTips
    if (empParsed.data.canEditTips !== undefined) empData.canEditTips = empParsed.data.canEditTips
    if (empParsed.data.canDeleteTips !== undefined) empData.canDeleteTips = empParsed.data.canDeleteTips
    if (empParsed.data.restDays !== undefined) empData.restDays = empParsed.data.restDays
    if (ccnlLevel !== undefined) empData.ccnlLevel = ccnlLevel

    const updated = await prisma.$transaction(async (tx) => {
      const e = await tx.employee.update({
        where: { id },
        data: empData,
        select: {
          id: true,
          name: true,
          score: true,
          restDays: true,
          ccnlLevel: true,
          canInsertTips: true,
          canEditTips: true,
          canDeleteTips: true,
        },
      })
      // Sincronizza il CCNL anche sull'utente collegato
      if (ccnlLevel !== undefined && employee.userId) {
        await tx.user.update({
          where: { id: employee.userId },
          data: { ccnlLevel },
        })
      }
      return e
    })

    return NextResponse.json({ success: true, employee: updated })
  } catch (error) {
    console.error('PATCH /api/employees/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
