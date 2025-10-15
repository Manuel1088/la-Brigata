import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!session.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica ruolo ADMIN
  const userRole = session.user.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    // Fetch tutti gli utenti dal database
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hierarchyLevel: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            name: true
          }
        },
        restaurant: {
          select: {
            name: true
          }
        }
      }
    })

    // Mappa per Admin Panel
    const usersFormatted = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      level: user.hierarchyLevel || 5,
      avatar: user.avatar || '👤',
      isActive: user.isActive,
      lastLogin: user.createdAt, // TODO: implementare tracking lastLogin
      createdAt: user.createdAt,
      company: user.company?.name || '(Nessuna azienda)',
      restaurant: user.restaurant?.name || '(Nessun ristorante)'
    }))

    return NextResponse.json({
      success: true,
      users: usersFormatted,
      total: usersFormatted.length
    })

  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json({ 
      error: 'Errore nel caricamento utenti',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!session.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica ruolo ADMIN
  const userRole = session.user.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'UserId e action richiesti' }, { status: 400 })
    }

    let updatedUser

    switch (action) {
      case 'activate':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: true }
        })
        break

      case 'deactivate':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: false }
        })
        break

      case 'delete':
        // Soft delete (solo disattiva, non cancella dal DB)
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: false }
        })
        break

      default:
        return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Utente ${action === 'activate' ? 'attivato' : action === 'deactivate' ? 'disattivato' : 'eliminato'} con successo`
    })

  } catch (error) {
    console.error('PUT /api/admin/users error:', error)
    return NextResponse.json({ 
      error: 'Errore nell\'operazione',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

