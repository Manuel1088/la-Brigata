import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireManageCompanySession } from '@/lib/restaurant-location-api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cf = searchParams.get('cf')
    if (cf) {
      const company = await prisma.company.findUnique({ where: { fiscalCode: cf } })
      return NextResponse.json({ company })
    }

    // Per Admin Panel: fetch completo con tutte le info
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true,
            createdAt: true
          }
        },
        users: {
          where: {
            OR: [
              { role: 'PROPRIETARIO' },
              { role: 'PROPRIETARIO_OPERATIVO' },
              { role: 'DIRETTORE_GENERALE' }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          },
          take: 1
        },
        _count: {
          select: {
            users: true,
            restaurants: true
          }
        }
      }
    })

    // Mappa per Admin Panel con tutte le info necessarie
    const companiesFormatted = companies.map(company => {
      const owner = company.users[0]
      const restaurant = company.restaurants[0]
      
      return {
        id: company.id,
        name: company.name,
        fiscalCode: company.fiscalCode || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        region: company.address?.includes('Milano') ? 'Lombardia' : 
                company.address?.includes('Roma') ? 'Lazio' : 
                company.address?.includes('Napoli') ? 'Campania' : 'Italia',
        ownerName: owner?.name || '(Non assegnato)',
        ownerEmail: owner?.email || '',
        ownerId: owner?.id || null,
        restaurantName: restaurant?.name || '(Nessun ristorante)',
        restaurantCount: company._count.restaurants,
        employeeCount: company._count.users,
        status: company.isActive ? 'active' : 'inactive',
        subscriptionType: company.subscriptionType || 'BASIC',
        createdAt: company.createdAt,
        lastActivity: company.createdAt // TODO: implementare tracking real-time
      }
    })

    return NextResponse.json({ companies: companiesFormatted })
  } catch (error) {
    console.error('GET /api/companies error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireManageCompanySession()
    if (!auth.ok) return auth.response

    const body = await req.json()
    const { id, name, fiscalCode, address, phone, email } = body

    if (!id) {
      return NextResponse.json({ error: 'ID azienda richiesto' }, { status: 400 })
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Il nome azienda è obbligatorio' }, { status: 400 })
    }

    const userId = auth.session.user!.id!
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        restaurant: { select: { companyId: true } },
        employments: {
          where: { status: { in: ['APPROVED', 'ACTIVE'] } },
          select: { restaurant: { select: { companyId: true } } },
        },
      },
    })

    const allowedCompanyIds = new Set(
      [
        user?.companyId,
        user?.restaurant?.companyId,
        ...user?.employments.map((e) => e.restaurant.companyId) ?? [],
      ].filter((cid): cid is string => Boolean(cid))
    )

    if (!allowedCompanyIds.has(id)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(fiscalCode !== undefined && fiscalCode !== '' && { fiscalCode: String(fiscalCode).trim() }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
      },
    })

    return NextResponse.json({
      success: true,
      company: updatedCompany,
      message: 'Azienda aggiornata con successo',
    })
  } catch (error) {
    console.error('PUT /api/companies error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Codice fiscale / P.IVA già in uso da un’altra azienda' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }
}


