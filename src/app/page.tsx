'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (session) {
      router.replace('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-5">
            <img src="/laBrigata.it.svg" alt="La Brigata" className="h-20 w-auto shrink-0" />
            <span className="font-bold text-gray-900">La Brigata</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Gestione digitale per la ristorazione italiana
          </p>

          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Accesso Sistema</h2>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg hover:from-orange-700 hover:to-red-700 transition font-medium"
                >
                  🔐 Accedi
                </button>

                <button
                  onClick={() => router.push('/register')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium"
                >
                  ✨ Registrati
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Per ristoratori, dipendenti e candidati
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mt-16 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="font-semibold">Gestione Turni</h3>
            <p className="text-sm text-gray-600">AI ottimizzata</p>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-semibold">Mance Digitali</h3>
            <p className="text-sm text-gray-600">Distribuzione automatica</p>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-4">🏖️</div>
            <h3 className="font-semibold">Ferie & Permessi</h3>
            <p className="text-sm text-gray-600">Workflow digitale</p>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold">Reports</h3>
            <p className="text-sm text-gray-600">Analytics avanzate</p>
          </div>
        </div>
      </div>
    </div>
  )
}
