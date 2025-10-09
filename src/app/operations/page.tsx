'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import OperationsBookings from '@/components/operations/Bookings'
import OperationsCustomers from '@/components/operations/Customers'
import OperationsSale from '@/components/operations/Sale'
import OperationsAnalytics from '@/components/operations/Analytics'
import OperationsReports from '@/components/operations/Reports'

export default function OperationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('bookings')
  const { canManageEmployees, can } = usePermissions()

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  const tabs = [
    { id: 'bookings', label: 'Prenotazioni', icon: '📅', roles: ['all'] },
    { id: 'customers', label: 'Clienti', icon: '👥', roles: ['all'] },
    { id: 'sale', label: 'Sale e Aree', icon: '🏢', roles: ['manager'] },
    { id: 'analytics', label: 'Analytics', icon: '📊', roles: ['manager'] },
    { id: 'reports', label: 'Report', icon: '📋', roles: ['manager'] }
  ]

  const visibleTabs = tabs.filter(tab => 
    tab.roles.includes('all') || 
    (tab.roles.includes('manager') && canManageEmployees())
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition text-lg mt-1"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">🏢 Operations</h1>
                <p className="text-gray-600 mt-2">Gestisci prenotazioni, clienti e analizza le performance del ristorante</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{session.user?.name}</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                {session.user?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 py-4 px-6 text-center font-medium text-sm
                      transition-all duration-200
                      ${activeTab === tab.id
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="text-xl mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'bookings' && <OperationsBookings />}
              {activeTab === 'customers' && <OperationsCustomers />}
              {activeTab === 'sale' && <OperationsSale />}
              {activeTab === 'analytics' && <OperationsAnalytics />}
              {activeTab === 'reports' && <OperationsReports />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
