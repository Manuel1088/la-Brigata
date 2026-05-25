'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import SettingsPreferences from '@/components/settings/Preferences'
import SettingsSecurity from '@/components/settings/Security'
import SettingsNotifications from '@/components/settings/Notifications'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'preferences'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  const { 
    canEditPersonal,
    canManageSettings
  } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'preferences')
  }, [searchParams])

  const tabs = [
    { 
      id: 'preferences', 
      label: 'Preferenze', 
      icon: '⚙️', 
      component: SettingsPreferences,
      permission: canEditPersonal()
    },
    { 
      id: 'security', 
      label: 'Sicurezza', 
      icon: '🔒', 
      component: SettingsSecurity,
      permission: canEditPersonal()
    },
    { 
      id: 'notifications', 
      label: 'Notifiche', 
      icon: '🔔', 
      component: SettingsNotifications,
      permission: canEditPersonal()
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
    router.push(`/settings?tab=${tabId}`)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <div className="text-xl text-gray-700">Caricamento impostazioni...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">⚙️ Impostazioni</h1>
              <p className="text-gray-600 mt-2">Gestisci le tue preferenze e configurazioni</p>
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
