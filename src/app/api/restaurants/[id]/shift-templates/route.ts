import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { assertRestaurantAccess } from '@/lib/restaurant-access'
import { ShiftTemplateType } from '@prisma/client'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(60),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  type: z.nativeEnum(ShiftTemplateType).default('ALTRO'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F97316'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

/** GET /api/restaurants/[id]/shift-templates?active=true|false */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: restaurantId } = await params
    if (!(await assertRestaurantAccess(session.user.id, restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const activeOnly = new URL(request.url).searchParams.get('active')
    const where = activeOnly === 'true' ? { restaurantId, isActive: true } : { restaurantId }

    const templates = await prisma.shiftTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        type: true,
        color: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ templates })
  } catch (err) {
    console.error('GET /shift-templates error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/restaurants/[id]/shift-templates */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: restaurantId } = await params
    if (!(await assertRestaurantAccess(session.user.id, restaurantId, true))) {
      return NextResponse.json({ error: 'Permesso negato — solo i manager' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, startTime, endTime, type, color, isActive, sortOrder } = parsed.data
    const template = await prisma.shiftTemplate.create({
      data: { restaurantId, name, startTime, endTime, type, color, isActive, sortOrder },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    console.error('POST /shift-templates error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
