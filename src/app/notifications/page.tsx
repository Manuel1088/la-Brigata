'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Notification,
  getNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  NOTIFICATION_CATEGORIES,
  formatTimestamp
} from '@/lib/notifications'

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState(getNotificationStats())

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    loadNotifications()
  }, [session, status, router])

  const loadNotifications = () => {
    const userId = (session?.user as any)?.id
    const allNotifications = getNotifications(userId)
    setNotifications(allNotifications)
    setStats(getNotificationStats(userId))
  }

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
    loadNotifications()
  }

  const handleMarkAllAsRead = () => {
    const userId = (session?.user as any)?.id
    const count = markAllAsRead(userId)
    if (count > 0) {
      loadNotifications()
    }
  }

  const handleDismiss = (notificationId: string) => {
    dismissNotification(notificationId)
    loadNotifications()
  }

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    router.push(`/notifications?filter=${newFilter}`)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔔</div>
          <div className="text-xl text-gray-700">Caricamento notifiche...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔔 Centro Notifiche</h1>
              <p className="text-gray-600 mt-2">Gestisci tutte le notifiche e comunicazioni</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filtri */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'all', label: 'Tutte', icon: '📋' },
                { id: 'unread', label: 'Non Lette', icon: '🔴' },
                { id: 'system', label: 'Sistema', icon: '⚙️' },
                { id: 'team', label: 'Team', icon: '👥' },
                { id: 'approvals', label: 'Approvazioni', icon: '✅' },
                { id: 'alerts', label: 'Avvisi', icon: '⚠️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleFilterChange(tab.id)}
                  className={`
                    ${filter === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  `}
                  aria-current={filter === tab.id ? 'page' : undefined}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Azioni rapide */}
        {stats.unread > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ✅ Segna tutte come lette ({stats.unread})
            </button>
          </div>
        )}

        {/* Lista Notifiche */}
        <div className="bg-white rounded-lg shadow">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Nessuna notifica
              </h3>
              <p className="text-gray-500 mb-6">
                Non hai notifiche al momento. Quando ci saranno aggiornamenti, li vedrai qui.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Torna alla Dashboard
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/30' : ''
                  } ${notification.isUrgent ? 'border-l-4 border-red-500' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 ${
                        notification.isUrgent ? 'animate-pulse' : ''
                      }`}>
                        <span className="text-2xl">📢</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`text-base font-semibold ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {notification.isUrgent && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              🚨 Urgente
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatTimestamp(notification.timestamp)}</span>
                          {notification.category && NOTIFICATION_CATEGORIES[notification.category] && (
                            <span>
                              {NOTIFICATION_CATEGORIES[notification.category].icon}{' '}
                              {NOTIFICATION_CATEGORIES[notification.category].name}
                            </span>
                          )}
                        </div>
                        
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Segna come letta
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      className="ml-4 text-gray-400 hover:text-gray-600"
                      title="Elimina notifica"
                    >
                      <span className="text-xl">✕</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
