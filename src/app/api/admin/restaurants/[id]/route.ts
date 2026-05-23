import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { isPlatformAdmin } from '@/lib/platform-admin'
import {
  cityFromAddress,
  subscriptionStatusLabel,
} from '@/lib/admin-restaurant'
import { prisma } from '@/lib/db'

type RouteCtx = { params: Promise<{ id: string }> }

/** GET /api/admin/restaurants/[id] — dettaglio ristorante */
export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!isPlatformAdmin(session.user.role, session.user.level)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const { id } = await params

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            fiscalCode: true,
            subscriptionType: true,
            isActive: true,
          },
        },
        users: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            ccnlLevel: true,
            isActive: true,
            lastLogin: true,
          },
        },
        Employee: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            score: true,
            userId: true,
          },
          take: 100,
        },
        shifts: {
          orderBy: { date: 'desc' },
          take: 15,
          select: {
            id: true,
            date: true,
            department: true,
            status: true,
            user: { select: { name: true } },
          },
        },
        tips: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            date: true,
            cashTips: true,
            cardTips: true,
            foreignCurrencyTips: true,
          },
        },
        _count: {
          select: {
            users: true,
            Employee: true,
            shifts: true,
            tips: true,
          },
        },
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 })
    }

    const tipTotals = restaurant.tips.reduce(
      (acc, t) => {
        acc.cash += Number(t.cashTips)
        acc.card += Number(t.cardTips)
        acc.foreign += Number(t.foreignCurrencyTips)
        return acc
      },
      { cash: 0, card: 0, foreign: 0 }
    )

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        city: cityFromAddress(restaurant.address),
        address: restaurant.address,
        phone: restaurant.phone,
        subscriptionStatus: restaurant.subscriptionStatus,
        subscriptionLabel: subscriptionStatusLabel(restaurant.subscriptionStatus),
        subscriptionPeriodEnd: restaurant.subscriptionPeriodEnd,
        stripeCustomerId: restaurant.stripeCustomerId,
        company: restaurant.company,
        counts: restaurant._count,
        employees: restaurant.users,
        employeeRecords: restaurant.Employee,
        recentShifts: restaurant.shifts,
        recentTips: restaurant.tips.map((t) => ({
          ...t,
          total:
            Number(t.cashTips) + Number(t.cardTips) + Number(t.foreignCurrencyTips),
        })),
        tipTotalsRecent: tipTotals,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/restaurants/[id] error:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento dettaglio' },
      { status: 500 }
    )
  }
}
