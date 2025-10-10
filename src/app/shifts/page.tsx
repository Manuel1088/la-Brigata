'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import ShiftsCalendar from '@/components/shifts/Calendar'
import ShiftsSwaps from '@/components/shifts/Swaps'
import ShiftsAvailability from '@/components/shifts/Availability'
import ShiftsRules from '@/components/shifts/Rules'
import ShiftsHistory from '@/components/shifts/History'

export default function ShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('calendar')
  const { canManageEmployees } = usePermissions()
  
  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  const tabs = [
    { id: 'calendar', label: 'Il Mio Calendario', icon: '📅', roles: ['all'] },
    { id: 'swaps', label: 'Scambi', icon: '🔄', roles: ['all'] },
    { id: 'availability', label: 'Disponibilità', icon: '✅', roles: ['manager'] },
    { id: 'rules', label: 'Regole Riposo', icon: '😴', roles: ['manager'] },
    { id: 'history', label: 'Storico', icon: '📜', roles: ['manager'] }
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📅 Gestione Turni</h1>
                <p className="text-gray-600 mt-2">Organizza e gestisci i turni del tuo team</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          
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
              {activeTab === 'calendar' && <ShiftsCalendar />}
              {activeTab === 'swaps' && <ShiftsSwaps />}
              {activeTab === 'availability' && <ShiftsAvailability />}
              {activeTab === 'rules' && <ShiftsRules />}
              {activeTab === 'history' && <ShiftsHistory />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}