import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * GET /api/notifications — notifiche utente dal DB.
 * Nessun modello Prisma dedicato ancora: restituisce lista vuota.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    return NextResponse.json({
      notifications: [],
      meta: { count: 0, unread: 0, urgent: 0 },
    })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
