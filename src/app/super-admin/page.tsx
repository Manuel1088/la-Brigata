'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SuperAdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalRestaurants: 0,
    pendingEmployments: 0
  })

  useEffect(() => {
    // Verifica che l'utente sia ADMIN (livello 11)
    const userRole = (session?.user as any)?.role
    const userLevel = (session?.user as any)?.level
    
    if (userRole !== 'ADMIN' || userLevel !== 11) {
      router.push('/dashboard')
      return
    }

    loadStats()
  }, [session, router])

  const loadStats = async () => {
    try {
      // TODO: Implementare API per statistiche globali
      setStats({
        totalCompanies: 12,
        totalUsers: 156,
        totalRestaurants: 18,
        pendingEmployments: 5
      })
    } catch (error) {
      console.error('Errore caricamento stats:', error)
    }
  }

  const userRole = (session?.user as any)?.role
  const userLevel = (session?.user as any)?.level

  // Redirect se non ADMIN
  if (userRole !== 'ADMIN' || userLevel !== 11) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">Solo il Super Admin può accedere a questa pagina</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-6xl">🛡️</div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Super Admin Panel</h1>
            <p className="text-lg text-gray-600">Gestione avanzata del sistema La Brigata</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="font-semibold text-yellow-900">Attenzione - Area Riservata</p>
              <p className="text-sm text-yellow-700">
                Queste funzioni sono disponibili SOLO per il Super Admin e possono avere impatto su tutte le aziende del sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche Globali */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Statistiche Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-4xl mb-2">🏢</div>
            <div className="text-3xl font-bold">{stats.totalCompanies}</div>
            <div className="text-blue-100">Aziende Totali</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <div className="text-green-100">Utenti Totali</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-3xl font-bold">{stats.totalRestaurants}</div>
            <div className="text-purple-100">Ristoranti</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-4xl mb-2">⏳</div>
            <div className="text-3xl font-bold">{stats.pendingEmployments}</div>
            <div className="text-orange-100">Richieste Pending</div>
          </div>
        </div>
      </div>

      {/* Funzioni Esclusive Super Admin */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛡️ Funzioni Esclusive Super Admin</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Gestione Multi-Azienda */}
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 hover:border-blue-400 transition">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">🏢</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Gestione Aziende</h3>
                <p className="text-sm text-gray-600">Vista cross-company</p>
              </div>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/admin/companies')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                📋 Visualizza Tutte le Aziende
              </button>
              <button 
                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                🗑️ Elimina Azienda (Solo Admin)
              </button>
            </div>
          </div>

          {/* Audit Multi-Azienda */}
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 hover:border-green-400 transition">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">📊</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Audit Completo</h3>
                <p className="text-sm text-gray-600">Tutte le aziende</p>
              </div>
            </div>
            <div className="space-y-2">
              <button 
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                📈 Audit Cross-Company
              </button>
              <button 
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                🔍 Tracciamento Globale
              </button>
            </div>
          </div>

          {/* Configurazione Sistema */}
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 hover:border-purple-400 transition">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">⚙️</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Config Sistema</h3>
                <p className="text-sm text-gray-600">Impostazioni critiche</p>
              </div>
            </div>
            <div className="space-y-2">
              <button 
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                🔧 Configurazioni Globali
              </button>
              <button 
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                🗄️ Gestione Database
              </button>
            </div>
          </div>

          {/* Gestione Permessi */}
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 hover:border-orange-400 transition">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">🔐</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Override Permessi</h3>
                <p className="text-sm text-gray-600">Controllo totale</p>
              </div>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/admin/permissions')}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                🎯 Modifica Permessi Utenti
              </button>
              <button 
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                ⚡ Reset Permessi Sistema
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Funzioni Disponibili Anche per Proprietario */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">👑 Funzioni Standard (Admin + Proprietario)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/admin/overview')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-left"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold">Panoramica</div>
          </button>
          <button 
            onClick={() => router.push('/admin/candidates')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-left"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold">Candidati</div>
          </button>
          <button 
            onClick={() => router.push('/admin/ccnl')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-left"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold">CCNL</div>
          </button>
        </div>
      </div>

      {/* Info Account */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🛡️</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {(session?.user as any)?.name}
            </h3>
            <p className="text-gray-700">
              Ruolo: <span className="font-semibold text-blue-600">SUPER ADMIN</span> (Livello 11)
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Hai accesso completo a tutte le funzionalità del sistema, incluse quelle riservate esclusivamente al Super Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

