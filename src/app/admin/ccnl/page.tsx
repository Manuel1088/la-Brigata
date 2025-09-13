'use client'

import { useRouter } from 'next/navigation'
import { PermissionGuard } from '@/components/PermissionGuard'
import { CCNLManagement } from '@/components/CCNLManagement'

export default function CCNLPage() {
  const router = useRouter()
  return (
    <PermissionGuard permissions={['admin_settings']}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">⚖️ CCNL Turismo</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <CCNLManagement />
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}


