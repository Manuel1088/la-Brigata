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
  splitTipsByMeal?: boolean
}

const EMPTY_FORM = {
  name: '',
  date: '',
  type: 'special' as CompanyEvent['type'],
  description: '',
  splitTipsByMeal: false,
}

function getEventTypeBadge(type: string) {
  switch (type) {
    case 'closure':
      return { label: 'Chiusura', bg: 'bg-red-100', text: 'text-red-700' }
    case 'holiday':
      return { label: 'Festività', bg: 'bg-purple-100', text: 'text-purple-700' }
    case 'team_building':
      return { label: 'Aziendale', bg: 'bg-green-100', text: 'text-green-700' }
    default:
      return { label: 'Speciale', bg: 'bg-blue-100', text: 'text-blue-700' }
  }
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
  }, [session?.user?.role, session?.user?.ccnlLevel, session?.user?.dbGrantedPermissionIds])

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
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

  const eventsForYear = useMemo(
    () => events.filter((e) => e.date.startsWith(String(selectedYear))),
    [events, selectedYear]
  )

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

        {/* Year navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm text-gray-600 hover:text-gray-900 transition"
            aria-label="Anno precedente"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-gray-900">{selectedYear}</h2>
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm text-gray-600 hover:text-gray-900 transition"
            aria-label="Anno successivo"
          >
            →
          </button>
        </div>

        {/* Event grid */}
        {eventsForYear.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📅</div>
            <p>Nessun evento per il {selectedYear}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {eventsForYear.map((event) => {
              const badge = getEventTypeBadge(event.type)
              return (
                <div
                  key={event.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-2xl shrink-0 mt-0.5">{event.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{event.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(event.date).toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className={`text-xs ${badge.bg} ${badge.text} px-1.5 py-0.5 rounded-full font-medium`}>
                        {badge.label}
                      </span>
                      {event.splitTipsByMeal && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          🍽️ Mance divise
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{event.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add button */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 hover:bg-purple-50/50 transition cursor-pointer"
        >
          <div className="text-3xl mb-2">📅</div>
          <p className="text-gray-600 font-medium text-sm">Aggiungi evento</p>
          <p className="text-xs text-gray-400 mt-0.5">Chiusure · Festività · Team Building · Speciali</p>
        </button>

        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-700">
            Gli eventi aziendali vengono mostrati automaticamente nel calendario turni e impattano la pianificazione.
          </p>
        </div>
      </main>

      {/* Add modal */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const t = e.target.value as CompanyEvent['type']
                    setForm({ ...form, type: t, splitTipsByMeal: t === 'holiday' ? form.splitTipsByMeal : false })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* splitTipsByMeal — visible only for holiday */}
              {form.type === 'holiday' && (
                <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={form.splitTipsByMeal}
                    onChange={(e) => setForm({ ...form, splitTipsByMeal: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-sm text-amber-800 font-medium">
                    🍽️ Dividi mance pranzo/cena
                  </span>
                </label>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setForm(EMPTY_FORM)
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
