import { formatEuro } from '@/lib/utils'

// Sistema di Notifiche Enterprise per La Brigata
// 5 tipologie, 7 categorie, notifiche interattive

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'URGENT'
export type NotificationCategory = 'PERSONNEL' | 'LEAVES' | 'TIPS' | 'SHIFTS' | 'SYSTEM' | 'ALERT' | 'MESSAGES'

export interface NotificationAction {
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'danger'
  icon?: string
}

export interface NotificationMetadata {
  [key: string]: string | number | boolean | null | undefined
}

export interface Notification {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  isUrgent: boolean
  actions?: NotificationAction[]
  metadata?: NotificationMetadata
  userId?: string // Se specifico per un utente
  autoDismiss?: boolean
  dismissAfter?: number // millisecondi
}

// Configurazione tipologie notifiche
export const NOTIFICATION_TYPES = {
  INFO: {
    icon: 'ℹ️',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    sound: 'info'
  },
  SUCCESS: {
    icon: '✅',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    sound: 'success'
  },
  WARNING: {
    icon: '⚠️',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    sound: 'warning'
  },
  ERROR: {
    icon: '❌',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    sound: 'error'
  },
  URGENT: {
    icon: '🚨',
    color: 'red',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    textColor: 'text-red-900',
    sound: 'urgent',
    pulse: true
  }
}

// Configurazione categorie notifiche
export const NOTIFICATION_CATEGORIES = {
  PERSONNEL: {
    icon: '👥',
    name: 'Personale',
    color: 'purple',
    description: 'Nuovi dipendenti, modifiche, certificazioni'
  },
  LEAVES: {
    icon: '📅',
    name: 'Ferie e Permessi',
    color: 'indigo',
    description: 'Richieste da approvare, scadenze'
  },
  TIPS: {
    icon: '💰',
    name: 'Mance',
    color: 'green',
    description: 'Divisioni completate, calcoli automatici'
  },
  SHIFTS: {
    icon: '⏰',
    name: 'Turni',
    color: 'blue',
    description: 'Coperture, sostituzioni, emergenze'
  },
  SYSTEM: {
    icon: '⚙️',
    name: 'Sistema',
    color: 'gray',
    description: 'Backup, sync, configurazioni'
  },
  ALERT: {
    icon: '🚨',
    name: 'Alert',
    color: 'red',
    description: 'Emergenze operative immediate'
  },
  MESSAGES: {
    icon: '💬',
    name: 'Messaggi',
    color: 'orange',
    description: 'Comunicazioni direzione/management'
  }
}

export type NotificationDto = Omit<Notification, 'timestamp'> & {
  timestamp: string
}

export function parseNotificationDto(row: NotificationDto): Notification {
  return {
    ...row,
    timestamp: new Date(row.timestamp),
  }
}

export function serializeNotification(n: Notification): NotificationDto {
  return {
    ...n,
    timestamp: n.timestamp.toISOString(),
  }
}

function dispatchNotificationsUpdated() {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications_updated'))
    }
  } catch {
    /* ignore */
  }
}

async function dismissNotificationById(notificationId: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    dispatchNotificationsUpdated()
  } catch {
    /* ignore */
  }
}

/** Crea notifica: POST /api/notifications (client) o persistenza DB (server). */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>
): Promise<Notification> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        userId: notification.userId,
        category: notification.category,
        isUrgent: notification.isUrgent,
        metadata: notification.metadata,
        actions: notification.actions,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(
        typeof data.error === 'string' ? data.error : 'Errore creazione notifica'
      )
    }
    const created = parseNotificationDto(data.notification as NotificationDto)
    dispatchNotificationsUpdated()

    if (notification.autoDismiss && notification.dismissAfter) {
      setTimeout(() => {
        void dismissNotificationById(created.id)
      }, notification.dismissAfter)
    }

    return created
  }

  const { persistNotification } = await import('@/lib/notifications-db')
  return persistNotification(notification)
}

// Funzioni helper per creare notifiche specifiche
export function createLeaveRequestNotification(employeeName: string, days: number, startDate: string, endDate: string): Promise<Notification> {
  return createNotification({
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Richiesta ferie in attesa',
    message: `${employeeName}: ${days} giorni dal ${startDate} al ${endDate}`,
    isUrgent: false,
    actions: [
      { label: 'Approva', action: 'approve_leave', variant: 'primary', icon: '✅' },
      { label: 'Rifiuta', action: 'reject_leave', variant: 'danger', icon: '❌' },
      { label: 'Dettagli', action: 'view_details', variant: 'secondary', icon: '👁️' }
    ],
    metadata: { employeeName, days, startDate, endDate }
  })
}

export function createLeaveProposalNotification(employeeName: string, startDate: string, endDate: string, comment?: string): Promise<Notification> {
  return createNotification({
    type: 'INFO',
    category: 'LEAVES',
    title: 'Nuova proposta ferie',
    message: `${employeeName}: proposta ${startDate} → ${endDate}${comment ? ` — ${comment}` : ''}`,
    isUrgent: false,
    actions: [
      { label: 'Accetta', action: 'accept_proposal', variant: 'primary', icon: '✅' },
      { label: 'Rifiuta', action: 'reject_proposal', variant: 'danger', icon: '❌' },
      { label: 'Dettagli', action: 'view_details', variant: 'secondary', icon: '👁️' }
    ],
    metadata: { employeeName, startDate, endDate, comment }
  })
}

export function createProposalAcceptedNotification(employeeName: string, startDate: string, endDate: string): Promise<Notification> {
  return createNotification({
    type: 'SUCCESS',
    category: 'LEAVES',
    title: 'Proposta accettata',
    message: `${employeeName}: ${startDate} → ${endDate}`,
    isUrgent: false,
    metadata: { employeeName, startDate, endDate }
  })
}

export function createProposalRejectedNotification(employeeName: string, reason?: string): Promise<Notification> {
  return createNotification({
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Proposta rifiutata',
    message: `${employeeName}${reason ? ` — ${reason}` : ''}`,
    isUrgent: false,
    metadata: { employeeName, reason }
  })
}

export function createShiftCoverageNotification(shiftDate: string, shiftTime: string, department: string, reason: string): Promise<Notification> {
  return createNotification({
    type: 'URGENT',
    category: 'SHIFTS',
    title: 'Turno scoperto',
    message: `${shiftDate} ${shiftTime} - ${department}. Motivo: ${reason}`,
    isUrgent: true,
    actions: [
      { label: 'Trova Sostituto', action: 'find_replacement', variant: 'primary', icon: '🔍' },
      { label: 'Riorganizza', action: 'reorganize', variant: 'secondary', icon: '🔄' }
    ],
    metadata: { shiftDate, shiftTime, department, reason }
  })
}

export function createTipsCompletedNotification(amount: number, employeeCount: number, date: string): Promise<Notification> {
  return createNotification({
    type: 'SUCCESS',
    category: 'TIPS',
    title: 'Divisione mance completata',
    message: `${date}: ${formatEuro(amount)} divisi tra ${employeeCount} dipendenti`,
    isUrgent: false,
    actions: [
      { label: 'Visualizza', action: 'view_tips', variant: 'primary', icon: '👁️' },
      { label: 'Esporta PDF', action: 'export_pdf', variant: 'secondary', icon: '📄' }
    ],
    metadata: { amount, employeeCount, date }
  })
}

export function computeNotificationStats(notifications: Notification[]): {
  total: number
  unread: number
  urgent: number
  byType: Record<NotificationType, number>
  byCategory: Record<NotificationCategory, number>
} {
  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.isRead).length,
    urgent: notifications.filter((n) => n.isUrgent && !n.isRead).length,
    byType: {} as Record<NotificationType, number>,
    byCategory: {} as Record<NotificationCategory, number>,
  }

  Object.keys(NOTIFICATION_TYPES).forEach((type) => {
    stats.byType[type as NotificationType] = notifications.filter(
      (n) => n.type === type
    ).length
  })

  Object.keys(NOTIFICATION_CATEGORIES).forEach((category) => {
    stats.byCategory[category as NotificationCategory] = notifications.filter(
      (n) => n.category === category
    ).length
  })

  return stats
}

/** @deprecated Usare computeNotificationStats sulla lista caricata dall'API */
export function getNotificationStats(_userId?: string) {
  return computeNotificationStats([])
}

// Funzione per formattare timestamp
export function formatTimestamp(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Ora'
  if (minutes < 60) return `${minutes}m fa`
  if (hours < 24) return `${hours}h fa`
  if (days < 7) return `${days}g fa`
  
  return timestamp.toLocaleDateString('it-IT')
}
