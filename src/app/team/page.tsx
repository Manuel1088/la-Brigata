'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { canManageRestaurantStaff } from '@/lib/employee-create'
import TeamEmployees from '@/components/team/Employees'
import TeamAccess from '@/components/team/Access'

function TeamPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('employees')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { canAccessAdmin } = usePermissions()
  const canManageTeam = canManageRestaurantStaff(session?.user?.role)

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
    } else if (searchParams.get('invited') === '1') {
      const email = searchParams.get('email')
        ? decodeURIComponent(searchParams.get('email')!)
        : 'il dipendente'
      const emailSent = searchParams.get('emailSent') === '1'
      setSuccessMessage(
        emailSent
          ? `✅ Invito inviato a ${email}`
          : `✅ Invito creato per ${email} (email non configurata — condividi il link manualmente)`
      )
      window.dispatchEvent(new CustomEvent('employees_updated'))
      window.dispatchEvent(new CustomEvent('invites_updated'))
      router.replace('/team?tab=employees')
    }
  }, [searchParams, router])

  const tabs = [
    { 
      id: 'employees', 
      label: 'Team', 
      icon: '👥', 
      component: TeamEmployees,
      permission: canManageTeam
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

  if (!canManageTeam && !canAccessAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso negato</h2>
          <p className="text-gray-600 mb-4">
            Solo titolari, direttori e manager possono gestire il team.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
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
