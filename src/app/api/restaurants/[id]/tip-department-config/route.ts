import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import {
  requireManageCompanySession,
  requireRestaurantManageAccess,
} from '@/lib/restaurant-location-api'

const DEPARTMENTS = ['cucina', 'sala', 'beverage'] as const
type Department = (typeof DEPARTMENTS)[number]

const putSchema = z.object({
  departmentPoints: z.object({
    cucina: z.number().int().min(1).max(100),
    sala: z.number().int().min(1).max(100),
    beverage: z.number().int().min(1).max(100),
  }),
  departmentChecks: z.object({
    cucina: z.boolean(),
    sala: z.boolean(),
    beverage: z.boolean(),
  }),
})

function defaults() {
  return {
    departmentPoints: { cucina: 5, sala: 5, beverage: 5 } as Record<Department, number>,
    departmentChecks: { cucina: false, sala: false, beverage: false } as Record<Department, boolean>,
  }
}

// GET /api/restaurants/[id]/tip-department-config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params
    if (!restaurantId) {
      return NextResponse.json({ error: 'ID ristorante richiesto' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      const auth = await requireManageCompanySession()
      if (!auth.ok) return auth.response
      const allowed = await requireRestaurantManageAccess(auth.session.user!.id!, restaurantId)
      if (!allowed) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
      }
    }

    const rows = await prisma.tipDepartmentConfig.findMany({ where: { restaurantId } })
    const result = defaults()
    for (const row of rows) {
      if ((DEPARTMENTS as readonly string[]).includes(row.department)) {
        const dept = row.department as Department
        result.departmentPoints[dept] = row.points
        result.departmentChecks[dept] = row.useDepartmentScore
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('GET /api/restaurants/[id]/tip-department-config error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT /api/restaurants/[id]/tip-department-config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManageCompanySession()
    if (!auth.ok) return auth.response

    const { id: restaurantId } = await params
    if (!restaurantId) {
      return NextResponse.json({ error: 'ID ristorante richiesto' }, { status: 400 })
    }

    const allowed = await requireRestaurantManageAccess(auth.session.user!.id!, restaurantId)
    if (!allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { departmentPoints, departmentChecks } = parsed.data

    await prisma.$transaction(
      DEPARTMENTS.map((dept) =>
        prisma.tipDepartmentConfig.upsert({
          where: { restaurantId_department: { restaurantId, department: dept } },
          update: {
            points: departmentPoints[dept],
            useDepartmentScore: departmentChecks[dept],
          },
          create: {
            restaurantId,
            department: dept,
            points: departmentPoints[dept],
            useDepartmentScore: departmentChecks[dept],
          },
        })
      )
    )

    return NextResponse.json({ success: true, departmentPoints, departmentChecks })
  } catch (error) {
    console.error('PUT /api/restaurants/[id]/tip-department-config error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
