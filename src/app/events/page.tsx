'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hasPermission } from '@/lib/permissions'

interface CompanyEvent {
  id: string
  name: string
  date: string
  type: 'closure' | 'holiday' | 'team_building' | 'special'
  description?: string
  icon: string
}

const EMPTY_FORM = {
  name: '',
  date: '',
  type: 'special' as CompanyEvent['type'],
  description: '',
}

export default function EventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const mayManageCompany = useMemo(() => {
    const role = session?.user?.role
    if (!role) return false
    return hasPermission(
      String(role),
      'manage_company_settings',
      session?.user?.ccnlLevel ?? null,
      session?.user?.dbGrantedPermissionIds ?? []
    )
  }, [
    session?.user?.role,
    session?.user?.ccnlLevel,
    session?.user?.dbGrantedPermissionIds,
  ])

  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/restaurant-events', { credentials: 'include' })
      if (!res.ok) throw new Error('Caricamento fallito')
      const data = await res.json()
      setEvents((data.events ?? []) as CompanyEvent[])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/login')
      return
    }
    if (!mayManageCompany) {
      router.push('/dashboard')
      return
    }
    void loadEvents()
  }, [status, session?.user?.id, mayManageCompany, loadEvents, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/restaurant-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Salvataggio fallito')
      setShowAddModal(false)
      setForm(EMPTY_FORM)
      await loadEvents()
    } catch {
      alert('Errore nel salvataggio evento')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session || !mayManageCompany) return null

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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {events.map((event) => {
            const badge = getEventTypeBadge(event.type)
            return (
              <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
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
                          year: 'numeric',
                        })}
                      </p>
                      <span
                        className={`text-xs ${badge.bg} ${badge.text} px-2 py-1 rounded-full mt-1 inline-block`}
                      >
                        {badge.label}
                      </span>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition cursor-pointer"
          >
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-600 mb-1 font-medium">Aggiungi eventi che impattano i turni</p>
            <p className="text-sm text-gray-500">
              Chiusure • Festività • Team Building • Eventi Speciali
            </p>
          </button>
        </div>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700">
            Gli eventi aziendali vengono mostrati automaticamente nel calendario turni e impattano
            la pianificazione
          </p>
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuovo evento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as CompanyEvent['type'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="closure">Chiusura</option>
                  <option value="holiday">Festività</option>
                  <option value="team_building">Team Building</option>
                  <option value="special">Evento speciale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setForm(EMPTY_FORM)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
