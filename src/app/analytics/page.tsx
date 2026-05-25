'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import AnalyticsDashboard from '@/components/analytics/Dashboard'
import AnalyticsOperations from '@/components/analytics/Operations'
import AnalyticsPredictions from '@/components/analytics/Predictions'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'dashboard'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  const { 
    canViewAdvancedReports,
    canViewAnalytics,
    canViewPredictions,
    canExportReports
  } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canViewAnalytics()) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, canViewAnalytics])

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'dashboard')
  }, [searchParams])

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: '📊', 
      component: AnalyticsDashboard,
      permission: canViewAnalytics()
    },
    { 
      id: 'operations', 
      label: 'Operazioni', 
      icon: '⚙️', 
      component: AnalyticsOperations,
      permission: canViewAdvancedReports()
    },
    { 
      id: 'predictions', 
      label: 'Previsioni', 
      icon: '🔮', 
      component: AnalyticsPredictions,
      permission: canViewPredictions()
    }
  ]

  const visibleTabs = tabs.filter(tab => tab.permission)

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.push(`/analytics?tab=${tabId}`)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📈</div>
          <div className="text-xl text-gray-700">Caricamento analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📈 Analytics Avanzate</h1>
              <p className="text-gray-600 mt-2">Analisi predittive e business intelligence</p>
            </div>

            <div className="flex items-center gap-4">
              {canExportReports() && (
                <button
                  onClick={() => {
                    // Implementa export analytics
                    console.log('Export all analytics')
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  📤 Esporta Analytics
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  `}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {visibleTabs.map((tab) => (
              <div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
                <tab.component />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
