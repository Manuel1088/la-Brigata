import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

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
    const body = await req.json()
    const { id, name, fiscalCode, address, phone, email } = body

    if (!id) {
      return NextResponse.json({ error: 'ID azienda richiesto' }, { status: 400 })
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(fiscalCode && { fiscalCode }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email })
      }
    })

    return NextResponse.json({ 
      success: true,
      company: updatedCompany,
      message: 'Azienda aggiornata con successo'
    })
  } catch (error) {
    console.error('PUT /api/companies error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }
}


