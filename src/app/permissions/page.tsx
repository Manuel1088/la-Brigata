'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import CategoryPermissionsManager from '@/components/permissions/CategoryPermissionsManager'
import { usePermissions } from '@/hooks/usePermissions'

export default function PermissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManagePermissionCategories } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canManagePermissionCategories()) {
      router.push('/dashboard')
    }
  }, [session, status, router, canManagePermissionCategories])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Caricamento...</div>
      </div>
    )
  }

  if (!canManagePermissionCategories()) {
    return null
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestione permessi</h1>
              <p className="text-gray-600 mt-2">
                Assegna categorie di permesso per reparto e livello CCNL
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <CategoryPermissionsManager />
        </div>
      </main>
    </div>
  )
}
