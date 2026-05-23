import type { Notification as PrismaNotification } from '@prisma/client'
import type {
  Notification,
  NotificationAction,
  NotificationCategory,
  NotificationDto,
  NotificationMetadata,
  NotificationType,
} from '@/lib/notifications'

export type NotificationPayload = {
  category?: NotificationCategory
  isUrgent?: boolean
  metadata?: NotificationMetadata
  actions?: NotificationAction[]
}

function parsePayload(raw: unknown): NotificationPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as NotificationPayload
}

export function rowToNotification(row: PrismaNotification): Notification {
  const payload = parsePayload(row.payload)
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    category: payload.category ?? 'SYSTEM',
    title: row.title,
    message: row.message,
    timestamp: row.createdAt,
    isRead: row.isRead,
    isUrgent: payload.isUrgent ?? row.type === 'URGENT',
    actions: payload.actions,
    metadata: payload.metadata,
  }
}

export function rowToNotificationDto(row: PrismaNotification): NotificationDto {
  const n = rowToNotification(row)
  return {
    ...n,
    timestamp: n.timestamp.toISOString(),
  }
}

export function notificationInputToPayload(
  input: Pick<Notification, 'category' | 'isUrgent' | 'metadata' | 'actions'>
): NotificationPayload {
  return {
    category: input.category,
    isUrgent: input.isUrgent,
    metadata: input.metadata,
    actions: input.actions,
  }
}
