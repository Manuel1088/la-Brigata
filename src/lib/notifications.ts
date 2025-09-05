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
  metadata?: Record<string, any>
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

// Mock data per notifiche realistiche del ristorante
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'URGENT',
    category: 'SHIFTS',
    title: 'Turno scoperto - Stasera',
    message: 'Anna si è ammalata. Turno 18:00-24:00 senza copertura',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minuti fa
    isRead: false,
    isUrgent: true,
    actions: [
      { label: 'Trova Sostituto', action: 'find_replacement', variant: 'primary', icon: '🔍' },
      { label: 'Chiama Staff', action: 'call_staff', variant: 'secondary', icon: '📞' }
    ],
    metadata: { shiftId: 'shift_123', department: 'sala' }
  },
  {
    id: '2',
    type: 'ERROR',
    category: 'SYSTEM',
    title: 'Errore sincronizzazione POS',
    message: 'POS sala disconnesso. Controllare connessione',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minuti fa
    isRead: false,
    isUrgent: false,
    actions: [
      { label: 'Riprova', action: 'retry_sync', variant: 'primary', icon: '🔄' },
      { label: 'Supporto Tecnico', action: 'tech_support', variant: 'secondary', icon: '🛠️' }
    ],
    metadata: { posId: 'pos_sala_1', errorCode: 'CONN_001' }
  },
  {
    id: '3',
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Richiesta ferie in attesa',
    message: 'Marco Rossi: 5 giorni dal 15-25 Marzo',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 ore fa
    isRead: false,
    isUrgent: false,
    actions: [
      { label: 'Approva', action: 'approve_leave', variant: 'primary', icon: '✅' },
      { label: 'Rifiuta', action: 'reject_leave', variant: 'danger', icon: '❌' },
      { label: 'Dettagli', action: 'view_details', variant: 'secondary', icon: '👁️' }
    ],
    metadata: { requestId: 'leave_456', employeeId: 'emp_marco' }
  },
  {
    id: '4',
    type: 'SUCCESS',
    category: 'TIPS',
    title: 'Divisione mance completata',
    message: '14 Gennaio: €247.50 divisi tra 8 dipendenti',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 ore fa
    isRead: true,
    isUrgent: false,
    actions: [
      { label: 'Visualizza', action: 'view_tips', variant: 'primary', icon: '👁️' },
      { label: 'Esporta PDF', action: 'export_pdf', variant: 'secondary', icon: '📄' }
    ],
    metadata: { date: '2024-01-14', totalAmount: 247.50, employeeCount: 8 }
  },
  {
    id: '5',
    type: 'INFO',
    category: 'PERSONNEL',
    title: 'Nuovo dipendente aggiunto',
    message: 'Sofia Bianchi è stata aggiunta al team cucina',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 ore fa
    isRead: true,
    isUrgent: false,
    actions: [
      { label: 'Visualizza Profilo', action: 'view_profile', variant: 'primary', icon: '👤' }
    ],
    metadata: { employeeId: 'emp_sofia', department: 'cucina' }
  },
  {
    id: '6',
    type: 'WARNING',
    category: 'LEAVES',
    title: 'Scadenza ferie prossima',
    message: 'Giuseppe ha solo 3 giorni ferie rimanenti',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 ore fa
    isRead: false,
    isUrgent: false,
    actions: [
      { label: 'Gestisci Saldi', action: 'manage_balance', variant: 'primary', icon: '💳' }
    ],
    metadata: { employeeId: 'emp_giuseppe', remainingDays: 3 }
  },
  {
    id: '7',
    type: 'URGENT',
    category: 'ALERT',
    title: 'Allarme sicurezza attivato',
    message: 'Sensore movimento rilevato dopo chiusura',
    timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minuto fa
    isRead: false,
    isUrgent: true,
    actions: [
      { label: 'Controlla Telecamere', action: 'check_cameras', variant: 'primary', icon: '📹' },
      { label: 'Chiama Sicurezza', action: 'call_security', variant: 'danger', icon: '🚨' }
    ],
    metadata: { sensorId: 'motion_001', location: 'ingresso_principale' }
  },
  {
    id: '8',
    type: 'SUCCESS',
    category: 'SYSTEM',
    title: 'Backup completato',
    message: 'Backup automatico database completato con successo',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 ore fa
    isRead: true,
    isUrgent: false,
    metadata: { backupSize: '2.3GB', duration: '15min' }
  }
]

// Funzioni di utilità
export function getNotifications(userId?: string): Notification[] {
  if (userId) {
    return mockNotifications.filter(n => !n.userId || n.userId === userId)
  }
  return mockNotifications
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
  const notification = mockNotifications.find(n => n.id === notificationId)
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
  const index = mockNotifications.findIndex(n => n.id === notificationId)
  if (index !== -1) {
    mockNotifications.splice(index, 1)
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
  
  mockNotifications.unshift(newNotification) // Aggiungi all'inizio
  
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
