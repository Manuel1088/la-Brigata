'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface RecentCompany { id: string; name: string; restaurantName: string; ownerName: string; createdAt: string }
interface RecentUser { id: string; name: string; email: string; role: string; companyName?: string; createdAt: string }
interface AdminStats {
  totalUsers: number
  activeUsers: number
  activeRestaurants: number
  totalCompanies: number
  pendingCandidates: number
  totalRestaurants: number
  totalLogs: number
  recentCompanies: RecentCompany[]
  recentUsers: RecentUser[]
  companyGrowth: string
  userGrowth: string
  recentActivities?: Array<{ icon: string; action: string; user: string; time: string }>
}

export default function AdminOverview() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Fetch dati reali dal database
        const response = await fetch('/api/admin/stats')
        const data = await response.json() as {
          success: boolean
          stats: {
            users: { total: number; active: number; growth: string }
            companies: { total: number; active: number; growth: string }
            candidates: { pending: number }
            restaurants: { total: number; active: number }
          }
          recent: { companies: RecentCompany[]; users: RecentUser[] }
        }
        
        if (data.success) {
          // Mappa dati per il componente
          setStats({
            totalUsers: data.stats.users.total,
            activeUsers: data.stats.users.active,
            activeRestaurants: data.stats.restaurants.active,
            totalCompanies: data.stats.companies.total,
            pendingCandidates: data.stats.candidates.pending,
            totalRestaurants: data.stats.restaurants.total,
            totalLogs: 0, // TODO: implementare log tracking
            recentCompanies: data.recent.companies,
            recentUsers: data.recent.users,
            companyGrowth: data.stats.companies.growth,
            userGrowth: data.stats.users.growth
          })
        }
      } catch (error) {
        console.error('Errore nel caricamento statistiche:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const quickActions = [
    {
      title: 'Gestione Utenti',
      description: 'Visualizza e gestisci tutti gli utenti del sistema',
      icon: '👥',
      color: 'bg-blue-500',
      action: () => router.push('/admin?tab=users')
    },
    {
      title: 'Gestione Aziende',
      description: 'Monitora e gestisci le aziende registrate',
      icon: '🏢',
      color: 'bg-green-500',
      action: () => router.push('/admin?tab=companies')
    },
    {
      title: 'Gestione Candidati',
      description: 'Gestisci le candidature e gli utenti in attesa',
      icon: '📝',
      color: 'bg-yellow-500',
      action: () => router.push('/admin?tab=candidates')
    },
    {
      title: 'Controllo Permessi',
      description: 'Configura ruoli e permessi del sistema',
      icon: '🔐',
      color: 'bg-purple-500',
      action: () => router.push('/admin?tab=permissions')
    },
    {
      title: 'Log di Sistema',
      description: 'Visualizza audit trail e log delle attività',
      icon: '📋',
      color: 'bg-red-500',
      action: () => router.push('/admin?tab=audit')
    },
    {
      title: 'Impostazioni',
      description: 'Configura parametri di sistema',
      icon: '⚙️',
      color: 'bg-gray-500',
      action: () => router.push('/admin?tab=settings')
    }
  ]

  const systemInfo = [
    { label: 'Versione Sistema', value: '1.0.0', icon: '🏷️' },
    { label: 'Ambiente', value: 'Produzione', icon: '🌐' },
    { label: 'Database', value: 'PostgreSQL', icon: '🗄️' },
    { label: 'Ultimo Backup', value: 'Oggi 14:30', icon: '💾' },
    { label: 'Spazio Disco', value: '2.4 GB / 10 GB', icon: '💽' },
    { label: 'Memoria', value: '512 MB / 2 GB', icon: '🧠' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl text-gray-700">Caricamento statistiche...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Benvenuto */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              👑 Benvenuto nell&apos;Amministrazione
            </h2>
            <p className="text-orange-100">
              Gestisci il sistema La Brigata con tutti gli strumenti di controllo necessari
            </p>
          </div>
          <div className="text-6xl opacity-20">👑</div>
        </div>
      </div>

      {/* Statistiche Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.totalUsers || 0}
              </div>
              <div className="text-sm text-blue-700">Utenti Totali</div>
            </div>
            <div className="text-3xl text-blue-500">👥</div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats?.activeRestaurants ?? stats?.totalRestaurants ?? 0}
              </div>
              <div className="text-sm text-green-700">Ristoranti Attivi</div>
            </div>
            <div className="text-3xl text-green-500">🏢</div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pendingCandidates || 0}
              </div>
              <div className="text-sm text-yellow-700">Candidati in Attesa</div>
            </div>
            <div className="text-3xl text-yellow-500">📝</div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.totalLogs || 0}
              </div>
              <div className="text-sm text-purple-700">Log Oggi</div>
            </div>
            <div className="text-3xl text-purple-500">📋</div>
          </div>
        </div>
      </div>

      {/* Azioni Rapide */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ Azioni Rapide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                  {action.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    {action.title}
                  </h4>
                </div>
              </div>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Informazioni Sistema */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">🖥️ Informazioni Sistema</h3>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemInfo.map((info, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="text-2xl">{info.icon}</div>
                <div>
                  <div className="text-sm text-gray-600">{info.label}</div>
                  <div className="font-medium text-gray-900">{info.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attività Recenti */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">🕒 Attività Recenti</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="space-y-4">
              {stats?.recentActivities?.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">{activity.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{activity.action}</div>
                    <div className="text-sm text-gray-600">{activity.user} • {activity.time}</div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>Nessuna attività recente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
