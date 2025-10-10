import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

// ✅ BATCH API: UN'UNICA CHIAMATA INVECE DI 4
// Da ~1330ms (4 API) a ~400ms (1 API ottimizzata con Promise.all)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false,
        error: 'Non autorizzato' 
      }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = (session.user as any)?.role
    const restaurantId = (session.user as any)?.restaurantId
    const companyId = (session.user as any)?.companyId

    // ✅ PARALLEL QUERIES - Tutte eseguite contemporaneamente!
    const [userData, pendingEmployments, companyEmployees, activeEmployments] = await Promise.all([
      // Query 1: User + company + restaurant principale
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          company: {
            select: {
              id: true,
              name: true,
              fiscalCode: true,
              address: true,
              phone: true,
              email: true,
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            }
          }
        }
      }),

      // Query 2: Pending employments (solo se manager/owner con restaurantId)
      restaurantId ? prisma.employment.findMany({
        where: { 
          status: 'PENDING',
          restaurantId: restaurantId,
        },
        select: {
          id: true,
          status: true,
          requestedAt: true,
          role: true,
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true,
              avatar: true,
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        take: 20, // Limit per performance
        orderBy: {
          requestedAt: 'desc'
        }
      }) : Promise.resolve([]),

      // Query 3: Company employees (solo se ha companyId)
      companyId ? prisma.user.findMany({
        where: {
          companyId: companyId,
          // isActive: true, // Se hai questo campo
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          department: true,
        },
        take: 100, // Limit per performance
        orderBy: {
          name: 'asc'
        }
      }) : Promise.resolve([]),

      // Query 4: Active employments del user
      prisma.employment.findMany({
        where: {
          userId: userId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          role: true,
          status: true,
          startDate: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
            }
          }
        }
      }),
    ])

    if (!userData) {
      return NextResponse.json({ 
        success: false,
        error: 'Utente non trovato' 
      }, { status: 404 })
    }

    // ✅ Calcola statistiche
    const stats = {
      totalEmployees: companyEmployees.length,
      pendingRequests: pendingEmployments.length,
      activeContracts: activeEmployments.length,
      hasCompany: !!userData.company,
      hasRestaurant: !!userData.restaurant,
    }

    // ✅ Return tutto insieme in un'unica response
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
      },
      company: userData.company,
      restaurant: userData.restaurant,
      activeEmployments: activeEmployments,
      pendingEmployments: pendingEmployments,
      companyEmployees: companyEmployees,
      stats: stats,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Dashboard batch API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Errore nel caricamento dei dati',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
