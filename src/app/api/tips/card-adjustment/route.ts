import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { applyCardAdjustmentForMonth } from '@/lib/tips'
import { assertRestaurantAccess, MANAGER_ROLES } from '@/lib/restaurantLocations'

const bodySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  grossAmount: z.coerce.number().positive('Importo lordo deve essere maggiore di zero'),
  netAmount: z.coerce.number().min(0),
})

/** POST /api/tips/card-adjustment — applica rettifica carta fine mese */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, role: true },
    })

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const restaurantId = parsed.data.restaurantId ?? dbUser?.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 400 })
    }

    // Solo manager/titolari possono applicare la rettifica
    const role = String(dbUser?.role ?? '')
    if (
      !MANAGER_ROLES.has(role) &&
      !(await assertRestaurantAccess(prisma, session.user.id, restaurantId))
    ) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const { month, year, grossAmount, netAmount } = parsed.data

    if (netAmount > grossAmount) {
      return NextResponse.json(
        { error: 'Il netto non può essere maggiore del lordo' },
        { status: 400 }
      )
    }

    const result = await applyCardAdjustmentForMonth(
      prisma,
      restaurantId,
      month,
      year,
      grossAmount,
      netAmount
    )

    return NextResponse.json({
      success: true,
      adjustment: {
        id: result.adjustmentId,
        month,
        year,
        grossAmount,
        netAmount,
        taxDifference: result.taxDifference,
      },
      updatedDays: result.updatedDays,
      updatedEmployees: result.updatedEmployeeIds.length,
      avgAmountPerPoint: result.avgAmountPerPoint,
    })
  } catch (error) {
    console.error('POST /api/tips/card-adjustment error:', error)
    const message = error instanceof Error ? error.message : 'Errore interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
