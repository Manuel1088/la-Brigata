import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/db'
import { assertRestaurantAccess } from '@/lib/restaurant-access'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { employmentId } = await request.json()
    if (!employmentId) return NextResponse.json({ error: 'employmentId richiesto' }, { status: 400 })

    const existing = await prisma.employment.findUnique({
      where: { id: employmentId },
      select: { restaurantId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Employment non trovato' }, { status: 404 })
    }

    const allowed = await assertRestaurantAccess(session.user.id, existing.restaurantId, true)
    if (!allowed) {
      return NextResponse.json({ error: 'Accesso negato — solo i manager possono approvare' }, { status: 403 })
    }

    const employment = await prisma.employment.update({
      where: { id: employmentId },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: session.user.id }
    })

    const user = await prisma.user.findUnique({ where: { id: employment.userId } })

    await createNotification({
      type: 'SUCCESS',
      category: 'PERSONNEL',
      title: 'Dipendente approvato',
      message: `${user?.name || 'Dipendente'} approvato e aggiunto al team`,
      isUrgent: false,
      actions: [{ label: 'Apri Team', action: '/team', variant: 'primary', icon: '👥' }],
      metadata: { restaurantId: employment.restaurantId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Errore approvazione' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
