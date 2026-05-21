import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { dateFromIso, isPresentShift, toDateOnlyIso } from '@/lib/shifts'

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
    const userRole = String(session.user.role ?? '')
    const companyId = session.user.companyId
    const isRestaurantTipsView = userRole === 'ADMIN' || userRole === 'MANAGER'

    const today = new Date()
    const todayIso = toDateOnlyIso(today)
    const todayStart = dateFromIso(todayIso)
    const todayEnd = new Date(`${todayIso}T23:59:59.999`)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayIso = toDateOnlyIso(yesterday)
    const yesterdayStart = dateFromIso(yesterdayIso)
    const yesterdayEnd = new Date(`${yesterdayIso}T23:59:59.999`)

    const weekStart = new Date(today)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const userData = await prisma.user.findUnique({
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
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    })

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: 'Utente non trovato',
      }, { status: 404 })
    }

    const restaurantId = session.user.restaurantId ?? userData.restaurant?.id ?? null

    const [
      pendingEmployments,
      employeesCount,
      activeEmployments,
      shiftsToday,
      bookingsTodayCount,
      weeklyEventsCount,
      yesterdayTipsTotal,
    ] = await Promise.all([
      restaurantId
        ? prisma.employment.findMany({
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

      restaurantId
        ? prisma.shift.findMany({
            where: {
              restaurantId,
              date: { gte: todayStart, lte: todayEnd },
            },
            select: {
              userId: true,
              status: true,
              startTime: true,
              endTime: true,
              user: { select: { isActive: true } },
            },
          })
        : Promise.resolve([]),

      restaurantId
        ? prisma.booking.count({
            where: {
              restaurantId,
              date: { gte: todayStart, lte: todayEnd },
              status: { notIn: ['cancelled', 'canceled', 'annullata'] },
            },
          })
        : Promise.resolve(0),

      restaurantId
        ? prisma.restaurantEvent.count({
            where: {
              restaurantId,
              date: { gte: weekStart, lte: weekEnd },
            },
          })
        : Promise.resolve(0),

      restaurantId
        ? (async () => {
            if (isRestaurantTipsView) {
              const rows = await prisma.tipEntry.findMany({
                where: {
                  restaurantId,
                  date: { gte: yesterdayStart, lte: yesterdayEnd },
                },
                select: { amount: true },
              })
              return rows.reduce((s, r) => s + Number(r.amount), 0)
            }

            const employee = await prisma.employee.findFirst({
              where: { name: session.user.name ?? '', restaurantId },
              select: { id: true },
            })
            if (!employee) return 0

            const rows = await prisma.tipDistributionV2.findMany({
              where: {
                employeeId: employee.id,
                date: { gte: yesterdayStart, lte: yesterdayEnd },
              },
              select: { amount: true },
            })
            return rows.reduce((s, r) => s + Number(r.amount), 0)
          })()
        : Promise.resolve(0),
    ])

    const presentToday = new Set<string>()
    for (const shift of shiftsToday) {
      if (shift.user.isActive && isPresentShift(shift.status, shift.startTime, shift.endTime)) {
        presentToday.add(shift.userId)
      }
    }
    const shiftsTodayCount = presentToday.size

    const stats = {
      totalEmployees: employeesCount,
      pendingRequests: pendingEmployments.length,
      activeContracts: activeEmployments.length,
      hasCompany: !!userData.company,
      hasRestaurant: !!userData.restaurant,
    }

    const widgets = {
      shiftsTodayCount,
      yesterdayTipsTotal,
      yesterdayTipsLabel: isRestaurantTipsView
        ? 'Mance ristorante ieri'
        : 'Le tue mance ieri',
      tipsView: isRestaurantTipsView ? ('restaurant' as const) : ('personal' as const),
      bookingsTodayCount,
      weeklyEventsCount,
      hasBookings: bookingsTodayCount > 0,
      hasEvents: weeklyEventsCount > 0,
    }

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
        widgets,
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
