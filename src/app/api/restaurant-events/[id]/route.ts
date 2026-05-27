import { NextRequest, NextResponse } from 'next/server'
import { EventType } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

const UI_TO_EVENT_TYPE: Record<string, EventType> = {
  closure: EventType.NORMALE,
  holiday: EventType.FESTA,
  team_building: EventType.EVENTO_SPECIALE,
  special: EventType.EVENTO_SPECIALE,
}

const EVENT_TYPE_TO_UI: Record<EventType, string> = {
  NORMALE: 'closure',
  FESTA: 'holiday',
  EVENTO_SPECIALE: 'special',
}

function eventIcon(type: string): string {
  switch (type) {
    case 'closure': return '🔒'
    case 'holiday': return '🎉'
    case 'team_building': return '👥'
    default: return '⭐'
  }
}

import type { Session } from 'next-auth'

async function authorise(session: Session | null, eventId: string) {
  const u = session?.user
  if (!u?.id) return { error: 'Non autorizzato', status: 401 }

  const role = String(u.role ?? '')
  const ccnlLevel = u.ccnlLevel != null ? String(u.ccnlLevel) : null
  const dbGranted = u.dbGrantedPermissionIds ?? []
  if (!hasPermission(role, 'manage_company_settings', ccnlLevel, dbGranted)) {
    return { error: 'Permesso negato', status: 403 }
  }

  const event = await prisma.restaurantEvent.findUnique({
    where: { id: eventId },
    select: { id: true, restaurantId: true },
  })
  if (!event) return { error: 'Evento non trovato', status: 404 }
  if (event.restaurantId !== u.restaurantId) {
    return { error: 'Accesso negato', status: 403 }
  }

  return { event }
}

/** PATCH /api/restaurant-events/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params
  const auth = await authorise(session, id)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: {
    name?: string
    date?: string
    type?: string
    description?: string
    expectedGuests?: number
    splitTipsByMeal?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const uiType = body.type
  const updateData: Parameters<typeof prisma.restaurantEvent.update>[0]['data'] = {}

  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.date !== undefined) updateData.date = new Date(`${body.date}T12:00:00.000Z`)
  if (uiType !== undefined) updateData.eventType = UI_TO_EVENT_TYPE[uiType] ?? EventType.EVENTO_SPECIALE
  if (body.description !== undefined) updateData.description = body.description.trim() || null
  if (typeof body.expectedGuests === 'number') updateData.expectedGuests = body.expectedGuests
  if (body.splitTipsByMeal !== undefined) {
    updateData.splitTipsByMeal = uiType === 'holiday' ? body.splitTipsByMeal : false
  }

  const updated = await prisma.restaurantEvent.update({
    where: { id },
    data: updateData,
  })

  const resolvedUiType = EVENT_TYPE_TO_UI[updated.eventType] ?? 'special'
  return NextResponse.json({
    success: true,
    event: {
      id: updated.id,
      name: updated.name,
      date: updated.date.toISOString().slice(0, 10),
      type: resolvedUiType,
      description: updated.description ?? undefined,
      icon: eventIcon(resolvedUiType),
      splitTipsByMeal: updated.splitTipsByMeal,
    },
  })
}

/** DELETE /api/restaurant-events/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params
  const auth = await authorise(session, id)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  await prisma.restaurantEvent.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
