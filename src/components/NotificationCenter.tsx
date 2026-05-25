'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Notification,
  NotificationType,
  NotificationCategory,
  parseNotificationDto,
  type NotificationDto,
  NOTIFICATION_TYPES,
  formatTimestamp,
} from '@/lib/notifications'
import { filterNotificationsByRole } from '@/lib/notifications-filter'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  userRole?: string
  department?: string
}

function computeStats(list: Notification[]) {
  const s = {
    total: list.length,
    unread: list.filter((n) => !n.isRead).length,
    urgent: list.filter((n) => n.isUrgent && !n.isRead).length,
    byType: {} as Record<NotificationType, number>,
    byCategory: {} as Record<NotificationCategory, number>,
  }
  ;(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'URGENT'] as NotificationType[]).forEach(
    (t) => {
      s.byType[t] = list.filter((n) => n.type === t).length
    }
  )
  ;(
    [
      'PERSONNEL',
      'LEAVES',
      'TIPS',
      'SHIFTS',
      'SYSTEM',
      'ALERT',
      'MESSAGES',
    ] as NotificationCategory[]
  ).forEach((c) => {
    s.byCategory[c] = list.filter((n) => n.category === c).length
  })
  return s
}

export function NotificationCenter({
  isOpen,
  onClose,
  userId,
  userRole = '',
  department = '',
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | NotificationCategory>(
    'all'
  )
  const [stats, setStats] = useState(computeStats([]))
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore caricamento')

      const rows = (data.notifications ?? []) as NotificationDto[]
      const parsed = rows.map(parseNotificationDto)
      const filtered = filterNotificationsByRole(
        parsed,
        userId,
        userRole,
        department
      )
      setNotifications(filtered)
      setStats(computeStats(filtered))
    } catch {
      setNotifications([])
      setStats(computeStats([]))
    } finally {
      setLoading(false)
    }
  }, [userId, userRole, department])

  useEffect(() => {
    if (isOpen) void loadNotifications()
  }, [isOpen, loadNotifications])

  useEffect(() => {
    const onUpdate = () => void loadNotifications()
    window.addEventListener('notifications_updated', onUpdate)
    return () => window.removeEventListener('notifications_updated', onUpdate)
  }, [loadNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        credentials: 'include',
      })
    } catch {
      /* ignore */
    }
    await loadNotifications()
    window.dispatchEvent(new CustomEvent('notifications_updated'))
  }

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead)
    await Promise.all(
      unread.map((n) =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH',
          credentials: 'include',
        })
      )
    )
    await loadNotifications()
    window.dispatchEvent(new CustomEvent('notifications_updated'))
  }

  const handleDismiss = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch {
      /* ignore */
    }
    await loadNotifications()
    window.dispatchEvent(new CustomEvent('notifications_updated'))
  }

  const handleAction = (notification: Notification, action: string) => {
    if (!notification.isRead) {
      void handleMarkAsRead(notification.id)
    }
    console.log('Azione notifica:', action, notification.metadata)
  }

  const filteredNotifications = notifications.filter((notification) => {
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
                soundEnabled
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
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

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Caricamento...</p>
        ) : filteredNotifications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessuna notifica.</p>
        ) : (
          <ul className="space-y-4">
            {filteredNotifications.map((notification) => {
              const typeConfig = NOTIFICATION_TYPES[notification.type]
              return (
                <li
                  key={notification.id}
                  className={`p-4 rounded-lg shadow-sm flex items-start justify-between border ${
                    notification.isRead ? 'bg-gray-50' : typeConfig.bgColor
                  } ${typeConfig.borderColor}`}
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
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {notification.actions.map((action) => (
                          <button
                            key={action.action}
                            type="button"
                            onClick={() =>
                              handleAction(notification, action.action)
                            }
                            className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.isUrgent && (
                      <span className="text-red-500 text-xs font-semibold">
                        URGENTE
                      </span>
                    )}
                    {!notification.isRead && (
                      <button
                        onClick={() => void handleMarkAsRead(notification.id)}
                        className="p-1 text-blue-500 hover:text-blue-700 rounded-full"
                        title="Marca come letta"
                      >
                        ✅
                      </button>
                    )}
                    <button
                      onClick={() => void handleDismiss(notification.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                      title="Elimina"
                    >
                      ✗
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={() => void handleMarkAllAsRead()}
            disabled={stats.unread === 0}
            className="text-sm text-gray-700 hover:text-gray-900 disabled:opacity-40"
          >
            Marcare tutte come lette
          </button>
          <p className="text-xs text-gray-500">{stats.total} notifiche totali</p>
        </div>
      </div>
    </div>
  )
}
