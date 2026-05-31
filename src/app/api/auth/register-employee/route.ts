import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { UserRole as PrismaUserRole } from '@prisma/client'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/db'
import type { CCNLLevel } from '@prisma/client'
import { isCcnlLevel } from '@/lib/ccnl'
import {
  inferCcnlFromRole,
  registrationLevelToCcnl,
} from '@/lib/ccnl-infer'
import {
  departmentFromStorage,
  suggestedCcnlForRole,
} from '@/lib/restaurant-roles'
import { isPendingInviteUsable } from '@/lib/pending-invite'

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
      teamName,
      inviteToken
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
      inviteToken?: string
    }

    // Risoluzione invito (PendingInvite). Se presente bypassa il lookup P.IVA
    // e l'email è quella autorevole dell'invito.
    let inviteRecord:
      | { id: string; companyId: string; restaurantId: string; companyName: string; email: string }
      | null = null
    if (inviteToken && inviteToken.trim()) {
      const found = await prisma.pendingInvite.findUnique({
        where: { token: inviteToken.trim() },
        include: { company: { select: { name: true } } },
      })
      if (!found || !isPendingInviteUsable(found)) {
        return NextResponse.json(
          { error: 'Invito non valido, scaduto o già utilizzato.' },
          { status: 400 }
        )
      }
      inviteRecord = {
        id: found.id,
        companyId: found.companyId,
        restaurantId: found.restaurantId,
        companyName: found.company.name,
        email: found.email,
      }
    }

    const normalizedEmail = (inviteRecord?.email ?? email).toLowerCase()

    // Verifica se email già esiste
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, companyId: true },
    })

    if (existingUser) {
      // Dedupe: con codice invito valido collega l'utente orfano (senza azienda)
      // alla company del codice, SENZA duplicare il record User.
      if (inviteRecord && !existingUser.companyId) {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              companyId: inviteRecord!.companyId,
              restaurantId: inviteRecord!.restaurantId,
            },
          })
          await tx.employment.upsert({
            where: {
              userId_restaurantId: {
                userId: existingUser.id,
                restaurantId: inviteRecord!.restaurantId,
              },
            },
            update: { status: 'ACTIVE', reviewedAt: new Date() },
            create: {
              userId: existingUser.id,
              restaurantId: inviteRecord!.restaurantId,
              status: 'ACTIVE',
              role: PrismaUserRole.DIPENDENTE,
              department: department || null,
              requestedAt: new Date(),
              reviewedAt: new Date(),
            },
          })
          await tx.pendingInvite.update({
            where: { id: inviteRecord!.id },
            data: { acceptedAt: new Date() },
          })
        })

        return NextResponse.json({
          success: true,
          userId: existingUser.id,
          status: 'ACTIVE',
          message: `✅ Sei entrato in ${inviteRecord.companyName}!`,
        })
      }

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

    // CASO 0: Codice invito → collega direttamente a company + ristorante del codice
    let foundCompany: { id: string; name: string; restaurants?: Array<{ id: string }> } | null = null
    if (inviteRecord) {
      companyId = inviteRecord.companyId
      restaurantId = inviteRecord.restaurantId
    }
    // CASO 1: Collegamento ad azienda esistente tramite CF
    else if (companyFiscalCode) {
      foundCompany = await prisma.company.findUnique({
        where: { fiscalCode: companyFiscalCode },
        include: {
          restaurants: true // Include i ristoranti dell'azienda
        }
      })
      
      if (!foundCompany) {
        return NextResponse.json(
          { error: 'Codice Fiscale azienda non trovato. Verifica con il tuo datore di lavoro.' },
          { status: 404 }
        )
      }

      companyId = foundCompany.id

      if (foundCompany.restaurants && foundCompany.restaurants.length > 0) {
        // TODO: se l'azienda ha più ristoranti, permettere al dipendente di
        // scegliere la sede invece di agganciare automaticamente la prima.
        restaurantId = foundCompany.restaurants[0].id
      } else {
        // Azienda senza ristoranti (edge case): crea la sede principale
        // scoping esplicitamente alla company corretta.
        const created = await prisma.restaurant.create({
          data: {
            name: `${foundCompany.name} - Sede Principale`,
            companyId: foundCompany.id,
          },
        })
        restaurantId = created.id
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

    // Per team informali o indipendenti (nessuna azienda registrata tramite CF)
    // crea una sede dedicata. NON agganciare mai a ristoranti di altre aziende
    // (rimosso il vecchio fallback findFirst({ companyId: null })).
    if (!restaurantId) {
      const created = await prisma.restaurant.create({
        data: {
          name: teamName || informalCompanyData?.name || `Team ${teamCode || name}`,
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
    const roleKey = mappedRole || role || 'DIPENDENTE'
    const deptKey = departmentFromStorage(department || 'sala')
    const resolvedCcnl =
      registrationLevelToCcnl(level) ??
      suggestedCcnlForRole(deptKey, roleKey) ??
      inferCcnlFromRole(roleKey)
    const ccnlLevel: CCNLLevel | null = isCcnlLevel(resolvedCcnl)
      ? (resolvedCcnl as CCNLLevel)
      : null

    // Crea utente
    const nameParts = name.trim().split(/\s+/)
    const newFirstName = nameParts[0] ?? null
    const newLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        firstName: newFirstName,
        lastName: newLastName,
        password: hashedPassword,
        role: toUserRole(roleKey),
        userType: 'EMPLOYEE',
        hierarchyLevel,
        ccnlLevel,
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

    // Crea Employment. Con codice invito è pre-autorizzato (ACTIVE), altrimenti
    // resta PENDING e richiede l'approvazione del manager.
    let employmentId: string | null = null
    let employmentActive = false
    if (companyId && restaurantId) {
      try {
        const employment = await prisma.employment.create({
          data: {
            userId: user.id,
            restaurantId: restaurantId,
            status: inviteRecord ? 'ACTIVE' : 'PENDING',
            role: toUserRole(mappedRole || role || 'DIPENDENTE'),
            department: department || null,
            requestedAt: new Date(),
            reviewedAt: inviteRecord ? new Date() : null,
          }
        })

        employmentId = employment.id
        employmentActive = !!inviteRecord

        if (inviteRecord) {
          // Invito consumato: segna come accettato (token monouso)
          try {
            await prisma.pendingInvite.update({
              where: { id: inviteRecord.id },
              data: { acceptedAt: new Date() },
            })
          } catch (incErr) {
            console.error('Errore aggiornamento invito:', incErr)
          }
        } else {
          // 🔔 Solo per il flusso CF: notifica i manager per l'approvazione
          try {
            await createNotification({
              type: 'URGENT',
              category: 'PERSONNEL',
              title: '👥 Nuovo dipendente in attesa',
              message: `${user.name} richiede approvazione per ${(foundCompany?.name) || 'azienda'} (${department || '—'})`,
              isUrgent: true,
              actions: [
                { label: 'Visualizza Richieste', action: '/approvals', variant: 'primary', icon: '👁️' },
                { label: 'Vai alle approvazioni', action: '/approvals?tab=candidatures', variant: 'secondary', icon: '✅' }
              ],
              metadata: {
                employmentId: employment.id,
                userId: user.id,
                companyId: foundCompany?.id || companyId || '',
                restaurantId,
              },
            })
          } catch (notifError) {
            console.error('Errore creazione notifica:', notifError)
          }
        }

      } catch (employmentError) {
        console.error('Errore creazione employment:', employmentError)
        // Non blocchiamo la registrazione se employment fallisce
      }
    }

    // 🎉 Riconoscimento reciproco tra colleghi + benvenuto.
    // Non bloccante: eventuali errori non interrompono la registrazione.
    try {
      const companyDisplayName = inviteRecord?.companyName || foundCompany?.name || 'La Brigata'
      const newcomerName = name.trim()

      if (companyId) {
        // Tutti gli altri utenti della stessa azienda (escluso il nuovo iscritto)
        const colleagues = await prisma.user.findMany({
          where: { companyId, id: { not: user.id } },
          select: { id: true },
        })
        const totalUsers = colleagues.length + 1 // include il nuovo iscritto

        // Notifica ai colleghi già registrati
        for (const colleague of colleagues) {
          try {
            await createNotification({
              type: 'INFO',
              category: 'PERSONNEL',
              title: '👋 Nuovo collega su La Brigata',
              message: `👋 Anche ${newcomerName} si è appena unito/a su La Brigata! Siete in ${totalUsers} sull'app.`,
              userId: colleague.id,
              isUrgent: false,
            })
          } catch (colleagueNotifError) {
            console.error('Errore notifica collega:', colleagueNotifError)
          }
        }

        // Notifica di benvenuto al nuovo utente
        const welcomeMessage =
          colleagues.length > 0
            ? `🎉 Sei entrato in ${companyDisplayName}! Ci sono già ${totalUsers - 1} colleghi su La Brigata.`
            : `🎉 Sei il primo di ${companyDisplayName} su La Brigata! Invita i tuoi colleghi.`
        await createNotification({
          type: 'SUCCESS',
          category: 'PERSONNEL',
          title: '🎉 Benvenuto su La Brigata',
          message: welcomeMessage,
          userId: user.id,
          isUrgent: false,
        })
      } else {
        // Azienda non registrata (orfana dal lookup P.IVA): salta le notifiche
        // colleghi, manda solo il benvenuto al nuovo utente.
        await createNotification({
          type: 'SUCCESS',
          category: 'PERSONNEL',
          title: '🎉 Benvenuto su La Brigata',
          message: `🎉 Sei il primo di ${companyDisplayName} su La Brigata! Invita i tuoi colleghi.`,
          userId: user.id,
          isUrgent: false,
        })
      }
    } catch (welcomeNotifError) {
      console.error('Errore notifiche benvenuto/colleghi:', welcomeNotifError)
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      employmentId: employmentId,
      status: employmentActive ? 'ACTIVE' : employmentId ? 'PENDING' : 'ACTIVE',
      message: inviteRecord
        ? `✅ Sei entrato in ${inviteRecord.companyName}!`
        : employmentId
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


