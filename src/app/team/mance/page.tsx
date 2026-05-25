'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import TipsInsert from '@/components/tips/Insert'
import TipsManage from '@/components/tips/Manage'

export default function TeamMancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('insert')
  const { canManageEmployees } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    // Solo manager possono accedere
    if (!canManageEmployees()) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, canManageEmployees])

  const tabs = [
    { id: 'insert', label: 'Inserisci Mance', icon: '➕' },
    { id: 'manage', label: 'Gestione & Divisione', icon: '⚙️' }
  ]

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session || !canManageEmployees()) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💰 Mance Team</h1>
            <p className="text-gray-600 mt-2">
              Gestisci mance giornaliere, parciali 15 giorni e divisione punti
            </p>
          </div>
        </div>
      </header>

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

            {/* Tab Content - Solo tab manager */}
            <div className="p-6">
              {activeTab === 'insert' && <TipsInsert />}
              {activeTab === 'manage' && <TipsManage />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

