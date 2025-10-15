import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { PrismaClient, UserRole as PrismaUserRole } from '@prisma/client'
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
      position,
      level,
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
      position?: string
      level?: string
      department: string
      role?: string
      companyFiscalCode?: string
      informalCompanyData?: { name: string; address: string; city: string; type: string; description?: string }
      teamName?: string
    }

    // Verifica se email già esiste
    const normalizedEmail = email.toLowerCase()
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
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
    let foundCompany: { id: string; name: string; restaurants?: Array<{ id: string }> } | null = null
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
        ].filter(Boolean) as Array<{ companyId?: string | null }>
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

    // Mappa mansione -> ruolo interno UI
    const mapPositionToRole = (pos?: string): string => {
      if (!pos) return role || 'DIPENDENTE'
      const p = pos.toLowerCase()
      if (p.includes('dirett')) return 'MANAGER'
      if (p.includes('restaurant manager')) return 'MANAGER'
      if (p.includes('maître') || p.includes('maitre')) return 'RESPONSABILE_SALA'
      if (p.includes('chef de rang')) return 'DIPENDENTE_SALA'
      if (p.includes('cameriere')) return 'DIPENDENTE_SALA'
      if (p.includes('sous chef')) return 'SOUS_CHEF'
      if (p.includes('chef de partie')) return 'CHEF_DE_PARTIE'
      if (p.includes('chef')) return 'CHEF'
      if (p.includes('cuoco')) return 'CAPO_PARTITA'
      if (p.includes('head barman')) return 'HEAD_BARMAN'
      if (p.includes('barman')) return 'DIPENDENTE_BAR'
      if (p.includes('barista')) return 'DIPENDENTE_BAR'
      if (p.includes('head sommelier')) return 'HEAD_SOMMELIER'
      if (p.includes('sommelier')) return 'SOMMELIER'
      if (p.includes('cassier')) return 'CASSIERE'
      if (p.includes('hostes') || p.includes('hostess') || p.includes('host')) return 'CASSIERE'
      if (p.includes('lavapiatti')) return 'LAVAPIATTI'
      return role || 'DIPENDENTE'
    }

    // Converte stringa ruolo in enum Prisma UserRole in modo sicuro
    const toUserRole = (r?: string): PrismaUserRole => {
      const candidate = (r || 'DIPENDENTE').toUpperCase()
      if ((Object.values(PrismaUserRole) as string[]).includes(candidate)) {
        return candidate as PrismaUserRole
      }
      return PrismaUserRole.DIPENDENTE
    }

    // Mappa livello stringa -> numero gerarchico
    const parseHierarchyLevel = (lvl?: string): number => {
      if (!lvl) return 5
      const v = ('' + lvl).toUpperCase()
      if (v === 'QA' || v === 'A1') return 1
      if (v === 'QB' || v === 'B2') return 2
      const n = parseInt(v)
      if (!isNaN(n)) return n
      if (v === '6S') return 6
      return 5
    }

    const mappedRole = mapPositionToRole(position)
    const hierarchyLevel = parseHierarchyLevel(level)

    // Crea utente
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        role: toUserRole(mappedRole || role || 'DIPENDENTE'),
        userType: 'EMPLOYEE',
        hierarchyLevel,
        position: position || null,
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
            role: toUserRole(mappedRole || role || 'DIPENDENTE'),
            department: department || null,
            requestedAt: new Date()
          }
        })
        
        employmentId = employment.id
        
        // 🔔 Crea notifica per approvazione (owner/manager)
        try {
          createNotification({
            type: 'URGENT',
            category: 'PERSONNEL',
            title: '👥 Nuovo dipendente in attesa',
            message: `${user.name} richiede approvazione per ${(foundCompany?.name) || 'azienda'} (${department || '—'})`,
            isUrgent: true,
            actions: [
              { label: 'Visualizza Richieste', action: '/approvals', variant: 'primary', icon: '👁️' },
              { label: 'Vai al Team', action: '/team/requests', variant: 'secondary', icon: '✅' }
            ],
            metadata: { employmentId: employment.id, userId: user.id, companyId: (foundCompany?.id || companyId || '') }
          })
        } catch (notifError) {
          console.error('Errore creazione notifica:', notifError)
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


