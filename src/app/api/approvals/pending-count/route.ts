import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { canManageRestaurantStaff } from '@/lib/employee-create'
import { isLeaveApprover } from '@/lib/leaves'
import { isManagerRole } from '@/lib/roles'

/**
 * GET /api/approvals/pending-count
 * Conteggi aggregati da DB (ferie, employment; swap quando esiste ShiftSwapRequest).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        restaurantId: true,
        companyId: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const role = String(dbUser.role ?? '')
    const canStaff = canManageRestaurantStaff(role)
    const canLeaves = isLeaveApprover(role)

    if (!canStaff && !canLeaves) {
      return NextResponse.json({
        total: 0,
        leaves: 0,
        employments: 0,
        swaps: 0,
      })
    }

    let leaves = 0
    let employments = 0
    const swaps = 0

    if (canLeaves && dbUser.restaurantId) {
      leaves = await prisma.leaveRequest.count({
        where: {
          status: 'PENDING',
          user: { restaurantId: dbUser.restaurantId },
        },
      })
    }

    if (canStaff) {
      let restaurantIds: string[] | null = null

      if (dbUser.restaurantId) {
        restaurantIds = [dbUser.restaurantId]
      } else if (dbUser.companyId && isManagerRole(role)) {
        const restaurants = await prisma.restaurant.findMany({
          where: { companyId: dbUser.companyId },
          select: { id: true },
        })
        restaurantIds = restaurants.map((r) => r.id)
      }

      if (restaurantIds && restaurantIds.length > 0) {
        employments = await prisma.employment.count({
          where: {
            status: 'PENDING',
            restaurantId: { in: restaurantIds },
          },
        })
      }
    }

    const total = leaves + employments + swaps

    return NextResponse.json({
      total,
      leaves,
      employments,
      swaps,
    })
  } catch (error) {
    console.error('GET /api/approvals/pending-count error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
