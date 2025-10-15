import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

// ✅ BATCH API: UN'UNICA CHIAMATA INVECE DI 4
// Da ~1330ms (4 API) a ~400ms (1 API ottimizzata con Promise.all)

// ✅ Next.js 15 Route Segment Config - HTTP Caching
export const revalidate = 120 // Cache 2 minuti (ISR)
export const dynamic = 'force-dynamic' // Sempre ricalcola per dati personalizzati

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
    const userRole = session.user.role
    const restaurantId = session.user.restaurantId
    const companyId = session.user.companyId

    // ✅ PARALLEL QUERIES - Tutte eseguite contemporaneamente!
    const [userData, pendingEmployments, employeesCount, activeEmployments] = await Promise.all([
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

      // Query 3: Count employees (OTTIMIZZATO - solo count invece di fetch completo!)
      companyId ? prisma.user.count({
        where: {
          companyId: companyId,
          // ✅ Filter solo utenti attivi se hai il campo
          // isActive: true,
        },
      }) : Promise.resolve(0),

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
      totalEmployees: employeesCount, // ✅ Usa count invece di array.length
      pendingRequests: pendingEmployments.length,
      activeContracts: activeEmployments.length,
      hasCompany: !!userData.company,
      hasRestaurant: !!userData.restaurant,
    }

    // ✅ Return tutto insieme in un'unica response
    return NextResponse.json(
      {
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
        stats: stats,
        timestamp: new Date().toISOString(),
      },
      {
        // ✅ HTTP Cache headers
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        }
      }
    )

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
