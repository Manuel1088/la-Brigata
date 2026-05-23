import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { rowToNotificationDto } from '@/lib/notifications-map'

async function ownedNotification(id: string, userId: string) {
  return prisma.notification.findFirst({
    where: { id, userId },
  })
}

/** PATCH /api/notifications/[id] — marca come letta */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await params
  const existing = await ownedNotification(id, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Notifica non trovata' }, { status: 404 })
  }

  const row = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  })

  return NextResponse.json({
    success: true,
    notification: rowToNotificationDto(row),
  })
}

/** DELETE /api/notifications/[id] — rimuovi */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await params
  const existing = await ownedNotification(id, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Notifica non trovata' }, { status: 404 })
  }

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
