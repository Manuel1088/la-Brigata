import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'
import { isManagerRole } from '@/lib/roles'

const PLATFORM_ADMIN_ROLES = new Set(['ADMIN'])

export async function POST(
  req: NextRequest,
  context: unknown
) {
  try {
    const { params } = (context as { params?: { id?: string } }) ?? {}
    const companyId = params?.id
    if (!companyId) return NextResponse.json({ error: 'Missing company id' }, { status: 400 })

    // Sessione obbligatoria
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica esistenza company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    })
    if (!company) return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 })

    // Solo owner/manager della company (o admin piattaforma) può creare ristoranti
    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        companyId: true,
        restaurant: { select: { companyId: true } },
        employments: {
          where: { status: { in: ['APPROVED', 'ACTIVE'] } },
          select: { restaurant: { select: { companyId: true } } },
        },
      },
    })
    if (!caller) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const isPlatformAdmin = PLATFORM_ADMIN_ROLES.has(caller.role ?? '')
    const allowedCompanyIds = new Set(
      [
        caller.companyId,
        caller.restaurant?.companyId,
        ...caller.employments.map((e) => e.restaurant.companyId),
      ].filter((cid): cid is string => Boolean(cid))
    )

    if (!isPlatformAdmin && (!isManagerRole(caller.role) || !allowedCompanyIds.has(companyId))) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { name, address, phone } = await req.json()
    if (!name || (typeof name !== 'string') || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome ristorante obbligatorio' }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: name.trim(),
        address: address || null,
        phone: phone || null,
        companyId: company.id,
      }
    })

    return NextResponse.json({ success: true, restaurant })
  } catch (error) {
    console.error('POST /api/companies/[id]/restaurants error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


