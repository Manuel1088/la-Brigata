import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client'
import { prisma } from '@/lib/db'

function toUserRole(roleString: string): PrismaUserRole {
  // Map known labels to Prisma enum; fallback to PROPRIETARIO
  switch (roleString) {
    case 'PROPRIETARIO':
      return PrismaUserRole.PROPRIETARIO
    case 'PROPRIETARIO_OPERATIVO':
      return (PrismaUserRole as unknown as Record<string, PrismaUserRole>)['PROPRIETARIO_OPERATIVO'] || PrismaUserRole.PROPRIETARIO
    case 'DIRETTORE_GENERALE':
      return (PrismaUserRole as unknown as Record<string, PrismaUserRole>)['DIRETTORE_GENERALE'] || PrismaUserRole.DIRETTORE
    case 'DIRETTORE':
      return PrismaUserRole.DIRETTORE
    default:
      return PrismaUserRole.PROPRIETARIO
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const {
      companyName,
      fiscalCode,
      address,
      phone,
      email,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerRole,
      password,
      restaurantName,
      restaurantAddress
    } = data as {
      companyName: string
      fiscalCode: string
      address?: string
      phone?: string
      email?: string
      ownerName: string
      ownerEmail: string
      ownerPhone?: string
      ownerRole?: 'PROPRIETARIO_LAVORATORE' | 'PROPRIETARIO_NON_LAVORATORE' | 'GENERAL_MANAGER'
      password: string
      restaurantName?: string
      restaurantAddress?: string
    }

    // Mappatura ruoli user-friendly a ruoli sistema
    const roleMapping: Record<string, { role: string; level: number }> = {
      'PROPRIETARIO_LAVORATORE': { role: 'PROPRIETARIO_OPERATIVO', level: 10 },
      'PROPRIETARIO_NON_LAVORATORE': { role: 'PROPRIETARIO', level: 10 },
      'GENERAL_MANAGER': { role: 'DIRETTORE_GENERALE', level: 9 }
    }
    
    const mappedRole = roleMapping[ownerRole || 'PROPRIETARIO_NON_LAVORATORE']

    // Validazioni minime
    if (!companyName || !fiscalCode || !ownerName || !ownerEmail || !password) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      )
    }

    // Verifica se azienda già esiste
    const existingCompany = await prisma.company.findUnique({
      where: { fiscalCode }
    })
    
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Azienda già registrata con questo codice fiscale' },
        { status: 400 }
      )
    }

    // Verifica se email già esiste
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Crea azienda, ristorante (sempre) e proprietario in transazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crea azienda
      const company = await tx.company.create({
        data: {
          name: companyName,
          fiscalCode,
          address,
          phone,
          email
        }
      })

      // 2. Crea ristorante principale (se non fornito nome, ne creiamo uno default)
      const restName = restaurantName && restaurantName.trim().length > 0
        ? restaurantName
        : `${companyName} - Sede Principale`
      const restaurant = await tx.restaurant.create({
        data: {
          name: restName,
          address: restaurantAddress || address || undefined,
          phone: phone || undefined,
          companyId: company.id
        } as Prisma.RestaurantUncheckedCreateInput
      })

      // 3. Crea utente proprietario con ruolo mappato
      const ownerNameParts = ownerName.trim().split(/\s+/)
      const owner = await tx.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          firstName: ownerNameParts[0] ?? null,
          lastName: ownerNameParts.length > 1 ? ownerNameParts.slice(1).join(' ') : null,
          password: hashedPassword,
          role: toUserRole(mappedRole.role),
          userType: 'OWNER',
          hierarchyLevel: mappedRole.level,
          phone: ownerPhone || undefined,
          companyId: company.id,
          restaurantId: restaurant.id,
          department: null,
          isActive: true
        }
      })

      return { company, restaurant, owner }
    })

    return NextResponse.json({ 
      success: true, 
      companyId: result.company.id,
      restaurantId: result.restaurant.id,
      ownerId: result.owner.id,
      message: 'Azienda registrata con successo!'
    })

  } catch (error) {
    console.error('Errore registrazione azienda:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


