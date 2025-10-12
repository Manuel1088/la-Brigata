'use client'
import { useState, useEffect } from 'react'
import { 
  Notification, 
  NotificationType, 
  NotificationCategory,
  getNotifications,
  getUnreadCount,
  getUrgentCount,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  formatTimestamp
} from '@/lib/notifications'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  userRole?: string
  department?: string
}

export function NotificationCenter({ isOpen, onClose, userId, userRole, department }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | NotificationCategory>('all')
  const [stats, setStats] = useState({ total: 0, unread: 0, urgent: 0, byType: {} as Record<NotificationType, number>, byCategory: {} as Record<NotificationCategory, number> })
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [userId])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, userId])

  // Rimuovo la logica del click outside dato che non c'è più l'overlay

  const computeStats = (list: Notification[]) => {
    const s = {
      total: list.length,
      unread: list.filter(n => !n.isRead).length,
      urgent: list.filter(n => n.isUrgent && !n.isRead).length,
      byType: {} as Record<NotificationType, number>,
      byCategory: {} as Record<NotificationCategory, number>
    }
    ;(['INFO','SUCCESS','WARNING','ERROR','URGENT'] as NotificationType[]).forEach(t => { s.byType[t] = list.filter(n => n.type === t).length })
    ;(['PERSONNEL','LEAVES','TIPS','SHIFTS','SYSTEM','ALERT','MESSAGES'] as NotificationCategory[]).forEach(c => { s.byCategory[c] = list.filter(n => n.category === c).length })
    return s
  }

  const loadNotifications = () => {
    const allNotifications = getNotifications(userId)
    // Ruolo/reparto: filtro semplice
    const dept = (department || '').toLowerCase()
    const role = (userRole || '').toUpperCase()
    const filteredByRole = allNotifications.filter(n => {
      // Se la notifica è indirizzata a un utente specifico, mostra solo a lui
      if (n.userId && userId && n.userId !== userId) return false
      // Proprietario/Manager/Direttore vedono tutto; se c'è reparto, filtra SHIFTS per reparto
      if (['PROPRIETARIO','MANAGER','DIRETTORE','ADMIN'].includes(role)) {
        if (n.category === 'SHIFTS' && n.metadata?.department) {
          return String(n.metadata.department).toLowerCase() === dept
        }
        return true
      }
      // Dipendenti: categorie ridotte e per reparto
      const allowedCategories: NotificationCategory[] = ['LEAVES','SHIFTS','TIPS','MESSAGES']
      if (!allowedCategories.includes(n.category)) return false
      if (n.metadata?.department) {
        return String(n.metadata.department).toLowerCase() === dept
      }
      return true
    })
    setNotifications(filteredByRole)
    setStats(computeStats(filteredByRole))
  }

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
    loadNotifications()
    try { window.dispatchEvent(new CustomEvent('notifications_updated')) } catch {}
  }

  const handleMarkAllAsRead = () => {
    const count = markAllAsRead(userId)
    if (count > 0) {
      loadNotifications()
      try { window.dispatchEvent(new CustomEvent('notifications_updated')) } catch {}
    }
  }

  const handleDismiss = (notificationId: string) => {
    dismissNotification(notificationId)
    loadNotifications()
    try { window.dispatchEvent(new CustomEvent('notifications_updated')) } catch {}
  }

  const handleAction = (notification: Notification, action: string) => {
    // Marca come letta quando si esegue un'azione
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }

    // Esegui l'azione specifica
    switch (action) {
      case 'approve_leave':
        console.log('Approva richiesta ferie:', notification.metadata)
        // Qui andrà l'integrazione con il sistema ferie
        break
      case 'reject_leave':
        console.log('Rifiuta richiesta ferie:', notification.metadata)
        break
      case 'find_replacement':
        console.log('Trova sostituto per turno:', notification.metadata)
        break
      case 'view_details':
        console.log('Visualizza dettagli:', notification.metadata)
        break
      case 'export_pdf':
        console.log('Esporta PDF:', notification.metadata)
        break
      default:
        console.log('Azione non implementata:', action)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead
      case 'urgent':
        return notification.isUrgent && !notification.isRead
      case 'all':
        return true
      default:
        return notification.category === filter
    }
  })

  if (!isOpen) return null

  return (
    <div className="bg-white w-full max-w-md h-full shadow-xl overflow-hidden border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">🔔 Notifiche</h2>
              <p className="text-sm text-gray-600">
                {stats.unread} non lette • {stats.urgent} urgenti
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg ${
                  soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}
                title={soundEnabled ? 'Suoni attivi' : 'Suoni disattivati'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tutte ({stats.total})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filter === 'unread'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non lette ({stats.unread})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filter === 'urgent'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Urgenti ({stats.urgent})
            </button>
          </div>
        </div>

        {/* Lista notifiche */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredNotifications.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nessuna notifica trovata.
            </p>
          ) : (
            <ul className="space-y-4">
              {filteredNotifications.map(notification => (
                <li
                  key={notification.id}
                  className="bg-gray-50 p-4 rounded-lg shadow-sm flex items-start justify-between"
                >
                  <div className="flex-1 mr-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.isUrgent && (
                      <span className="text-red-500 text-xs font-semibold">URGENTE</span>
                    )}
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1 text-blue-500 hover:text-blue-700 rounded-full"
                        title="Marca come letta"
                      >
                        ✅
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                      title="Dismiss"
                    >
                      ✗
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Marcare tutte come lette
            </button>
            <p className="text-xs text-gray-500">
              {stats.total} notifiche totali
            </p>
          </div>
        </div>
    </div>
  )
}