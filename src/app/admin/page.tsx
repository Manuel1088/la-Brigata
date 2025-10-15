'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import AdminOverview from '@/components/admin/Overview'
import AdminUsers from '@/components/admin/Users'
import AdminCompanies from '@/components/admin/Companies'
import AdminCandidates from '@/components/admin/Candidates'
import AdminCCNL from '@/components/admin/CCNL'
import AdminPermissions from '@/components/admin/Permissions'
import AdminAudit from '@/components/admin/Audit'
import AdminSettings from '@/components/admin/Settings'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  const { 
    canAccessAdmin, 
    canManageUsers, 
    canManageCompanies, 
    canManageCandidates,
    canManageCCNL,
    canManageRoles,
    canViewAudit,
    canManageSettings 
  } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    // 🛡️ SOLO ADMIN (livello 11) può accedere
    const userRole = session.user?.role
    const userLevel = session.user?.level
    
    if (userRole !== 'ADMIN' || userLevel !== 11) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'overview')
  }, [searchParams])

  const tabs = [
    { 
      id: 'overview', 
      label: 'Panoramica', 
      icon: '📊', 
      component: AdminOverview,
      permission: canAccessAdmin()
    },
    { 
      id: 'users', 
      label: 'Utenti', 
      icon: '👥', 
      component: AdminUsers,
      permission: canManageUsers()
    },
    { 
      id: 'companies', 
      label: 'Aziende', 
      icon: '🏢', 
      component: AdminCompanies,
      permission: canManageCompanies()
    },
    { 
      id: 'candidates', 
      label: 'Candidati', 
      icon: '📝', 
      component: AdminCandidates,
      permission: canManageCandidates()
    },
    { 
      id: 'ccnl', 
      label: 'CCNL', 
      icon: '📋', 
      component: AdminCCNL,
      permission: canManageCCNL()
    },
    { 
      id: 'permissions', 
      label: 'Permessi', 
      icon: '🔐', 
      component: AdminPermissions,
      permission: canManageRoles()
    },
    { 
      id: 'audit', 
      label: 'Audit', 
      icon: '📋', 
      component: AdminAudit,
      permission: canViewAudit()
    },
    { 
      id: 'settings', 
      label: 'Impostazioni', 
      icon: '⚙️', 
      component: AdminSettings,
      permission: canManageSettings()
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
    router.push(`/admin?tab=${tabId}`)
  }

  // 🛡️ Controllo accesso ADMIN
  const userRole = session?.user?.role
  const userLevel = session?.user?.level
  const isAdmin = userRole === 'ADMIN' && userLevel === 11

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <div className="text-xl text-gray-700">Caricamento amministrazione...</div>
        </div>
      </div>
    )
  }

  // 🛡️ SOLO ADMIN (livello 11) può vedere questa pagina
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="text-8xl mb-6">🚫</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Accesso Negato</h2>
          <p className="text-lg text-gray-600 mb-6">
            Solo il <span className="font-bold text-blue-600">Super Admin</span> può accedere alla pagina di amministrazione.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Il tuo ruolo:</strong> {userRole} (Livello {userLevel})
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Richiesto:</strong> ADMIN (Livello 11)
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            ← Torna alla Dashboard
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">🛡️ Admin Panel</h1>
              <p className="text-gray-600 mt-2">Gestione completa del sistema La Brigata</p>
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
                      ? 'border-orange-500 text-orange-600'
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