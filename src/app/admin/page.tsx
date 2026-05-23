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

  const viewTitle =
    mainView === 'users'
      ? 'Vista Utenti'
      : mainView === 'tools'
        ? 'Strumenti'
        : 'Vista Ristoranti'

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{viewTitle}</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Admin Piattaforma · La Brigata
          </p>
        </header>

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
              {toolsTab === 'permissions' ? <AdminPermissions /> : <AdminAudit />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
