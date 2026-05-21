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

/** Store in-memory solo per notifiche create in sessione; la UI legge da GET /api/notifications */
const notificationStore: Notification[] = []

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

export function getNotifications(userId?: string): Notification[] {
  if (userId) {
    return notificationStore.filter((n) => !n.userId || n.userId === userId)
  }
  return [...notificationStore]
}

export function getUnreadCount(userId?: string): number {
  return getNotifications(userId).filter(n => !n.isRead).length
}

export function getUrgentCount(userId?: string): number {
  return getNotifications(userId).filter(n => n.isUrgent && !n.isRead).length
}

export function getNotificationsByCategory(category: NotificationCategory, userId?: string): Notification[] {
  return getNotifications(userId).filter(n => n.category === category)
}

export function getNotificationsByType(type: NotificationType, userId?: string): Notification[] {
  return getNotifications(userId).filter(n => n.type === type)
}

// Funzioni per gestire le notifiche
export function markAsRead(notificationId: string): boolean {
  const notification = notificationStore.find((n) => n.id === notificationId)
  if (notification) {
    notification.isRead = true
    return true
  }
  return false
}

export function markAllAsRead(userId?: string): number {
  const notifications = getNotifications(userId)
  let count = 0
  notifications.forEach(n => {
    if (!n.isRead) {
      n.isRead = true
      count++
    }
  })
  return count
}

export function dismissNotification(notificationId: string): boolean {
  const index = notificationStore.findIndex((n) => n.id === notificationId)
  if (index !== -1) {
    notificationStore.splice(index, 1)
    return true
  }
  return false
}

// Funzioni per creare notifiche
export function createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Notification {
  const newNotification: Notification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    isRead: false
  }
  
  notificationStore.unshift(newNotification)
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications_updated'))
    }
  } catch {
    /* ignore */
  }
  
  // Auto-dismiss se configurato
  if (newNotification.autoDismiss && newNotification.dismissAfter) {
    setTimeout(() => {
      dismissNotification(newNotification.id)
    }, newNotification.dismissAfter)
  }
  
  return newNotification
}

// Funzioni helper per creare notifiche specifiche
export function createLeaveRequestNotification(employeeName: string, days: number, startDate: string, endDate: string): Notification {
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

export function createLeaveProposalNotification(employeeName: string, startDate: string, endDate: string, comment?: string): Notification {
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

export function createProposalAcceptedNotification(employeeName: string, startDate: string, endDate: string): Notification {
  return createNotification({
    type: 'SUCCESS',
    category: 'LEAVES',
    title: 'Proposta accettata',
    message: `${employeeName}: ${startDate} → ${endDate}`,
    isUrgent: false,
    metadata: { employeeName, startDate, endDate }
  })
}

export function createProposalRejectedNotification(employeeName: string, reason?: string): Notification {
  return createNotification({
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Proposta rifiutata',
    message: `${employeeName}${reason ? ` — ${reason}` : ''}`,
    isUrgent: false,
    metadata: { employeeName, reason }
  })
}

export function createShiftCoverageNotification(shiftDate: string, shiftTime: string, department: string, reason: string): Notification {
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

export function createTipsCompletedNotification(amount: number, employeeCount: number, date: string): Notification {
  return createNotification({
    type: 'SUCCESS',
    category: 'TIPS',
    title: 'Divisione mance completata',
    message: `${date}: €${amount.toFixed(2)} divisi tra ${employeeCount} dipendenti`,
    isUrgent: false,
    actions: [
      { label: 'Visualizza', action: 'view_tips', variant: 'primary', icon: '👁️' },
      { label: 'Esporta PDF', action: 'export_pdf', variant: 'secondary', icon: '📄' }
    ],
    metadata: { amount, employeeCount, date }
  })
}

// Funzioni per filtri e statistiche
export function getNotificationStats(userId?: string): {
  total: number
  unread: number
  urgent: number
  byType: Record<NotificationType, number>
  byCategory: Record<NotificationCategory, number>
} {
  const notifications = getNotifications(userId)
  
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    urgent: notifications.filter(n => n.isUrgent && !n.isRead).length,
    byType: {} as Record<NotificationType, number>,
    byCategory: {} as Record<NotificationCategory, number>
  }
  
  // Conta per tipo
  Object.keys(NOTIFICATION_TYPES).forEach(type => {
    stats.byType[type as NotificationType] = notifications.filter(n => n.type === type).length
  })
  
  // Conta per categoria
  Object.keys(NOTIFICATION_CATEGORIES).forEach(category => {
    stats.byCategory[category as NotificationCategory] = notifications.filter(n => n.category === category).length
  })
  
  return stats
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
