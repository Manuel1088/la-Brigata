import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { employmentId, approverId } = await request.json()
    if (!employmentId) return NextResponse.json({ error: 'employmentId richiesto' }, { status: 400 })

    const employment = await prisma.employment.update({
      where: { id: employmentId },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: approverId || null }
    })

    const user = await prisma.user.findUnique({ where: { id: employment.userId } })

    // Notifica al proprietario/manager
    createNotification({
      type: 'SUCCESS',
      category: 'PERSONNEL',
      title: 'Dipendente approvato',
      message: `${user?.name || 'Dipendente'} approvato e aggiunto al team`,
      isUrgent: false,
      actions: [{ label: 'Apri Team', action: '/team', variant: 'primary', icon: '👥' }]
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Errore approvazione' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
