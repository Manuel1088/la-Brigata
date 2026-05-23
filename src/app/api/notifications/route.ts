import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  notificationInputToPayload,
  rowToNotificationDto,
} from '@/lib/notifications-map'
import type { NotificationCategory } from '@/lib/notifications'

/** GET /api/notifications — notifiche dell'utente in sessione */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const rows = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const notifications = rows.map(rowToNotificationDto)
    const unread = notifications.filter((n) => !n.isRead).length
    const urgent = notifications.filter(
      (n) => n.isUrgent && !n.isRead
    ).length

    return NextResponse.json({
      notifications,
      meta: { count: notifications.length, unread, urgent },
    })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/notifications — crea notifica (destinatario: body.userId o sessione) */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''

    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'title, message e type sono obbligatori' },
        { status: 400 }
      )
    }

    const targetUserId =
      typeof body.userId === 'string' && body.userId.length > 0
        ? body.userId
        : session.user.id

    if (targetUserId !== session.user.id) {
      const role = session.user.role
      const canNotifyOthers = ['ADMIN', 'MANAGER', 'PROPRIETARIO', 'PROPRIETARIO_OPERATIVO', 'DIRETTORE'].includes(
        String(role)
      )
      if (!canNotifyOthers) {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
      }
    }

    const row = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title,
        message,
        type,
        isRead: false,
        payload: notificationInputToPayload({
          category: (body.category as NotificationCategory) ?? 'SYSTEM',
          isUrgent: Boolean(body.isUrgent),
          metadata: body.metadata,
          actions: body.actions,
        }) as object,
      },
    })

    const notification = rowToNotificationDto(row)

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('POST /api/notifications error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
