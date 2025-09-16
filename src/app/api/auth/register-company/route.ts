import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
      password: string
      restaurantName?: string
      restaurantAddress?: string
    }

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
          phone: phone || undefined
        }
      })

      // 3. Crea utente proprietario
      const owner = await tx.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          password: hashedPassword,
          role: 'PROPRIETARIO',
          userType: 'OWNER',
          hierarchyLevel: 10,
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


