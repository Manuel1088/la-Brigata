import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const {
      name,
      email,
      phone,
      password,
      department,
      role,
      companyFiscalCode,
      informalCompanyData,
      teamName
    } = data as {
      name: string
      email: string
      phone?: string
      password: string
      department: string
      role?: string
      companyFiscalCode?: string
      informalCompanyData?: { name: string; address: string; city: string; type: string; description?: string }
      teamName?: string
    }

    // Verifica se email già esiste
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    let companyId: string | null = null
    let informalCompanyId: string | null = null
    let teamCode: string | null = null

    // CASO 1: Collegamento ad azienda esistente
    if (companyFiscalCode) {
      const company = await prisma.company.findUnique({
        where: { fiscalCode: companyFiscalCode }
      })
      
      if (!company) {
        return NextResponse.json(
          { error: 'Azienda non trovata con questo codice fiscale' },
          { status: 400 }
        )
      }
      
      companyId = company.id
    }
    
    // CASO 2: Team informale (stessa azienda non registrata)
    else if (informalCompanyData) {
      // Cerca se esiste già un team con dati simili
      const existingInformalCompany = await prisma.informalCompany.findFirst({
        where: {
          name: {
            contains: informalCompanyData.name,
            mode: 'insensitive'
          },
          city: informalCompanyData.city
        }
      })

      if (existingInformalCompany) {
        informalCompanyId = existingInformalCompany.id
      } else {
        // Crea nuova azienda informale
        const newInformalCompany = await prisma.informalCompany.create({
          data: {
            name: informalCompanyData.name,
            address: informalCompanyData.address,
            city: informalCompanyData.city,
            type: informalCompanyData.type,
            description: informalCompanyData.description
          }
        })
        informalCompanyId = newInformalCompany.id
      }
    }
    
    // CASO 3: Team completamente indipendente
    else {
      teamCode = `TEAM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Assicurati di avere un restaurantId valido (campo richiesto nello schema)
    let restaurantId: string
    const anyRestaurant = await prisma.restaurant.findFirst()
    if (anyRestaurant) {
      restaurantId = anyRestaurant.id
    } else {
      const created = await prisma.restaurant.create({
        data: {
          name: teamName || `Team ${teamCode || name}`,
          address: null,
          phone: null
        }
      })
      restaurantId = created.id
    }

    // Crea utente
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'DIPENDENTE',
        userType: 'EMPLOYEE',
        hierarchyLevel: 5,
        department,
        phone,
        companyId,
        informalCompanyId,
        teamCode,
        restaurantId,
        isActive: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      message: 'Registrazione completata con successo!'
    })

  } catch (error) {
    console.error('Errore registrazione dipendente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


