import { prisma } from '@/lib/db'
import type { Notification } from '@/lib/notifications'
import {
  notificationInputToPayload,
  rowToNotification,
  type NotificationPayload,
} from '@/lib/notifications-map'

type CreateNotificationInput = Omit<Notification, 'id' | 'timestamp' | 'isRead'>

const MANAGER_ROLES = [
  'MANAGER',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'ADMIN',
] as const

async function resolveRecipientIds(
  input: CreateNotificationInput
): Promise<string[]> {
  if (input.userId) return [input.userId]

  const companyId =
    typeof input.metadata?.companyId === 'string'
      ? input.metadata.companyId
      : undefined

  if (companyId) {
    const managers = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: [...MANAGER_ROLES] },
      },
      select: { id: true },
    })
    if (managers.length > 0) return managers.map((m) => m.id)
  }

  const restaurantId =
    typeof input.metadata?.restaurantId === 'string'
      ? input.metadata.restaurantId
      : undefined

  if (restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { companyId: true },
    })
    if (restaurant?.companyId) {
      const managers = await prisma.user.findMany({
        where: {
          companyId: restaurant.companyId,
          isActive: true,
          role: { in: [...MANAGER_ROLES] },
        },
        select: { id: true },
      })
      if (managers.length > 0) return managers.map((m) => m.id)
    }
  }

  throw new Error(
    'Notifica: specificare userId o metadata.companyId / metadata.restaurantId'
  )
}

export async function persistNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const recipientIds = await resolveRecipientIds(input)
  const payload = notificationInputToPayload(input) as NotificationPayload

  let first: Notification | null = null
  for (const userId of recipientIds) {
    const row = await prisma.notification.create({
      data: {
        userId,
        title: input.title,
        message: input.message,
        type: input.type,
        isRead: false,
        payload: payload as object,
      },
    })
    if (!first) first = rowToNotification(row)
  }

  if (!first) {
    throw new Error('Nessun destinatario per la notifica')
  }
  return first
}
