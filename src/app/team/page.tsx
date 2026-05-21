'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import TeamEmployees from '@/components/team/Employees'
import TeamAccess from '@/components/team/Access'

function TeamPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('employees')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { 
    canManageEmployees, 
    canAccessAdmin
  } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'employees' || tab === 'access') {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('created') === '1') {
      const name = searchParams.get('name')
        ? decodeURIComponent(searchParams.get('name')!)
        : 'Il dipendente'
      const emailSent = searchParams.get('emailSent') === '1'
      setSuccessMessage(
        emailSent
          ? `✅ ${name} creato con successo. Email di accesso inviata.`
          : `✅ ${name} creato con successo. Password temporanea: Brigata2026!`
      )
      window.dispatchEvent(new CustomEvent('employees_updated'))
      router.replace('/team?tab=employees')
    }
  }, [searchParams, router])

  const tabs = [
    { 
      id: 'employees', 
      label: 'Team', 
      icon: '👥', 
      component: TeamEmployees,
      permission: canManageEmployees()
    },
    { 
      id: 'access', 
      label: 'Accessi', 
      icon: '🔐', 
      component: TeamAccess,
      permission: canAccessAdmin()
    }
  ]

  const visibleTabs = tabs.filter(tab => tab.permission)

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-700">Caricamento...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">👥 Gestione Team</h1>
              <p className="text-gray-600 mt-2">Gestisci dipendenti, ferie e controlli di accesso</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-900 text-sm flex justify-between items-start gap-4">
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-green-700 hover:text-green-900 shrink-0"
            >
              ×
            </button>
          </div>
        )}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Caricamento...
        </div>
      }
    >
      <TeamPageContent />
    </Suspense>
  )
}
