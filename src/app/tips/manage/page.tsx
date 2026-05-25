'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TipsManagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📈 Gestione Mance</h1>
            <p className="text-gray-600 mt-2">Pagina placeholder per gestione e analisi mance</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 text-gray-700">
          Qui verranno aggiunti strumenti di analisi avanzata e gestione mance del team.
        </div>
      </main>
    </div>
  )
}


