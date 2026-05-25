'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface CompanyEvent {
  id: string
  name: string
  date: string
  type: 'closure' | 'holiday' | 'team_building' | 'special'
  description?: string
  icon: string
}

export default function EventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageCompany } = usePermissions()
  
  const [events, setEvents] = useState<CompanyEvent[]>([
    {
      id: '1',
      name: 'Chiusura Natale',
      date: '2025-12-25',
      type: 'closure',
      description: 'Ristorante chiuso per festività',
      icon: '🎄'
    },
    {
      id: '2',
      name: 'Team Building',
      date: '2026-01-15',
      type: 'team_building',
      description: 'Giornata aziendale - tutti invitati',
      icon: '🎉'
    }
  ])

  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canManageCompany()) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, canManageCompany])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session || !canManageCompany()) return null

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'closure': return 'red'
      case 'holiday': return 'purple'
      case 'team_building': return 'green'
      case 'special': return 'blue'
      default: return 'gray'
    }
  }

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'closure': return { label: 'Ristorante Chiuso', bg: 'bg-red-100', text: 'text-red-800' }
      case 'holiday': return { label: 'Festività', bg: 'bg-purple-100', text: 'text-purple-800' }
      case 'team_building': return { label: 'Evento Aziendale', bg: 'bg-green-100', text: 'text-green-800' }
      case 'special': return { label: 'Evento Speciale', bg: 'bg-blue-100', text: 'text-blue-800' }
      default: return { label: 'Altro', bg: 'bg-gray-100', text: 'text-gray-800' }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎉 Eventi Aziendali</h1>
              <p className="text-gray-600 mt-2">Gestisci chiusure, festività e eventi speciali</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              ➕ Nuovo Evento
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Info */}
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700">
            Gli eventi aziendali vengono mostrati automaticamente nel calendario turni e impattano la pianificazione
          </p>
        </div>

        {/* Lista Eventi */}
        <div className="space-y-4">
          {events.map(event => {
            const badge = getEventTypeBadge(event.type)
            return (
              <div
                key={event.id}
                className={`bg-white border-2 border-${getEventTypeColor(event.type)}-200 rounded-lg p-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{event.icon}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{event.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(event.date).toLocaleDateString('it-IT', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <span className={`text-xs ${badge.bg} ${badge.text} px-2 py-1 rounded-full mt-1 inline-block`}>
                        {badge.label}
                      </span>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      ✏️ Modifica
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Placeholder */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-600 mb-4">
              Aggiungi eventi che impattano i turni
            </p>
            <p className="text-sm text-gray-500">
              Chiusure • Festività • Team Building • Eventi Speciali
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

