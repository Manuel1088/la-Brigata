import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
        user: {
          select: {
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
    
    // Verifica permessi
    const userRole = session.user.role?.toString().toUpperCase()
    if (!['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Permesso negato' },
        { status: 403 }
      )
    }
    
    const body = await req.json()
    
    // Rifiuta employment
    await prisma.employment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Richiesta di ${employment.user.name} rifiutata`,
      reason: body.reason || 'Non specificato'
    })
    
  } catch (error) {
    console.error('Errore rifiuto employment:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

