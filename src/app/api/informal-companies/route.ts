import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Ottieni tutti i gruppi informali
    const informalCompanies = await prisma.informalCompany.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calcola statistiche per ogni gruppo
    const companiesWithStats = informalCompanies.map(company => ({
      ...company,
      memberCount: company.users.length,
      canUpgrade: company.users.some(u => u.id === userId) // Solo se sei membro
    }))

    return NextResponse.json({
      success: true,
      informalCompanies: companiesWithStats,
      count: informalCompanies.length
    })

  } catch (error) {
    console.error('Errore nel recupero gruppi informali:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

