import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

const MANAGER_ROLES = new Set([
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'MANAGER',
  'RESTAURANT_MANAGER',
  'CASSIERE',
  'RESPONSABILE_SALA',
])

const patchEmployeeSchema = z
  .object({
    score: z.number().int().min(1).max(10).optional(),
    canInsertTips: z.boolean().optional(),
    canEditTips: z.boolean().optional(),
    canDeleteTips: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.score !== undefined ||
      data.canInsertTips !== undefined ||
      data.canEditTips !== undefined ||
      data.canDeleteTips !== undefined,
    { message: 'Almeno un campo da aggiornare è richiesto' }
  )

async function canManageRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true },
  })
  if (!user) return false
  if (String(user.role) === 'ADMIN') return true
  if (user.restaurantId === restaurantId) return MANAGER_ROLES.has(String(user.role))

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })
  return !!(
    restaurant?.companyId &&
    user.companyId === restaurant.companyId &&
    MANAGER_ROLES.has(String(user.role))
  )
}

/** PATCH /api/employees/[id] — aggiorna score e/o permessi mance (id = Employee.id) */
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
    const parsed = patchEmployeeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
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

    const data: {
      score?: number
      canInsertTips?: boolean
      canEditTips?: boolean
      canDeleteTips?: boolean
      updatedAt: Date
    } = { updatedAt: new Date() }
    if (parsed.data.score !== undefined) data.score = parsed.data.score
    if (parsed.data.canInsertTips !== undefined) data.canInsertTips = parsed.data.canInsertTips
    if (parsed.data.canEditTips !== undefined) data.canEditTips = parsed.data.canEditTips
    if (parsed.data.canDeleteTips !== undefined) data.canDeleteTips = parsed.data.canDeleteTips

    const updated = await prisma.employee.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        score: true,
        canInsertTips: true,
        canEditTips: true,
        canDeleteTips: true,
      },
    })

    return NextResponse.json({
      success: true,
      employee: updated,
    })
  } catch (error) {
    console.error('PATCH /api/employees/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
