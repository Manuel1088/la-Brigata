import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { dateFromIso } from '@/lib/shifts'
import { resolveRestaurantAccess } from '@/lib/restaurant-access'
import { isManagerRole } from '@/lib/roles'
import {
  findShiftByUserDateAndTime,
  serializeShiftSwapRequest,
} from '@/lib/shift-swaps'
import {
  getShiftSwapQuerySchema,
  postShiftSwapBodySchema,
} from '@/lib/validations/shift-swap'

const swapInclude = {
  requester: { select: { id: true, name: true, department: true } },
  target: { select: { id: true, name: true, department: true } },
} as const

/** POST /api/shifts/swap — crea richiesta cambio turno */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postShiftSwapBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      restaurantId,
      targetUserId,
      targetDate,
      targetShiftTime,
      offeredShiftTime,
      notes,
    } = parsed.data
    const requesterDate = parsed.data.requesterDate ?? targetDate

    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: 'Non puoi richiedere uno scambio con te stesso' },
        { status: 400 }
      )
    }

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const targetShift = await findShiftByUserDateAndTime(
      prisma,
      restaurantId,
      targetUserId,
      targetDate,
      targetShiftTime
    )
    if (!targetShift) {
      return NextResponse.json(
        { error: 'Turno del collega non trovato per la data indicata' },
        { status: 404 }
      )
    }

    const requesterShift = await findShiftByUserDateAndTime(
      prisma,
      restaurantId,
      session.user.id,
      requesterDate,
      offeredShiftTime
    )
    if (!requesterShift) {
      return NextResponse.json(
        { error: 'Il tuo turno offerto non è stato trovato per la data indicata' },
        { status: 404 }
      )
    }

    const existing = await prisma.shiftSwapRequest.findFirst({
      where: {
        restaurantId,
        status: 'PENDING',
        OR: [
          { requesterShiftId: requesterShift.id },
          { targetShiftId: targetShift.id },
          { requesterShiftId: targetShift.id },
          { targetShiftId: requesterShift.id },
        ],
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Esiste già una richiesta di cambio in sospeso per questi turni' },
        { status: 409 }
      )
    }

    const created = await prisma.shiftSwapRequest.create({
      data: {
        restaurantId,
        requesterUserId: session.user.id,
        targetUserId,
        requesterShiftId: requesterShift.id,
        targetShiftId: targetShift.id,
        requesterDate: dateFromIso(requesterDate),
        targetDate: dateFromIso(targetDate),
        status: 'PENDING',
        notes: notes ?? null,
      },
      include: swapInclude,
    })

    const swap = await serializeShiftSwapRequest(created)

    return NextResponse.json({ success: true, swap }, { status: 201 })
  } catch (error) {
    console.error('POST /api/shifts/swap error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** GET /api/shifts/swap — lista richieste per ristorante */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getShiftSwapQuerySchema.safeParse({
      restaurantId: searchParams.get('restaurantId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, role: true },
    })

    const restaurantId = parsed.data.restaurantId ?? dbUser?.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId richiesto' }, { status: 400 })
    }

    const access = await resolveRestaurantAccess(session.user.id, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const isManager = isManagerRole(access.user?.role)

    const where: {
      restaurantId: string
      status?: string
      OR?: Array<{ requesterUserId: string } | { targetUserId: string }>
    } = { restaurantId }

    if (parsed.data.status) {
      where.status = parsed.data.status
    }

    if (!isManager) {
      where.OR = [
        { requesterUserId: session.user.id },
        { targetUserId: session.user.id },
      ]
    }

    const rows = await prisma.shiftSwapRequest.findMany({
      where,
      include: swapInclude,
      orderBy: { createdAt: 'desc' },
    })

    const swaps = await Promise.all(rows.map((r) => serializeShiftSwapRequest(r)))

    return NextResponse.json({
      swaps,
      meta: { count: swaps.length },
    })
  } catch (error) {
    console.error('GET /api/shifts/swap error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
