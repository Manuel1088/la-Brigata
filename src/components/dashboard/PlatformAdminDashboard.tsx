'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'

type PlatformStats = {
  restaurants: { total: number }
  users: { active: number; total: number }
  vat: {
    pendingReview: number
    anomalies: number
    pending: number
  }
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Failed to load stats')
    return res.json() as Promise<{ stats: PlatformStats }>
  })

type PlatformAdminDashboardProps = {
  userName?: string | null
}

export default function PlatformAdminDashboard({
  userName,
}: PlatformAdminDashboardProps) {
  const router = useRouter()
  const { data, isLoading, error } = useSWR('/api/admin/stats', fetcher, {
    revalidateOnFocus: true,
  })

  const stats = data?.stats
  const firstName = userName?.split(' ')[0] ?? 'Admin'

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🛡️</span>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
              La Brigata · Piattaforma
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-gray-600 mt-2 max-w-xl">
            Panoramica globale della piattaforma. Gestisci ristoranti, utenti e
            aggregazioni P.IVA.
          </p>
        </header>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-8">
            Impossibile caricare le statistiche piattaforma.
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Ristoranti registrati</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {isLoading ? '…' : stats?.restaurants.total ?? 0}
            </p>
            <p className="text-gray-400 text-xs mt-2">Su tutta la piattaforma</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Utenti attivi</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">
              {isLoading ? '…' : stats?.users.active ?? 0}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              {isLoading
                ? '…'
                : `${stats?.users.total ?? 0} totali registrati`}
            </p>
          </div>

          <div
            className={`rounded-2xl p-6 shadow-sm border ${
              (stats?.vat.pendingReview ?? 0) > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-white border-gray-100'
            }`}
          >
            <p className="text-gray-500 text-sm">P.IVA da revisionare</p>
            <p
              className={`text-4xl font-bold mt-2 ${
                (stats?.vat.pendingReview ?? 0) > 0
                  ? 'text-amber-600'
                  : 'text-gray-900'
              }`}
            >
              {isLoading ? '…' : stats?.vat.pendingReview ?? 0}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              {isLoading
                ? '…'
                : stats?.vat.anomalies
                  ? `${stats.vat.anomalies} anomalie · ${stats.vat.pending} in attesa`
                  : 'Nessuna anomalia'}
            </p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesso rapido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              type="button"
              onClick={() => router.push('/admin?view=restaurants')}
              className="group text-left bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-md hover:shadow-lg hover:scale-[1.01] transition"
            >
              <span className="text-3xl">🏨</span>
              <h3 className="text-xl font-bold text-white mt-3">Vista Ristoranti</h3>
              <p className="text-orange-100 text-sm mt-1">
                Griglia di tutti i ristoranti, abbonamenti e dettaglio dipendenti
              </p>
              <span className="inline-block mt-4 text-white font-medium text-sm group-hover:underline">
                Apri →
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin?view=users')}
              className="group text-left bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-md hover:shadow-lg hover:scale-[1.01] transition"
            >
              <span className="text-3xl">👥</span>
              <h3 className="text-xl font-bold text-white mt-3">Vista Utenti</h3>
              <p className="text-blue-100 text-sm mt-1">
                Ricerca globale per ruolo, ristorante e stato attivo
              </p>
              <span className="inline-block mt-4 text-white font-medium text-sm group-hover:underline">
                Apri →
              </span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin?view=tools&tools=permissions')}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-left hover:border-orange-300 hover:shadow-sm transition"
          >
            <span className="text-xl mr-2">🔐</span>
            <span className="text-gray-900 font-medium">Gestione permessi</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-left hover:border-orange-300 hover:shadow-sm transition"
          >
            <span className="text-xl mr-2">⚙️</span>
            <span className="text-gray-900 font-medium">Admin Panel</span>
          </button>
        </section>
      </div>
    </div>
  )
}
