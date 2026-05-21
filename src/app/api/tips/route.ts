import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  buildTipEntryPayloads,
  recalculateDistributionsForDay,
  resolveEmployeeForUser,
} from '@/lib/tips'
import { getTipsQuerySchema, postTipsBodySchema } from '@/lib/validations/tips'
import {
  assertRestaurantAccess,
  ensureRestaurantLocations,
  MANAGER_ROLES,
} from '@/lib/restaurantLocations'

/** GET /api/tips?restaurantId= — location del ristorante */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getTipsQuerySchema.safeParse({
      restaurantId: searchParams.get('restaurantId') ?? undefined,
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
      return NextResponse.json(
        {
          error:
            'Ristorante non configurato per il tuo account. Contatta l\'amministratore.',
        },
        { status: 400 }
      )
    }

    const role = String(dbUser?.role ?? '')
    const canReadLocations =
      MANAGER_ROLES.has(role) ||
      (await assertRestaurantAccess(prisma, session.user.id, restaurantId))

    if (!canReadLocations) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const locations = await ensureRestaurantLocations(prisma, restaurantId)

    return NextResponse.json({ restaurantId, locations })
  } catch (error) {
    console.error('GET /api/tips error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/tips — salva TipEntry e ricalcola TipDistributionV2 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postTipsBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { locationId, date, amounts, notes } = parsed.data

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, role: true },
    })

    const restaurantId = parsed.data.restaurantId ?? dbUser?.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId richiesto' }, { status: 400 })
    }

    if (!(await assertRestaurantAccess(prisma, session.user.id, restaurantId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const canInsert = MANAGER_ROLES.has(String(dbUser?.role))
    if (!canInsert) {
      const employee = await resolveEmployeeForUser(prisma, session.user.id, restaurantId)
      if (!employee?.canInsertTips) {
        return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
      }
    }

    const location = await prisma.restaurantLocation.findFirst({
      where: { id: locationId, restaurantId },
    })
    if (!location) {
      return NextResponse.json({ error: 'Location non trovata' }, { status: 404 })
    }

    const creatorEmployee = await resolveEmployeeForUser(
      prisma,
      session.user.id,
      restaurantId
    )
    if (!creatorEmployee) {
      return NextResponse.json(
        {
          error:
            'Nessun profilo dipendente collegato al tuo account. Contatta il manager.',
        },
        { status: 400 }
      )
    }

    const payloads = buildTipEntryPayloads(
      restaurantId,
      locationId,
      location.name,
      date,
      amounts,
      creatorEmployee.id,
      notes
    )

    if (payloads.length === 0) {
      return NextResponse.json(
        { error: 'Inserisci almeno un importo maggiore di zero' },
        { status: 400 }
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const entries = await Promise.all(
        payloads.map((data) => tx.tipEntry.create({ data }))
      )
      return entries
    })

    const distributionResult = await recalculateDistributionsForDay(
      prisma,
      restaurantId,
      date
    )

    return NextResponse.json({
      success: true,
      entries: created.map((e) => ({
        id: e.id,
        type: e.type,
        amount: Number(e.amount),
        location: e.location,
        date,
      })),
      totals: distributionResult.totals,
      distributions: distributionResult.distributions,
      warning: distributionResult.warning,
    })
  } catch (error) {
    console.error('POST /api/tips error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
