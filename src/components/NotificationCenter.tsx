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
}

export function NotificationCenter({ isOpen, onClose, userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | NotificationCategory>('all')
  const [stats, setStats] = useState(getNotificationStats(userId))
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

  const loadNotifications = () => {
    const allNotifications = getNotifications(userId)
    setNotifications(allNotifications)
    setStats(getNotificationStats(userId))
  }

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
    loadNotifications()
  }

  const handleMarkAllAsRead = () => {
    const count = markAllAsRead(userId)
    if (count > 0) {
      loadNotifications()
    }
  }

  const handleDismiss = (notificationId: string) => {
    dismissNotification(notificationId)
    loadNotifications()
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
          
          {/* Filtri per categoria */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(NOTIFICATION_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setFilter(key as NotificationCategory)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  filter === key
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.icon} {category.name} ({stats.byCategory[key as NotificationCategory]})
              </button>
            ))}
          </div>
        </div>

        {/* Azioni rapide */}
        {stats.unread > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ✅ Segna tutte come lette
            </button>
          </div>
        )}

        {/* Lista notifiche */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'Nessuna notifica non letta' :
                 filter === 'urgent' ? 'Nessuna notifica urgente' :
                 'Nessuna notifica'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' ? 'Tutte le notifiche sono state lette' :
                 filter === 'urgent' ? 'Non ci sono notifiche urgenti' :
                 'Non ci sono notifiche in questa categoria'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const typeConfig = NOTIFICATION_TYPES[notification.type]
                const categoryConfig = NOTIFICATION_CATEGORIES[notification.category]
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    } ${notification.isUrgent ? 'border-l-4 border-red-500' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.isUrgent ? 'animate-pulse' : ''
                      }`}>
                        <span className="text-lg">{typeConfig.icon}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {notification.isUrgent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                🚨 Urgente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            <button
                              onClick={() => handleDismiss(notification.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {categoryConfig.icon} {categoryConfig.name}
                            </span>
                          </div>
                          
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Segna come letta
                            </button>
                          )}
                        </div>
                        
                        {/* Azioni */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleAction(notification, action.action)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  action.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                  action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                                  'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {action.icon && <span className="mr-1">{action.icon}</span>}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}
            </p>
          </div>
        </div>
    </div>
  )
}

export default NotificationCenter
