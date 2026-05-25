'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import TipsOverview from '@/components/tips/Overview'
import TipsDaily from '@/components/tips/Daily'
import TipsHistory from '@/components/tips/History'

export default function TipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Solo tab personali per dipendenti
  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: '👁️' },
    { id: 'daily', label: 'Giornaliere', icon: '📅' },
    { id: 'history', label: 'Storico', icon: '📜' }
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

            {/* Tab Content - Solo tab personali */}
            <div className="p-6">
              {activeTab === 'overview' && <TipsOverview />}
              {activeTab === 'daily' && <TipsDaily />}
              {activeTab === 'history' && <TipsHistory />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
