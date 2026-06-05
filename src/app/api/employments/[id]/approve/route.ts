import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { notifyCandidateApproved } from '@/lib/employment-notifications'

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
    
    const employment = await prisma.employment.findUnique({
      where: { id },
      include: {
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!employment) {
      return NextResponse.json(
        { error: 'Richiesta non trovata' },
        { status: 404 }
      )
    }
    
    // Verifica permessi (solo proprietario/manager del restaurant)
    const userRole = session.user.role?.toString().toUpperCase()
    if (!['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Permesso negato' },
        { status: 403 }
      )
    }
    
    const body = await req.json()
    
    // Approva employment
    const updated = await prisma.employment.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        role: body.role || employment.role || 'DIPENDENTE',
        department: body.department || employment.department,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    })

    // Sincronizza User.restaurantId e User.companyId con l'employment approvato
    await prisma.user.update({
      where: { id: employment.userId },
      data: {
        restaurantId: employment.restaurantId,
        companyId: employment.restaurant.companyId ?? undefined,
      },
    })

    try {
      await notifyCandidateApproved({ userId: employment.userId })
    } catch (notifErr) {
      console.error(
        `[employments] Notifica candidatura approvata fallita (employment ${id}):`,
        notifErr
      )
    }

    return NextResponse.json({
      success: true,
      employment: updated,
      message: `Richiesta di ${employment.user.name} approvata con successo`
    })
    
  } catch (error) {
    console.error('Errore approvazione employment:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

