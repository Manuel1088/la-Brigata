'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { formatEuro } from '@/lib/utils'
import { shiftHubLabel } from '@/lib/shifts'

interface HubShift {
  id: string
  time: string
  department: string
  status: string
}

interface WeekDay {
  date: string
  dayName: string
  dayNumber: number
  isToday: boolean
  shift: HubShift | null
}

interface MeHubData {
  user: {
    id: string
    name: string
    department: string | null
    role: string
    avatar: string
  }
  todayShift: HubShift | null
  weekShifts: WeekDay[]
  monthlyTips: {
    total: number
    daysWithTips: number
    monthLabel: string
  }
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Failed to load hub')
    return res.json() as Promise<MeHubData>
  })

export default function MeHubPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeDayIndex, setActiveDayIndex] = useState(0)

  const { data, error, isLoading } = useSWR<MeHubData>(
    status === 'authenticated' ? '/api/me/hub' : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) router.replace('/login')
  }, [session?.user?.id, status, router])

  useEffect(() => {
    if (!data?.weekShifts) return
    const todayIdx = data.weekShifts.findIndex((d) => d.isToday)
    if (todayIdx >= 0) {
      setActiveDayIndex(todayIdx)
      const el = scrollRef.current
      if (el) {
        const card = el.children[todayIdx] as HTMLElement | undefined
        card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [data?.weekShifts])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Caricamento...</div>
      </div>
    )
  }

  const firstName = data?.user.name?.split(' ').slice(-1)[0] ?? session.user?.name?.split(' ').slice(-1)[0] ?? 'Ciao'
  const today = shiftHubLabel(data?.todayShift ?? null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-4 sm:pt-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">Bentornato</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {data?.user.avatar ?? '👤'} {firstName}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="text-sm text-orange-600 font-medium px-3 py-2 rounded-full bg-white shadow-sm border border-orange-100"
          >
            Profilo
          </button>
        </header>

        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-36 bg-white rounded-2xl shadow" />
            <div className="h-24 bg-white rounded-2xl shadow" />
            <div className="h-32 bg-white rounded-2xl shadow" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            Impossibile caricare i dati. Riprova tra poco.
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Turno di oggi */}
            <section
              className={`rounded-2xl p-5 mb-4 shadow-lg text-white ${
                today.tone === 'work'
                  ? 'bg-gradient-to-br from-orange-500 to-red-500'
                  : today.tone === 'leave'
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }`}
            >
              <p className="text-sm font-medium opacity-90 mb-1">Oggi</p>
              <p className="text-3xl font-bold tracking-tight">{today.title}</p>
              <p className="text-sm opacity-90 mt-1">{today.subtitle}</p>
              <p className="text-xs opacity-75 mt-3">
                {new Date().toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </section>

            {/* Mance del mese */}
            <section className="bg-white rounded-2xl shadow-md p-5 mb-4 border border-orange-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mance · {data.monthlyTips.monthLabel}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatEuro(data.monthlyTips.total)}
                  </p>
                  {data.monthlyTips.daysWithTips > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {data.monthlyTips.daysWithTips} giorn{data.monthlyTips.daysWithTips === 1 ? 'o' : 'i'} con mance
                    </p>
                  )}
                </div>
                <span className="text-3xl">💰</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/tips')}
                className="mt-4 w-full text-center text-sm font-medium text-orange-600 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 transition"
              >
                Dettaglio mance →
              </button>
            </section>

            {/* Settimana swipe */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-semibold text-gray-900">La tua settimana</h2>
                <button
                  type="button"
                  onClick={() => router.push('/shifts')}
                  className="text-sm text-orange-600 font-medium"
                >
                  Calendario
                </button>
              </div>

              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {data.weekShifts.map((day, index) => {
                  const info = shiftHubLabel(day.shift)
                  const isActive = index === activeDayIndex
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setActiveDayIndex(index)}
                      className={`snap-center shrink-0 w-[120px] rounded-2xl p-4 text-left border-2 transition-all ${
                        day.isToday
                          ? 'border-orange-400 bg-orange-50 shadow-md'
                          : isActive
                            ? 'border-orange-200 bg-white shadow'
                            : 'border-transparent bg-white shadow-sm'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-500 uppercase">{day.dayName}</p>
                      <p className={`text-2xl font-bold ${day.isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                        {day.dayNumber}
                      </p>
                      <p
                        className={`text-xs font-semibold mt-2 line-clamp-2 ${
                          info.tone === 'work'
                            ? 'text-blue-700'
                            : info.tone === 'leave'
                              ? 'text-purple-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {info.title}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Dettaglio giorno selezionato */}
              {data.weekShifts[activeDayIndex] && (
                <div className="mt-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <p className="text-sm text-gray-500">
                    {new Date(data.weekShifts[activeDayIndex].date + 'T12:00:00').toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {shiftHubLabel(data.weekShifts[activeDayIndex].shift).title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {shiftHubLabel(data.weekShifts[activeDayIndex].shift).subtitle}
                  </p>
                </div>
              )}
            </section>

            {/* Azioni rapide */}
            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push('/leaves')}
                className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl p-5 shadow-md border border-green-100 hover:border-green-300 hover:shadow-lg transition active:scale-[0.98]"
              >
                <span className="text-3xl">🏖️</span>
                <span className="font-semibold text-gray-900 text-sm">Richiesta ferie</span>
                <span className="text-xs text-gray-500 text-center">Permessi e assenze</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/shifts')}
                className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl p-5 shadow-md border border-blue-100 hover:border-blue-300 hover:shadow-lg transition active:scale-[0.98]"
              >
                <span className="text-3xl">🔄</span>
                <span className="font-semibold text-gray-900 text-sm">Cambio turno</span>
                <span className="text-xs text-gray-500 text-center">Vedi turni e richiedi</span>
              </button>
            </section>
          </>
        )}
      </div>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-area-pb z-30 md:hidden">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {[
            { label: 'Home', icon: '🏠', path: '/me', active: true },
            { label: 'Turni', icon: '📅', path: '/shifts' },
            { label: 'Mance', icon: '💰', path: '/tips' },
            { label: 'Profilo', icon: '👤', path: '/profile' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center py-1 px-3 min-w-[64px] ${
                item.active ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
