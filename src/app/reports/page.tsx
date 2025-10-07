'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import ReportsFinancial from '@/components/reports/Financial'
import ReportsOperational from '@/components/reports/Operational'
import ReportsPersonnel from '@/components/reports/Personnel'
import ReportsAnalytics from '@/components/reports/Analytics'

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'financial'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  const { 
    canViewReports,
    canViewBasicReports,
    canViewAdvancedReports,
    canViewFinancialReports,
    canExportReports
  } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canViewReports()) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, canViewReports])

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'financial')
  }, [searchParams])

  const tabs = [
    { 
      id: 'financial', 
      label: 'Finanziari', 
      icon: '💰', 
      component: ReportsFinancial,
      permission: canViewFinancialReports()
    },
    { 
      id: 'operational', 
      label: 'Operativi', 
      icon: '📊', 
      component: ReportsOperational,
      permission: canViewBasicReports()
    },
    { 
      id: 'personnel', 
      label: 'Personale', 
      icon: '👥', 
      component: ReportsPersonnel,
      permission: canViewBasicReports()
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: '📈', 
      component: ReportsAnalytics,
      permission: canViewAdvancedReports()
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
    router.push(`/reports?tab=${tabId}`)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl text-gray-700">Caricamento reportistica...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">📊 Reportistica</h1>
              <p className="text-gray-600 mt-2">Analisi dettagliate e report avanzati</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg">
                <div className="text-sm font-medium">Analisi</div>
                <div className="text-lg font-bold">Reportistica</div>
              </div>
              
              {canExportReports() && (
                <button
                  onClick={() => {
                    // Implementa export di tutti i report
                    console.log('Export all reports')
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  📤 Esporta Tutto
                </button>
              )}
              
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition text-lg"
              >
                ←
              </button>
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
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  `}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="mr-2">{tab.icon}</span>
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
