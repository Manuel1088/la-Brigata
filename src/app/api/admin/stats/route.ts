import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { prisma } from '@/lib/db'

/** GET /api/admin/stats — metriche piattaforma (solo Super Admin) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!isPlatformAdmin(session.user.role, session.user.level)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const [
      totalRestaurants,
      totalUsers,
      activeUsers,
      vatAnomalies,
      vatPending,
      vatOpenNotifications,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.vatRegistration.count({
        where: { aggregationStatus: 'ANOMALIA' },
      }),
      prisma.vatRegistration.count({
        where: { aggregationStatus: 'PENDING' },
      }),
      prisma.vatAggregationNotification.count({
        where: {
          responseStatus: 'IN_ATTESA',
          expiresAt: { gte: new Date() },
        },
      }),
    ])

    const vatPendingReview = vatAnomalies + vatPending + vatOpenNotifications

    return NextResponse.json({
      success: true,
      stats: {
        restaurants: { total: totalRestaurants },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        vat: {
          pendingReview: vatPendingReview,
          anomalies: vatAnomalies,
          pending: vatPending,
          openNotifications: vatOpenNotifications,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json(
      {
        error: 'Errore nel caricamento statistiche',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
