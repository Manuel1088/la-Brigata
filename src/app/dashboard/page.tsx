'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'
import { useEmployees } from '@/hooks/useEmployees'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'
import { NotificationBadge } from '@/components/NotificationBadge'
import { NotificationCenter } from '@/components/NotificationCenter'

// Color Palette La Brigata - Originale
const COLORS = {
  coral: '#D4918B',      // Rosa antico (pallina sinistra)
  orange: '#E9A961',     // Arancio caldo (seconda pallina)
  yellow: '#F2D06B',     // Giallo oro (pallina centrale)
  lightBlue: '#A8C9E8', // Azzurro cielo (quarta pallina)
  darkBlue: '#6B8CAE'   // Blu petrolio (pallina destra)
}

interface QuickAction {
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
  const { data: companyData } = useCompanyData(session?.user?.id)
  const { data: employees } = useEmployees((session?.user as any)?.companyId, true)
  const { userRole, canManageEmployees } = usePermissions()
  
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [liveTips, setLiveTips] = useState(67.50)
  const [todayShift, setTodayShift] = useState<{ time: string; label: string } | null>(null)
  const [monthlyTips, setMonthlyTips] = useState(0)
  const [savingsFound, setSavingsFound] = useState(127)
  const [progressToNext, setProgressToNext] = useState(68)
  const [userRanking, setUserRanking] = useState(12)
  
  // Quick Actions - Conditional based on role
  const quickActions: QuickAction[] = [
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
      id: 'team', 
      icon: '👥', 
      label: 'Il Mio Team', 
      path: '/employees', 
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
  ].filter(action => !action.roles || action.roles.includes(userRole))

  const aiSuggestions = [
    { icon: '🎯', text: 'Richiedi sabato libero (90% approvazione)', action: () => router.push('/leaves') },
    { icon: '💼', text: 'Controlla nuove opportunità di carriera', action: () => router.push('/me') },
    { icon: '📚', text: 'Corso disponibile: Servizio Avanzato', action: () => {} }
  ]

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Load today's shift
  useEffect(() => {
    if (!session?.user?.name) return
    
    try {
      const weekStart = getWeekStart(new Date())
      const key = `shifts_${toISODate(weekStart)}`
      const raw = localStorage.getItem(key)
      
      if (raw) {
        const map = JSON.parse(raw) as Record<string, { employee: string; time?: string }>
        const dayIndex = ((new Date().getDay() + 6) % 7)
        const shiftKey = `${session.user.name}-${dayIndex}`
        const shift = map[shiftKey]
        
        if (shift?.time && shift.time !== 'RIPOSO' && shift.time !== 'FERIE') {
          setTodayShift({
            time: shift.time,
            label: getShiftLabel(shift.time)
          })
        }
      }
    } catch (error) {
      console.error('Error loading shift:', error)
    }
  }, [session?.user?.name])

  // Calculate monthly tips
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tipEntries')
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

  const getShiftLabel = (time: string): string => {
    const timeMap: Record<string, string> = {
      '06:00-14:00': 'Mattina',
      '07:00-15:00': 'Apertura',
      '08:00-16:00': 'Pranzo',
      '11:00-16:00': 'Pranzo',
      '15:00-23:00': 'Cena',
      '17:00-01:00': 'Cena',
      '11:00-23:00': 'Completo',
      '10:00-22:00': 'Completo'
    }
    return timeMap[time] || 'Turno'
  }

  const isInShift = (): boolean => {
    if (!todayShift) return false
    const hour = currentTime.getHours()
    const [start] = todayShift.time.split('-')[0].split(':').map(Number)
    return hour >= start || hour <= 2
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-semibold text-gray-700">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Ultra Minimal */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-5 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ color: COLORS.darkBlue }}>
            🍽️ LA BRIGATA
          </h1>
          <div className="flex items-center gap-3">
            <NotificationBadge 
              userId={session.user?.id}
              onClick={() => setIsNotificationCenterOpen(true)}
            />
            <span className="text-3xl">{session.user?.avatar as any || '👤'}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Single Scroll */}
      <main className="max-w-4xl mx-auto px-5 py-6">
        
        {/* Hero Section - Emotional & Contextual */}
        <div 
          className="rounded-3xl p-8 mb-6 text-white relative overflow-hidden shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${COLORS.orange} 0%, ${COLORS.yellow} 50%, ${COLORS.lightBlue} 100%)`
          }}
        >
          {/* Decorative elements */}
          <div className="absolute top-5 right-5 text-5xl opacity-20">🍽️</div>
          <div className="absolute bottom-5 left-5 text-3xl opacity-20">✨</div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-5">
              <div className="text-5xl">{session.user?.avatar as any || '👤'}</div>
              <div>
                <h2 className="text-3xl font-bold mb-1">
                  Ciao, {session.user?.name?.split(' ')[0]}! 👋
                </h2>
                <p className="text-lg opacity-95">
                  {session.user?.role} • Livello {session.user?.level as any || '2'}
                </p>
              </div>
            </div>

            {todayShift ? (
              <div className="bg-white/25 backdrop-blur-sm rounded-2xl p-5 mt-4">
                <div className="text-lg font-semibold mb-2">
                  {isInShift() ? '🍽️ Sei in servizio ora' : '⏰ Prossimo turno'}
                </div>
                <div className="text-3xl font-bold mb-2">
                  {todayShift.label} • {todayShift.time}
                </div>
                {isInShift() && (
                  <div className="text-base opacity-95">
                    💰 Tips in tempo reale: €{liveTips.toFixed(2)}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/25 backdrop-blur-sm rounded-2xl p-5 mt-4">
                <div className="text-lg font-semibold mb-2">😴 Riposo oggi</div>
                <div className="text-base opacity-90">Goditi il tempo libero!</div>
              </div>
            )}
          </div>
        </div>

        {/* Savings Discovery - Immediate Value */}
        {savingsFound > 0 && (
          <div 
            className="bg-green-50 border-2 border-green-500 rounded-2xl p-5 mb-6 cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => router.push('/payroll')}
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
                <div className="text-4xl font-extrabold text-green-600 mb-2">
                  €{savingsFound}
                </div>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                  Scopri come →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - 4 Core Functions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => router.push(action.path)}
              className="bg-white rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl shadow-md flex flex-col items-center gap-2"
              style={{ borderTop: `4px solid ${action.color}` }}
            >
              <span className="text-5xl">{action.icon}</span>
              <span className="text-base font-semibold text-gray-900">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* AI Insights - Smart Suggestions */}
        <div 
          className="rounded-2xl p-6 mb-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${COLORS.darkBlue} 0%, #667EEA 100%)`
          }}
        >
          <h3 className="text-xl font-bold mb-4">
            🤖 Suggerimenti AI per te
          </h3>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, idx) => (
              <div 
                key={idx}
                onClick={suggestion.action}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-sm flex items-center gap-3 cursor-pointer transition-colors hover:bg-white/25"
              >
                <span className="text-2xl">{suggestion.icon}</span>
                <span>{suggestion.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance & Progress */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-5">
            📈 I Tuoi Progressi
          </h3>
          
          {/* Progress to next level */}
          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-700">Verso livello Oro</span>
              <span className="text-sm font-bold" style={{ color: COLORS.orange }}>
                {progressToNext}%
              </span>
            </div>
            <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressToNext}%`,
                  background: `linear-gradient(90deg, ${COLORS.orange} 0%, ${COLORS.yellow} 100%)`
                }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-extrabold" style={{ color: COLORS.yellow }}>
                €{monthlyTips.toFixed(0)}
              </div>
              <div className="text-xs text-gray-700 mt-1">
                Mance mese
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-extrabold" style={{ color: COLORS.lightBlue }}>
                Top {userRanking}%
              </div>
              <div className="text-xs text-gray-700 mt-1">
                Ranking
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-extrabold" style={{ color: COLORS.coral }}>
                4.8★
              </div>
              <div className="text-xs text-gray-700 mt-1">
                Valutazione
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Shifts Preview */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              📅 Prossimi Turni
            </h3>
            <button 
              onClick={() => router.push('/shifts')}
              className="text-sm font-semibold hover:underline"
              style={{ color: COLORS.darkBlue }}
            >
              Vedi tutti →
            </button>
          </div>
          
          {['Domani', 'Giovedì', 'Venerdì'].map((day, idx) => (
            <div 
              key={idx}
              className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">{day}</div>
                <div className="text-xs text-gray-600">Cena • 17:00-01:00</div>
              </div>
              <div className="bg-gray-50 px-3 py-1 rounded-lg text-xs font-semibold text-gray-700">
                8 ore
              </div>
            </div>
          ))}
        </div>

        {/* Additional sections for managers */}
        {canManageEmployees() && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => router.push('/bookings')}
              className="bg-white rounded-2xl p-6 text-left hover:shadow-lg transition shadow-md"
            >
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-bold text-lg mb-1">Prenotazioni</h3>
              <p className="text-sm text-gray-600">Gestisci prenotazioni</p>
            </button>
            <button
              onClick={() => router.push('/calendar')}
              className="bg-white rounded-2xl p-6 text-left hover:shadow-lg transition shadow-md"
            >
              <div className="text-3xl mb-2">📆</div>
              <h3 className="font-bold text-lg mb-1">Calendario</h3>
              <p className="text-sm text-gray-600">Vista aziendale</p>
            </button>
          </div>
        )}

      </main>

      {/* Floating Voice Assistant */}
      <button 
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all hover:scale-110 z-50"
        style={{
          background: `linear-gradient(135deg, ${COLORS.orange} 0%, ${COLORS.coral} 100%)`
        }}
        onClick={() => alert('🎤 Assistente Vocale: "Come posso aiutarti?"')}
      >
        🎤
      </button>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        userId={session.user?.id}
      />
    </div>
  )
}