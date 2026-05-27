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
    case 'closure':
      return '🔒'
    case 'holiday':
      return '🎉'
    case 'team_building':
      return '👥'
    default:
      return '⭐'
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const restaurantId = session?.user?.restaurantId
  if (!session?.user?.id || !restaurantId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const rows = await prisma.restaurantEvent.findMany({
    where: { restaurantId },
    orderBy: { date: 'asc' },
  })

  const events = rows.map((e) => {
    const uiType = EVENT_TYPE_TO_UI[e.eventType] ?? 'special'
    return {
      id: e.id,
      name: e.name,
      date: e.date.toISOString().slice(0, 10),
      type: uiType,
      description: e.description ?? undefined,
      icon: eventIcon(uiType),
      expectedGuests: e.expectedGuests,
      splitTipsByMeal: e.splitTipsByMeal,
    }
  })

  return NextResponse.json({ success: true, events })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const role = String(session.user.role ?? '')
  const ccnlLevel = session.user.ccnlLevel ?? null
  if (!hasPermission(role, 'manage_company_settings', ccnlLevel)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const restaurantId = session.user.restaurantId
  if (!restaurantId) {
    return NextResponse.json({ error: 'Ristorante non associato' }, { status: 400 })
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

  const name = body.name?.trim()
  const dateStr = body.date?.trim()
  if (!name || !dateStr) {
    return NextResponse.json({ error: 'Nome e data obbligatori' }, { status: 400 })
  }

  const uiType = body.type ?? 'special'
  const eventType = UI_TO_EVENT_TYPE[uiType] ?? EventType.EVENTO_SPECIALE
  const date = new Date(`${dateStr}T12:00:00.000Z`)
  const splitTipsByMeal = uiType === 'holiday' ? (body.splitTipsByMeal ?? false) : false

  const created = await prisma.restaurantEvent.create({
    data: {
      restaurantId,
      name,
      description: body.description?.trim() || null,
      date,
      expectedGuests: typeof body.expectedGuests === 'number' ? body.expectedGuests : 0,
      eventType,
      splitTipsByMeal,
    },
  })

  return NextResponse.json({
    success: true,
    event: {
      id: created.id,
      name: created.name,
      date: created.date.toISOString().slice(0, 10),
      type: uiType,
      description: created.description ?? undefined,
      icon: eventIcon(uiType),
      splitTipsByMeal: created.splitTipsByMeal,
    },
  })
}
