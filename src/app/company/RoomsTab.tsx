'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LocationType } from '@prisma/client'
import {
  DAYS_OF_WEEK,
  getDefaultOpeningHours,
  type DayId,
  type OpeningHours,
} from '@/lib/location-hours'
import type { LocationDto } from '@/lib/restaurant-location-api'
import { LOCATION_TYPES } from '@/lib/validations/locations'

const ROOM_ICONS = ['🍽️', '🌿', '👑', '🎉', '🏛️', '🌅', '🎨']

const TYPE_LABELS: Record<(typeof LOCATION_TYPES)[number], string> = {
  RISTORANTE: 'Ristorante',
  BAR: 'Bar',
  SKYBAR: 'Skybar',
  COLAZIONI: 'Colazioni',
  EVENTI: 'Eventi',
  ALTRO: 'Altro',
}

type RoomFormState = {
  name: string
  outletName: string
  type: LocationType
  capacity: number
  tables: number
  icon: string
  isActive: boolean
}

const emptyForm = (): RoomFormState => ({
  name: '',
  outletName: '',
  type: 'RISTORANTE',
  capacity: 0,
  tables: 0,
  icon: '🍽️',
  isActive: true,
})

type RoomsTabProps = {
  restaurantId: string | undefined
  onMessage: (message: string) => void
  onLocationsChange?: (locations: LocationDto[]) => void
}

export default function RoomsTab({
  restaurantId,
  onMessage,
  onLocationsChange,
}: RoomsTabProps) {
  const [locations, setLocations] = useState<LocationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RoomFormState>(emptyForm)
  const [expandedHoursId, setExpandedHoursId] = useState<string | null>(null)

  const loadLocations = useCallback(async () => {
    if (!restaurantId) {
      setLocations([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/locations`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Errore caricamento sale')
      }
      const list = (data.locations ?? []) as LocationDto[]
      setLocations(list)
      onLocationsChange?.(list)
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore caricamento'}`)
      setLocations([])
      onLocationsChange?.([])
    } finally {
      setLoading(false)
    }
  }, [restaurantId, onMessage, onLocationsChange])

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  const groupedByOutlet = useMemo(() => {
    const map = new Map<string, LocationDto[]>()
    for (const loc of locations) {
      const key = loc.outletName.trim() || 'Senza punto ristoro'
      const arr = map.get(key) ?? []
      arr.push(loc)
      map.set(key, arr)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'it'))
  }, [locations])

  const activeLocations = locations.filter((l) => l.isActive)
  const totalCapacity = activeLocations.reduce((s, l) => s + (l.capacity ?? 0), 0)
  const totalTables = activeLocations.reduce((s, l) => s + (l.tables ?? 0), 0)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (loc: LocationDto) => {
    setEditingId(loc.id)
    setForm({
      name: loc.name,
      outletName: loc.outletName,
      type: loc.type,
      capacity: loc.capacity ?? 0,
      tables: loc.tables ?? 0,
      icon: loc.icon ?? '🍽️',
      isActive: loc.isActive,
    })
    setShowModal(true)
  }

  const patchLocation = async (locationId: string, body: Record<string, unknown>) => {
    if (!restaurantId) return false
    const res = await fetch(
      `/api/restaurants/${restaurantId}/locations/${locationId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || 'Salvataggio fallito')
    }
    const updated = (data as { location: LocationDto }).location
    setLocations((prev) => {
      const next = prev.map((l) => (l.id === updated.id ? updated : l))
      onLocationsChange?.(next)
      return next
    })
    return true
  }

  const handleSaveForm = async () => {
    if (!restaurantId) return
    if (!form.name.trim() || !form.outletName.trim()) {
      onMessage('❌ Nome sala e punto ristoro sono obbligatori')
      return
    }
    if (form.capacity <= 0 || form.tables <= 0) {
      onMessage('❌ Capacità e tavoli devono essere maggiori di zero')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/locations/${editingId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: form.name.trim(),
              outletName: form.outletName.trim(),
              type: form.type,
              capacity: form.capacity,
              tables: form.tables,
              icon: form.icon,
              isActive: form.isActive,
            }),
          }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || 'Salvataggio fallito')
        }
        onMessage('✅ Sala aggiornata')
      } else {
        const res = await fetch(`/api/restaurants/${restaurantId}/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: form.name.trim(),
            outletName: form.outletName.trim(),
            type: form.type,
            capacity: form.capacity,
            tables: form.tables,
            icon: form.icon,
            isActive: form.isActive,
            openingHours: getDefaultOpeningHours(),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || 'Creazione fallita')
        }
        onMessage('✅ Sala creata')
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      await loadLocations()
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore'}`)
    } finally {
      setSaving(false)
      setTimeout(() => onMessage(''), 3000)
    }
  }

  const handleDelete = async (loc: LocationDto) => {
    if (!restaurantId) return
    if (!confirm(`Eliminare la sala "${loc.name}"?`)) return
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/locations/${loc.id}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Eliminazione fallita')
      }
      if ((data as { softDeleted?: boolean }).softDeleted) {
        onMessage(`✅ ${(data as { message?: string }).message ?? 'Sala disattivata'}`)
      } else {
        onMessage('✅ Sala eliminata')
      }
      await loadLocations()
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore'}`)
    }
    setTimeout(() => onMessage(''), 4000)
  }

  const handleToggleActive = async (loc: LocationDto) => {
    try {
      await patchLocation(loc.id, { isActive: !loc.isActive })
      await loadLocations()
      onMessage(loc.isActive ? '✅ Sala disattivata' : '✅ Sala attivata')
      setTimeout(() => onMessage(''), 2000)
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore'}`)
    }
  }

  const handleUpdateHours = async (
    locationId: string,
    day: DayId,
    field: 'open' | 'close' | 'isClosed',
    value: string | boolean
  ) => {
    const loc = locations.find((l) => l.id === locationId)
    if (!loc) return
    const hours: OpeningHours = { ...loc.openingHours }
    const dayHours = { ...hours[day] }
    if (field === 'isClosed') {
      dayHours.isClosed = Boolean(value)
    } else {
      dayHours[field] = String(value)
    }
    hours[day] = dayHours
    try {
      await patchLocation(locationId, { openingHours: hours })
      await loadLocations()
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore orari'}`)
    }
  }

  const handleCopyHoursToOutlet = async (source: LocationDto) => {
    const sameOutlet = locations.filter(
      (l) => l.outletName === source.outletName && l.id !== source.id && l.isActive
    )
    if (sameOutlet.length === 0) return
    try {
      for (const loc of sameOutlet) {
        await patchLocation(loc.id, { openingHours: source.openingHours })
      }
      await loadLocations()
      onMessage('✅ Orari copiati alle altre sale del punto ristoro')
      setTimeout(() => onMessage(''), 2000)
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore'}`)
    }
  }

  if (!restaurantId) {
    return (
      <p className="text-gray-600 text-center py-8">
        Nessun ristorante associato al tuo account.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-600">
        <div className="text-4xl mb-2">⏳</div>
        Caricamento sale...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{activeLocations.length}</div>
          <div className="text-sm text-blue-700">Sale attive</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{totalTables}</div>
          <div className="text-sm text-green-700">Tavoli totali</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{totalCapacity}</div>
          <div className="text-sm text-purple-700">Coperti totali</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-gray-900">🏛️ Sale per punto ristoro</h4>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          ➕ Aggiungi sala
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="mb-2">Nessuna sala configurata nel database.</p>
          <p className="text-sm">Aggiungi le sale dei tuoi punti ristoro (es. Mirabelle, Adele).</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByOutlet.map(([outletName, outletLocations]) => (
            <section key={outletName} className="border-2 border-orange-100 rounded-xl p-4 bg-orange-50/30">
              <h5 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🍽️</span>
                {outletName}
                <span className="text-xs font-normal text-gray-500">
                  ({outletLocations.length} {outletLocations.length === 1 ? 'sala' : 'sale'})
                </span>
              </h5>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {outletLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className={`border-2 rounded-lg p-4 bg-white ${
                      loc.isActive ? 'border-green-200' : 'border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-4xl">{loc.icon ?? '🍽️'}</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(loc)}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(loc)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            loc.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {loc.isActive ? '✓' : '✗'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(loc)}
                          className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <h6 className="font-semibold text-gray-900">{loc.name}</h6>
                    <p className="text-xs text-gray-500 mt-1">{TYPE_LABELS[loc.type]}</p>
                    <div className="text-sm text-gray-600 space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span>Capacità</span>
                        <span className="font-medium">{loc.capacity ?? '—'} posti</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tavoli</span>
                        <span className="font-medium">{loc.tables ?? '—'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHoursId((id) => (id === loc.id ? null : loc.id))
                      }
                      className="mt-3 text-xs text-orange-600 font-medium hover:underline"
                    >
                      {expandedHoursId === loc.id ? 'Nascondi orari' : '🕐 Orari'}
                    </button>
                  </div>
                ))}
              </div>

              {outletLocations.some((l) => expandedHoursId === l.id) &&
                outletLocations
                  .filter((l) => expandedHoursId === l.id)
                  .map((loc) => (
                    <div
                      key={`hours-${loc.id}`}
                      className="border border-gray-200 rounded-lg p-4 bg-white mb-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{loc.icon ?? '🍽️'}</span>
                          <span className="font-semibold">{loc.name} — orari</span>
                        </div>
                        {outletLocations.filter((l) => l.isActive).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleCopyHoursToOutlet(loc)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                          >
                            📋 Copia alle altre sale di {outletName}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const d = loc.openingHours[day.id]
                          return (
                            <div
                              key={day.id}
                              className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-lg p-2"
                            >
                              <div className="w-28 font-medium text-gray-900 text-sm">
                                {day.label}
                              </div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!d.isClosed}
                                  onChange={(e) =>
                                    handleUpdateHours(
                                      loc.id,
                                      day.id,
                                      'isClosed',
                                      !e.target.checked
                                    )
                                  }
                                  className="w-4 h-4 text-orange-600 rounded"
                                />
                                <span className="text-xs text-gray-600">Aperto</span>
                              </label>
                              {!d.isClosed ? (
                                <>
                                  <input
                                    type="time"
                                    value={d.open}
                                    onChange={(e) =>
                                      handleUpdateHours(loc.id, day.id, 'open', e.target.value)
                                    }
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <span className="text-gray-500 text-sm">-</span>
                                  <input
                                    type="time"
                                    value={d.close}
                                    onChange={(e) =>
                                      handleUpdateHours(loc.id, day.id, 'close', e.target.value)
                                    }
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </>
                              ) : (
                                <span className="text-red-600 font-medium text-sm">Chiuso</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
            </section>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Modifica sala' : 'Nuova sala'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Punto ristoro (outlet)
                </label>
                <input
                  type="text"
                  value={form.outletName}
                  onChange={(e) => setForm((f) => ({ ...f, outletName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="es. Mirabelle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome sala</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="es. Sala principale"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as LocationType }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacità</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tavoli</label>
                  <input
                    type="number"
                    min={1}
                    value={form.tables || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tables: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icona</label>
                <div className="flex gap-2 flex-wrap">
                  {ROOM_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`text-3xl p-2 rounded border-2 ${
                        form.icon === icon ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-sm text-gray-700">Sala attiva</span>
              </label>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
                    setForm(emptyForm())
                  }}
                  className="flex-1 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveForm()}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Salvataggio...' : editingId ? 'Salva' : 'Aggiungi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
