import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica ruolo ADMIN
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    // Fetch parallelo di tutte le statistiche
    const [
      totalCompanies,
      activeCompanies,
      totalRestaurants,
      totalUsers,
      activeUsers,
      totalCandidates,
      recentCompanies,
      recentUsers
    ] = await Promise.all([
      // Totale aziende
      prisma.company.count(),
      
      // Aziende attive
      prisma.company.count({
        where: { isActive: true }
      }),
      
      // Totale ristoranti
      prisma.restaurant.count(),
      
      // Totale utenti
      prisma.user.count(),
      
      // Utenti attivi
      prisma.user.count({
        where: { isActive: true }
      }),
      
      // Totale candidati (Employment con status PENDING)
      prisma.employment.count({
        where: { status: 'PENDING' }
      }),
      
      // Ultime 5 aziende create
      prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          restaurants: {
            select: { name: true },
            take: 1
          },
          users: {
            where: {
              OR: [
                { role: 'PROPRIETARIO' },
                { role: 'PROPRIETARIO_OPERATIVO' }
              ]
            },
            select: { name: true },
            take: 1
          }
        }
      }),
      
      // Ultimi 5 utenti registrati
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          company: {
            select: { name: true }
          }
        }
      })
    ])

    // Calcola statistiche aggiuntive
    const companyGrowth = totalCompanies > 0 ? '+12%' : '0%' // TODO: calcolare crescita reale
    const userGrowth = totalUsers > 0 ? '+15%' : '0%' // TODO: calcolare crescita reale

    return NextResponse.json({
      success: true,
      stats: {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          inactive: totalCompanies - activeCompanies,
          growth: companyGrowth
        },
        restaurants: {
          total: totalRestaurants,
          avgPerCompany: totalCompanies > 0 ? (totalRestaurants / totalCompanies).toFixed(1) : '0'
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          growth: userGrowth
        },
        candidates: {
          total: totalCandidates,
          pending: totalCandidates
        }
      },
      recent: {
        companies: recentCompanies.map(c => ({
          id: c.id,
          name: c.name,
          restaurantName: c.restaurants[0]?.name || 'N/A',
          ownerName: c.users[0]?.name || 'N/A',
          createdAt: c.createdAt
        })),
        users: recentUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          companyName: u.company?.name || 'N/A',
          createdAt: u.createdAt
        }))
      }
    })

  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json({ 
      error: 'Errore nel caricamento statistiche',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

