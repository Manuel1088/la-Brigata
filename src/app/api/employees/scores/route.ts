import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

const ACTIVE_EMPLOYEE_FILTER = {
  isActive: true,
  NOT: { name: { equals: 'Cucina', mode: 'insensitive' as const } },
}

async function resolveScoresScope(
  userId: string,
  sessionRole: string | undefined,
  queryRestaurantId: string | null
): Promise<
  | { mode: 'restaurant'; restaurantId: string }
  | { mode: 'all' }
  | null
> {
  if (queryRestaurantId) {
    return { mode: 'restaurant', restaurantId: queryRestaurantId }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, role: true },
  })

  if (dbUser?.restaurantId) {
    return { mode: 'restaurant', restaurantId: dbUser.restaurantId }
  }

  const role = String(dbUser?.role ?? sessionRole ?? '')
  if (role === 'ADMIN') {
    return { mode: 'all' }
  }

  const firstRestaurant = await prisma.restaurant.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (firstRestaurant) {
    return { mode: 'restaurant', restaurantId: firstRestaurant.id }
  }

  return null
}

/** GET /api/employees/scores?restaurantId= — punteggi e permessi mance (Employee) */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = await resolveScoresScope(
      session.user.id,
      session.user.role as string | undefined,
      searchParams.get('restaurantId')
    )

    if (!scope) {
      return NextResponse.json(
        { error: 'Nessun ristorante configurato nel sistema' },
        { status: 400 }
      )
    }

    const employees = await prisma.employee.findMany({
      where:
        scope.mode === 'all'
          ? ACTIVE_EMPLOYEE_FILTER
          : { restaurantId: scope.restaurantId, ...ACTIVE_EMPLOYEE_FILTER },
      select: {
        id: true,
        name: true,
        score: true,
        restaurantId: true,
        canInsertTips: true,
        canEditTips: true,
        canDeleteTips: true,
        restaurants: { select: { name: true } },
      },
      orderBy: [{ restaurants: { name: 'asc' } }, { name: 'asc' }],
    })

    const restaurantId =
      scope.mode === 'restaurant' ? scope.restaurantId : null

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        score: e.score,
        restaurantId: e.restaurantId,
        restaurantName: e.restaurants.name,
        canInsertTips: e.canInsertTips,
        canEditTips: e.canEditTips,
        canDeleteTips: e.canDeleteTips,
      })),
      scope: scope.mode,
      restaurantId,
    })
  } catch (error) {
    console.error('GET /api/employees/scores error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
