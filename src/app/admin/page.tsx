'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminRestaurantsGrid from '@/components/admin/RestaurantsGrid'
import AdminUsers from '@/components/admin/Users'
import AdminPermissions from '@/components/admin/Permissions'
import AdminAudit from '@/components/admin/Audit'

type MainView = 'restaurants' | 'users' | 'tools'
type ToolsTab = 'permissions' | 'audit'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const toolsTab = (searchParams.get('tools') as ToolsTab) || 'permissions'

  const [mainView, setMainView] = useState<MainView>(
    viewParam === 'users' ? 'users' : viewParam === 'tools' ? 'tools' : 'restaurants'
  )

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    const userRole = session.user?.role
    const userLevel = session.user?.level
    if (userRole !== 'ADMIN' || userLevel !== 11) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    const v = searchParams.get('view')
    if (v === 'users') setMainView('users')
    else if (v === 'tools') setMainView('tools')
    else setMainView('restaurants')
  }, [searchParams])

  const setView = (view: MainView, tools?: ToolsTab) => {
    setMainView(view)
    const params = new URLSearchParams()
    params.set('view', view)
    if (view === 'tools' && tools) params.set('tools', tools)
    router.push(`/admin?${params.toString()}`)
  }

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="text-8xl mb-6">🚫</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Accesso Negato</h2>
          <p className="text-lg text-gray-600 mb-6">
            Solo il Super Admin può accedere a questa area.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            ← Dashboard
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
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Admin Piattaforma</h1>
              <p className="text-gray-600 mt-1">Gestione ristoranti e utenti La Brigata</p>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-3" aria-label="Viste principali">
            <button
              type="button"
              onClick={() => setView('restaurants')}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                mainView === 'restaurants'
                  ? 'bg-orange-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏨 Vista Ristoranti
            </button>
            <button
              type="button"
              onClick={() => setView('users')}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                mainView === 'users'
                  ? 'bg-orange-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 Vista Utenti
            </button>
            <button
              type="button"
              onClick={() => setView('tools', 'permissions')}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                mainView === 'tools'
                  ? 'bg-gray-800 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⚙️ Strumenti
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          {mainView === 'restaurants' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Tutti i ristoranti</h2>
              <AdminRestaurantsGrid />
            </>
          )}

          {mainView === 'users' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ricerca utenti globale</h2>
              <AdminUsers globalSearch />
            </>
          )}

          {mainView === 'tools' && (
            <div>
              <div className="flex gap-4 border-b border-gray-200 mb-6">
                <button
                  type="button"
                  onClick={() => setView('tools', 'permissions')}
                  className={`pb-2 text-sm font-medium border-b-2 ${
                    toolsTab === 'permissions'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  🔐 Permessi
                </button>
                <button
                  type="button"
                  onClick={() => setView('tools', 'audit')}
                  className={`pb-2 text-sm font-medium border-b-2 ${
                    toolsTab === 'audit'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  📋 Audit
                </button>
              </div>
              {toolsTab === 'permissions' ? <AdminPermissions /> : <AdminAudit />}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
