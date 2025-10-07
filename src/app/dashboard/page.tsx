'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'

// Color Palette La Brigata
const COLORS = {
  coral: '#E17055',
  orange: '#FDCB6E',
  yellow: '#F9CA24',
  lightBlue: '#74B9FF',
  darkBlue: '#2D3436'
}

interface DashboardAction {
  id: string
  icon: string
  label: string
  path: string
  color: string
  roles?: UserRole[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { userRole } = usePermissions()
  const [monthlyTips, setMonthlyTips] = useState(0)
  const [liveTips, setLiveTips] = useState(0)
  const [savingsFound, setSavingsFound] = useState(1250)
  const [todayShift, setTodayShift] = useState<{start: string, end: string} | null>(null)

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Simulate AI suggestions
  const aiSuggestions = [
    { icon: '🎯', text: 'Richiedi sabato libero (90% approvazione)', action: () => router.push('/leaves/new') },
    { icon: '💼', text: 'Controlla nuove opportunità di carriera', action: () => router.push('/me') },
    { icon: '📚', text: 'Corso disponibile: Servizio Avanzato', action: () => {} }
  ]

  // Calculate monthly tips
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tipEntries_v1::restaurant_1')
      if (!raw) return
      
      const entries = JSON.parse(raw)
      const currentMonth = new Date()
      const monthTotal = entries
        .filter((e: any) => {
          const d = new Date(e.date)
          return d.getFullYear() === currentMonth.getFullYear() && 
                 d.getMonth() === currentMonth.getMonth()
        })
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
      
      setMonthlyTips(monthTotal)
    } catch (error) {
      console.error('Error calculating tips:', error)
    }
  }, [])

  // Simulate live tips update (if in shift)
  useEffect(() => {
    if (!isInShift()) return
    
    const tipTimer = setInterval(() => {
      setLiveTips(prev => prev + (Math.random() * 3))
    }, 8000)
    
    return () => clearInterval(tipTimer)
  }, [todayShift])

  // Helper functions
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + diff)
    return d
  }

  const toISODate = (d: Date) => {
    const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
  }

  const isInShift = () => {
    const now = new Date()
    const currentHour = now.getHours()
    return currentHour >= 8 && currentHour <= 22
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buongiorno'
    if (hour < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  }

  // Dashboard actions based on role
  const dashboardActions: DashboardAction[] = [
    { 
      id: 'tips', 
      icon: '💰', 
      label: 'Le Mie Mance', 
      path: '/tips', 
      color: COLORS.yellow 
    },
    { 
      id: 'shifts', 
      icon: '📅', 
      label: 'I Miei Turni', 
      path: '/shifts', 
      color: COLORS.lightBlue 
    },
    { 
      id: 'employees', 
      icon: '👥', 
      label: 'Il Mio Team', 
      path: '/team', 
      color: COLORS.orange,
      roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
    },
    { 
      id: 'profile', 
      icon: '📊', 
      label: 'I Miei Dati', 
      path: '/me', 
      color: COLORS.darkBlue 
    }
  ]

  // Filter actions based on user role
  const availableActions = dashboardActions.filter(action => 
    !action.roles || action.roles.includes(userRole as UserRole)
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {session.user?.name?.split(' ')[0] || 'Team'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Ecco la tua panoramica per oggi
          </p>
        </div>

        {/* Savings Discovery - Immediate Value */}
        {savingsFound > 0 && (
          <div 
            className="bg-green-50 border-2 border-green-500 rounded-2xl p-5 mb-6 cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => router.push('/me')}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-green-800 mb-1">
                  💡 Risparmio Scoperto!
                </h3>
                <p className="text-sm text-green-700">
                  Analisi ultima busta paga
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">
                  +€{savingsFound.toLocaleString()}
                </div>
                <p className="text-sm text-green-600">potenziale annuo</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🤖 Suggerimenti AI</h2>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={suggestion.action}
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3">{suggestion.icon}</span>
                <span className="text-gray-700">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {availableActions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(action.path)}
              className="bg-white rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl shadow-md flex flex-col items-center gap-2"
              style={{ borderTop: `4px solid ${action.color}` }}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className="font-semibold text-gray-800 text-center">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Tips This Month */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mance questo mese</p>
                <p className="text-2xl font-bold text-gray-900">€{isNaN(monthlyTips) ? '0.00' : monthlyTips.toFixed(2)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <button 
              onClick={() => router.push('/shifts')}
              className="text-sm font-semibold hover:underline"
            >
              Vedi turni →
            </button>
          </div>

          {/* Live Tips (if in shift) */}
          {isInShift() && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Mance live oggi</p>
                  <p className="text-2xl font-bold text-green-600">€{isNaN(liveTips) ? '0.00' : liveTips.toFixed(2)}</p>
                </div>
                <div className="text-3xl animate-pulse">⚡</div>
              </div>
              <p className="text-xs text-gray-500">Aggiornamento in tempo reale</p>
            </div>
          )}

          {/* Bookings Today */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Prenotazioni oggi</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
            <button
              onClick={() => router.push('/bookings')}
              className="bg-white rounded-2xl p-6 text-left hover:shadow-lg transition shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Prenotazioni</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <div className="text-3xl">📋</div>
              </div>
            </button>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Eventi questa settimana</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
            <button
              onClick={() => router.push('/calendar')}
              className="bg-white rounded-2xl p-6 text-left hover:shadow-lg transition shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calendario</p>
                  <p className="text-2xl font-bold text-gray-900">3 eventi</p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}