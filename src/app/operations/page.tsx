'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import OperationsBookings from '@/components/operations/Bookings'
import OperationsCustomers from '@/components/operations/Customers'
import WalkinsReport from '@/components/operations/Walkins'

export default function OperationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('bookings')

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  const tabs = [
    { id: 'bookings', label: 'Prenotazioni', icon: '📅' },
    { id: 'customers', label: 'Clienti', icon: '👥' },
    { id: 'walkins', label: 'Passanti', icon: '🚶' }
  ]

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {tabs.map(tab => (
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
              {activeTab === 'walkins' && <WalkinsReport />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
