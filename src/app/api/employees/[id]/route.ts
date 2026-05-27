import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import type { CCNLLevel, Prisma } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  hierarchyLevelForUserRole,
  toEmployeeRole,
  toUserRole,
} from '@/lib/employee-create'
import { isManagerRole } from '@/lib/roles'
import { normalizeDepartmentInput } from '@/lib/restaurant-roles'

const patchTipsSchema = z
  .object({
    score: z.number().int().min(1).max(10).optional(),
    canInsertTips: z.boolean().optional(),
    canEditTips: z.boolean().optional(),
    canDeleteTips: z.boolean().optional(),
  })
  .strict()

const patchProfileSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  department: z
    .enum(['cucina', 'pasticceria', 'sala', 'beverage', 'accoglienza', 'dirigenti'])
    .optional(),
  ccnlLevel: z.string().optional(),
  locationId: z.string().nullable().optional(),
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
  locationId: string | null = null
) {
  return {
    id: user.id,
    name: user.name,
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
    locationId,
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

    // Separate query for Employee.locationId to avoid stale-client issues
    const empRecord = await prisma.employee.findFirst({
      where: { userId: id },
      select: { locationId: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      employee: serializeUserEmployee(user, empRecord?.locationId ?? null),
    })
  } catch (error) {
    console.error('GET /api/employees/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** PATCH /api/employees/[id] — profilo User o permessi mance Employee */
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

    const profileParsed = patchProfileSchema.safeParse(body)
    if (profileParsed.success) {
      const data = profileParsed.data
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, restaurantId: true },
      })
      if (!user) {
        return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 })
      }
      if (!(await canManageRestaurant(session.user.id, user.restaurantId))) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
      }

      const role = data.role ? toUserRole(data.role) : undefined
      const department = data.department
        ? normalizeDepartmentInput(data.department)
        : undefined
      const ccnlLevel = data.ccnlLevel as CCNLLevel | undefined

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id },
          data: {
            ...(data.name ? { name: data.name.trim() } : {}),
            ...(role ? { role, hierarchyLevel: hierarchyLevelForUserRole(role) } : {}),
            ...(department ? { department } : {}),
            ...(ccnlLevel ? { ccnlLevel } : {}),
          },
          select: {
            id: true,
            name: true,
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
              ...(role && department
                ? { role: toEmployeeRole(role, department) }
                : {}),
              ...(ccnlLevel ? { ccnlLevel } : {}),
              ...('locationId' in data ? { locationId: data.locationId ?? null } : {}),
              updatedAt: new Date(),
            },
          })
        }

        return u
      })

      const updatedEmp = await prisma.employee.findFirst({
        where: { userId: id },
        select: { locationId: true },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        success: true,
        employee: serializeUserEmployee(updated, updatedEmp?.locationId ?? null),
      })
    }

    const tipsParsed = patchTipsSchema.safeParse(body)
    if (!tipsParsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: tipsParsed.error.flatten() },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, name: true, restaurantId: true, score: true },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 })
    }

    if (!(await canManageRestaurant(session.user.id, employee.restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const tipData: Prisma.EmployeeUpdateInput = { updatedAt: new Date() }
    if (tipsParsed.data.score !== undefined) tipData.score = tipsParsed.data.score
    if (tipsParsed.data.canInsertTips !== undefined) {
      tipData.canInsertTips = tipsParsed.data.canInsertTips
    }
    if (tipsParsed.data.canEditTips !== undefined) {
      tipData.canEditTips = tipsParsed.data.canEditTips
    }
    if (tipsParsed.data.canDeleteTips !== undefined) {
      tipData.canDeleteTips = tipsParsed.data.canDeleteTips
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: tipData,
      select: {
        id: true,
        name: true,
        score: true,
        canInsertTips: true,
        canEditTips: true,
        canDeleteTips: true,
      },
    })

    return NextResponse.json({ success: true, employee: updated })
  } catch (error) {
    console.error('PATCH /api/employees/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
