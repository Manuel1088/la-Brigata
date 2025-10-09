import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

/**
 * Endpoint unificato per tutti i dati del dashboard
 * Combina 3 chiamate API in una sola per ridurre latenza e query duplicate
 * 
 * @returns {Object} userEmployments, pendingEmployments, userCompany, hasMultipleRestaurants
 */
export async function GET(request: NextRequest) {
  try {
    // Ottieni la sessione
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userRole = (session.user as any)?.role

    // ✅ Verifica se l'utente può vedere pending employments
    const canSeePending = ['ADMIN', 'MANAGER', 'PROPRIETARIO', 'DIRETTORE'].includes(userRole || '')

    // ✅ UNA SOLA CHIAMATA con Promise.all invece di 3 chiamate separate!
    const [userEmployments, pendingEmployments, userWithCompany] = await Promise.all([
      // 1. Employments attivi dell'utente
      (prisma as any).employment.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // 2. Pending employments (solo se admin/manager)
      canSeePending
        ? (prisma as any).employment.findMany({
            where: {
              status: 'PENDING',
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              restaurant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          })
        : Promise.resolve([]), // Array vuoto se non è admin

      // 3. Dati utente con restaurant primario
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          restaurant: true,
        },
      }),
    ])

    // Combina restaurant primario con employments se esistono
    let allRestaurants = []
    
    if (userWithCompany?.restaurant) {
      allRestaurants.push(userWithCompany.restaurant)
    }
    
    // Aggiungi restaurant da employments (evitando duplicati)
    const employmentRestaurants = userEmployments
      .map((e: any) => e.restaurant)
      .filter((r: any) => r !== null)
    
    // Rimuovi duplicati usando un Map
    const uniqueRestaurants = Array.from(
      new Map(
        [...allRestaurants, ...employmentRestaurants]
          .filter((r: any) => r !== null)
          .map((r: any) => [r.id, r])
      ).values()
    )

    return NextResponse.json({
      success: true,
      data: {
        userEmployments: userEmployments || [],
        pendingEmployments: canSeePending ? (pendingEmployments || []) : [],
        userCompany: userWithCompany?.restaurant || null,
        allRestaurants: uniqueRestaurants,
        hasMultipleRestaurants: uniqueRestaurants.length > 1,
        canSeePending,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId,
        userRole,
      }
    })
  } catch (error) {
    console.error('❌ Errore nel recupero dati dashboard:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel recupero dei dati',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

