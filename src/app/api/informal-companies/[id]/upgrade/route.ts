import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createNotification } from '@/lib/notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    const body = await req.json()
    
    const {
      fiscalCode,
      legalName,
      address,
      ownerName,
      ownerEmail,
      phone
    } = body

    // Verifica che l'InformalCompany esista
    const informalCompany = await prisma.informalCompany.findUnique({
      where: { id },
      include: {
        users: true // Tutti i dipendenti del gruppo
      }
    })

    if (!informalCompany) {
      return NextResponse.json(
        { error: 'Gruppo temporaneo non trovato' },
        { status: 404 }
      )
    }

    // Verifica che il CF non sia già usato
    const existingCompany = await prisma.company.findUnique({
      where: { fiscalCode }
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Codice fiscale già registrato' },
        { status: 400 }
      )
    }

    console.log(`🔄 Upgrade gruppo temporaneo "${informalCompany.name}" a azienda registrata`)

    // 1. Crea Company registrata
    const newCompany = await prisma.company.create({
      data: {
        name: legalName || informalCompany.name,
        fiscalCode: fiscalCode,
        address: address || informalCompany.address,
        email: ownerEmail,
        phone: phone,
        isActive: true
        // Note: ownerName non è nel modello Company, viene usato solo nella form
      }
    })

    console.log(`✅ Company creata: ${newCompany.name} (${newCompany.fiscalCode})`)

    // 2. Crea Restaurant per la company
    const newRestaurant = await prisma.restaurant.create({
      data: {
        name: informalCompany.name,
        address: informalCompany.address,
        phone: phone,
        companyId: newCompany.id
      }
    })

    console.log(`✅ Restaurant creato: ${newRestaurant.name}`)

    // 3. Converti tutti i membri del gruppo
    const members = informalCompany.users
    let convertedCount = 0
    let employmentCount = 0

    for (const member of members) {
      try {
        // Aggiorna user con nuovo companyId
        await prisma.user.update({
          where: { id: member.id },
          data: {
            companyId: newCompany.id,
            restaurantId: newRestaurant.id,
            informalCompanyId: null, // Rimuovi collegamento a gruppo temporaneo
            isActive: true
          }
        })

        // Crea Employment ACTIVE (auto-approvato perché erano già nel gruppo)
        await prisma.employment.create({
          data: {
            userId: member.id,
            restaurantId: newRestaurant.id,
            status: 'ACTIVE', // ✅ Auto-approvato
            role: member.role,
            department: member.department,
            requestedAt: member.createdAt,
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
            startDate: member.startDate || member.createdAt
          }
        })

        convertedCount++
        employmentCount++

        // Invia notifica a ciascun membro
        try {
          await createNotification({
            type: 'SUCCESS',
            category: 'PERSONNEL',
            title: '🎉 Azienda Registrata!',
            message: `Il tuo team "${informalCompany.name}" è ora un'azienda registrata: ${newCompany.name}. Sei stato automaticamente approvato come dipendente.`,
            isUrgent: false,
            userId: member.id,
            actions: [
              {
                label: 'Visualizza Dashboard',
                action: '/dashboard',
                variant: 'primary',
                icon: '📊'
              }
            ],
            metadata: {
              companyId: newCompany.id,
              companyName: newCompany.name,
              restaurantId: newRestaurant.id,
              upgradedFrom: informalCompany.id
            }
          })
        } catch (notifError) {
          console.error(`Errore notifica per ${member.name}:`, notifError)
        }

        console.log(`  ✅ Convertito: ${member.name} (${member.email})`)

      } catch (memberError) {
        console.error(`  ❌ Errore conversione ${member.name}:`, memberError)
      }
    }

    // 4. Elimina InformalCompany
    await prisma.informalCompany.delete({
      where: { id }
    })

    console.log(`🗑️  Gruppo temporaneo eliminato`)
    console.log(`✅ Upgrade completato: ${convertedCount}/${members.length} membri convertiti`)

    return NextResponse.json({
      success: true,
      company: newCompany,
      restaurant: newRestaurant,
      convertedMembers: convertedCount,
      totalMembers: members.length,
      employmentsCreated: employmentCount,
      message: `Gruppo "${informalCompany.name}" convertito con successo in ${newCompany.name}. ${convertedCount} dipendenti auto-approvati.`
    })

  } catch (error) {
    console.error('💥 Errore upgrade gruppo:', error)
    return NextResponse.json(
      { error: 'Errore durante la conversione del gruppo' },
      { status: 500 }
    )
  }
}

