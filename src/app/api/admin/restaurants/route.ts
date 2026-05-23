import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { isPlatformAdmin } from '@/lib/platform-admin'
import {
  cityFromAddress,
  subscriptionStatusLabel,
} from '@/lib/admin-restaurant'
import { prisma } from '@/lib/db'

/** GET /api/admin/restaurants — griglia ristoranti per Super Admin */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!isPlatformAdmin(session.user.role, session.user.level)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { name: 'asc' },
      include: {
        company: { select: { name: true, fiscalCode: true } },
        _count: {
          select: {
            users: true,
            Employee: true,
          },
        },
      },
    })

    return NextResponse.json({
      restaurants: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        city: cityFromAddress(r.address),
        address: r.address,
        phone: r.phone,
        employeeCount: Math.max(r._count.users, r._count.Employee),
        userCount: r._count.users,
        employeeRecordCount: r._count.Employee,
        subscriptionStatus: r.subscriptionStatus,
        subscriptionLabel: subscriptionStatusLabel(r.subscriptionStatus),
        subscriptionPeriodEnd: r.subscriptionPeriodEnd,
        companyName: r.company?.name ?? null,
        companyFiscalCode: r.company?.fiscalCode ?? null,
        createdAt: r.createdAt,
      })),
      total: restaurants.length,
    })
  } catch (error) {
    console.error('GET /api/admin/restaurants error:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento ristoranti' },
      { status: 500 }
    )
  }
}
