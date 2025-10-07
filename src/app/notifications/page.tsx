'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import NotificationCenter from '@/components/NotificationCenter'

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  
  const { canViewNotifications } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔔 Centro Notifiche</h1>
              <p className="text-gray-600 mt-2">Gestisci tutte le notifiche e comunicazioni</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg">
                <div className="text-sm font-medium">Comunicazioni</div>
                <div className="text-lg font-bold">Notifiche</div>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                ← Torna Dashboard
              </button>
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

        {/* Centro Notifiche */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <NotificationCenter filter={filter} />
          </div>
        </div>
      </main>
    </div>
  )
}
