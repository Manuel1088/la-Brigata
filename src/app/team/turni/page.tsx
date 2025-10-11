'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import ShiftsCalendar from '@/components/shifts/Calendar'

export default function TeamTurniPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageEmployees } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    // Solo manager possono accedere
    if (!canManageEmployees()) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, canManageEmployees])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session || !canManageEmployees()) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.push('/team')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📅 Turni Team</h1>
              <p className="text-gray-600 mt-2">
                Gestisci e programma i turni di tutti i dipendenti
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Info Manager */}
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              👨‍💼 <strong>Vista Manager:</strong> Gestisci turni di tutti i dipendenti, filtra per reparto, genera automaticamente, rispetta CCNL
            </p>
          </div>

          {/* Calendario Team Completo */}
          <ShiftsCalendar />
          
          {/* Legenda */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              🔵 Turno Lavorativo | ⚪ Riposo | 🟢 Ferie | 🟣 Evento Aziendale
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

