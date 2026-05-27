import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { assertRestaurantAccess } from '@/lib/restaurant-access'
import { ShiftTemplateType } from '@prisma/client'
import { z } from 'zod'
import type { Session } from 'next-auth'

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: z.nativeEnum(ShiftTemplateType).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

type RouteParams = { params: Promise<{ id: string; templateId: string }> }

async function authorise(session: Session | null, restaurantId: string) {
  if (!session?.user?.id) return 401
  const ok = await assertRestaurantAccess(session.user.id, restaurantId, true)
  return ok ? 200 : 403
}

/** PATCH /api/restaurants/[id]/shift-templates/[templateId] */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id: restaurantId, templateId } = await params
    const status = await authorise(session, restaurantId)
    if (status !== 200) {
      return NextResponse.json({ error: status === 401 ? 'Non autorizzato' : 'Permesso negato' }, { status })
    }

    // Verifica che il template appartenga a questo ristorante
    const existing = await prisma.shiftTemplate.findFirst({
      where: { id: templateId, restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.shiftTemplate.update({
      where: { id: templateId },
      data: parsed.data,
    })

    return NextResponse.json({ template: updated })
  } catch (err) {
    console.error('PATCH /shift-templates/[templateId] error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/restaurants/[id]/shift-templates/[templateId] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id: restaurantId, templateId } = await params
    const status = await authorise(session, restaurantId)
    if (status !== 200) {
      return NextResponse.json({ error: status === 401 ? 'Non autorizzato' : 'Permesso negato' }, { status })
    }

    const existing = await prisma.shiftTemplate.findFirst({
      where: { id: templateId, restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })
    }

    await prisma.shiftTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /shift-templates/[templateId] error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
