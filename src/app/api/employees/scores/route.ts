import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

/** GET /api/employees/scores?restaurantId= — punteggi Employee per Manage */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const restaurantId =
      searchParams.get('restaurantId') ??
      (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { restaurantId: true },
        })
      )?.restaurantId

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId richiesto' }, { status: 400 })
    }

    const employees = await prisma.employee.findMany({
      where: {
        restaurantId,
        isActive: true,
        NOT: { name: { equals: 'Cucina', mode: 'insensitive' } },
      },
      select: { id: true, name: true, score: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('GET /api/employees/scores error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
