import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

function isSystemAdmin(role: unknown, level?: unknown): boolean {
  const r = String(role ?? '').toUpperCase()
  if (r === 'ADMIN') return true
  const lvl = Number(level)
  return Number.isFinite(lvl) && lvl >= 11
}

/** GET /api/admin/users — ADMIN: tutti gli utenti (nessun filtro companyId/restaurantId) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!isSystemAdmin(session.user.role, session.user.level)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

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
        lastLogin: true,
        companyId: true,
        restaurantId: true,
        department: true,
        company: {
          select: { name: true },
        },
        restaurant: {
          select: { name: true },
        },
      },
    })

    const usersFormatted = users.map((user) => {
      const restaurantName = user.restaurant?.name ?? null
      const companyName = user.company?.name ?? null
      const orgLabel = companyName
        ? companyName
        : restaurantName
          ? `${restaurantName} (ristorante)`
          : '(Nessuna azienda)'

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: String(user.role),
        level: user.hierarchyLevel ?? 5,
        avatar: user.avatar || '👤',
        isActive: user.isActive,
        lastLogin: user.lastLogin ?? user.createdAt,
        createdAt: user.createdAt,
        company: orgLabel,
        restaurant: restaurantName,
        companyId: user.companyId,
        restaurantId: user.restaurantId,
        department: user.department,
      }
    })

    return NextResponse.json({
      success: true,
      users: usersFormatted,
      total: usersFormatted.length,
    })
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json(
      {
        error: 'Errore nel caricamento utenti',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/** PUT /api/admin/users — attiva/disattiva/elimina utente */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!isSystemAdmin(session.user.role, session.user.level)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'UserId e action richiesti' },
        { status: 400 }
      )
    }

    let updatedUser

    switch (action) {
      case 'activate':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
        })
        break

      case 'deactivate':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        })
        break

      case 'delete':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        })
        break

      default:
        return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Utente ${action === 'activate' ? 'attivato' : action === 'deactivate' ? 'disattivato' : 'eliminato'} con successo`,
    })
  } catch (error) {
    console.error('PUT /api/admin/users error:', error)
    return NextResponse.json(
      {
        error: "Errore nell'operazione",
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
