import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { createNotification } from '@/lib/notifications'

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
    let restaurantId: string | undefined = undefined

    // CASO 1: Collegamento ad azienda esistente tramite CF
    let foundCompany: any = null
    if (companyFiscalCode) {
      foundCompany = await prisma.company.findUnique({
        where: { fiscalCode: companyFiscalCode },
        include: {
          restaurants: true // Include i ristoranti dell'azienda
        }
      })
      
      if (!foundCompany) {
        return NextResponse.json(
          { error: 'Azienda non trovata con questo codice fiscale. Verifica il CF o crea un gruppo temporaneo.' },
          { status: 404 }
        )
      }
      
      companyId = foundCompany.id
      
      // Usa il primo ristorante dell'azienda o creane uno
      if (foundCompany.restaurants && foundCompany.restaurants.length > 0) {
        restaurantId = foundCompany.restaurants[0].id
      }
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
    // restaurantId già dichiarato sopra
    const anyRestaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [
          companyId ? { companyId } : undefined,
          { companyId: null }
        ].filter(Boolean) as any
      }
    })
    if (anyRestaurant) {
      restaurantId = anyRestaurant.id
    } else {
      const created = await prisma.restaurant.create({
        data: {
          name: teamName || `Team ${teamCode || name}`,
          address: null,
          phone: null,
          companyId: companyId || undefined
        }
      })
      restaurantId = created.id
    }

    // Verifica che restaurantId sia definito
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Impossibile determinare il ristorante. Contatta il supporto.' },
        { status: 500 }
      )
    }

    // Crea utente
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: (role || 'DIPENDENTE') as any,
        userType: 'EMPLOYEE',
        hierarchyLevel: 5,
        department,
        phone,
        companyId,
        informalCompanyId,
        teamCode,
        restaurantId,
        isActive: true // Sempre attivo, gestione tramite Employment
      }
    })

    // 🔥 NUOVO: Se collegato ad azienda registrata, crea Employment PENDING
    let employmentId: string | null = null
    if (companyId && restaurantId) {
      try {
        const employment = await prisma.employment.create({
          data: {
            userId: user.id,
            restaurantId: restaurantId,
            status: 'PENDING', // ⏳ Richiede approvazione
            role: (role || 'DIPENDENTE') as any,
            department: department || null,
            requestedAt: new Date()
          }
        })
        
        employmentId = employment.id
        
        // 🔔 Crea notifica per proprietario/manager dell'azienda
        try {
          createNotification({
            type: 'URGENT',
            category: 'PERSONNEL',
            title: '👥 Nuova Richiesta Dipendente',
            message: `${user.name} ha richiesto di lavorare per ${foundCompany.name}. Ruolo: ${role || 'DIPENDENTE'}, Reparto: ${department || 'Non specificato'}`,
            isUrgent: true,
            userId: foundCompany.ownerId, // Notifica al proprietario se presente
            actions: [
              {
                label: 'Visualizza Richieste',
                action: '/team/requests',
                variant: 'primary',
                icon: '👁️'
              },
              {
                label: 'Approva Subito',
                action: `/api/employments/${employment.id}/approve`,
                variant: 'primary',
                icon: '✅'
              }
            ],
            metadata: {
              employmentId: employment.id,
              userId: user.id,
              userName: user.name,
              companyId: foundCompany.id,
              companyName: foundCompany.name
            }
          })
          
          console.log(`✅ Employment PENDING creato per ${user.name} - ID: ${employment.id}`)
          console.log(`🔔 Notifica inviata al proprietario dell'azienda`)
          
        } catch (notifError) {
          console.error('Errore creazione notifica:', notifError)
          // Non bloccare se la notifica fallisce
        }
        
      } catch (employmentError) {
        console.error('Errore creazione employment:', employmentError)
        // Non blocchiamo la registrazione se employment fallisce
      }
    }

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      employmentId: employmentId,
      status: employmentId ? 'PENDING' : 'ACTIVE',
      message: employmentId 
        ? 'Registrazione completata! La tua richiesta è in attesa di approvazione dal proprietario.' 
        : 'Registrazione completata con successo!'
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


