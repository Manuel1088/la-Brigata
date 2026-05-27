'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShiftTemplateType } from '@prisma/client'

// ── Types ──────────────────────────────────────────────────────────────────

export type ShiftTemplateDto = {
  id: string
  name: string
  startTime: string
  endTime: string
  type: ShiftTemplateType
  color: string
  isActive: boolean
  sortOrder: number
  createdAt: string
}

type FormState = {
  name: string
  startTime: string
  endTime: string
  type: ShiftTemplateType
  color: string
  isActive: boolean
  sortOrder: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ShiftTemplateType, string> = {
  PRANZO: 'Pranzo',
  CENA: 'Cena',
  SPEZZATO: 'Spezzato',
  BREAKFAST: 'Colazione',
  NOTTURNO: 'Notturno',
  ALTRO: 'Altro',
}

const TYPE_COLORS: Record<ShiftTemplateType, string> = {
  PRANZO: 'bg-yellow-100 text-yellow-800',
  CENA: 'bg-blue-100 text-blue-800',
  SPEZZATO: 'bg-purple-100 text-purple-800',
  BREAKFAST: 'bg-orange-100 text-orange-800',
  NOTTURNO: 'bg-gray-800 text-gray-100',
  ALTRO: 'bg-gray-100 text-gray-700',
}

const PRESET_COLORS = [
  '#F97316', '#3B82F6', '#8B5CF6', '#10B981',
  '#EF4444', '#F59E0B', '#6366F1', '#EC4899',
  '#14B8A6', '#64748B',
]

const EMPTY_FORM: FormState = {
  name: '',
  startTime: '12:00',
  endTime: '16:00',
  type: 'ALTRO',
  color: '#F97316',
  isActive: true,
  sortOrder: 0,
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  restaurantId: string | undefined
  onMessage: (msg: string) => void
}

export default function ShiftTemplatesTab({ restaurantId, onMessage }: Props) {
  const [templates, setTemplates] = useState<ShiftTemplateDto[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/shift-templates`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Errore caricamento')
      const data = (await res.json()) as { templates: ShiftTemplateDto[] }
      setTemplates(data.templates)
    } catch {
      onMessage('❌ Errore caricamento turni')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, onMessage])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sortOrder: templates.length })
    setIsModalOpen(true)
  }

  const openEdit = (t: ShiftTemplateDto) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      startTime: t.startTime,
      endTime: t.endTime,
      type: t.type,
      color: t.color,
      isActive: t.isActive,
      sortOrder: t.sortOrder,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!restaurantId) return
    if (!form.name.trim()) {
      onMessage('❌ Il nome è obbligatorio')
      return
    }
    setSaving(true)
    try {
      const url = editingId
        ? `/api/restaurants/${restaurantId}/shift-templates/${editingId}`
        : `/api/restaurants/${restaurantId}/shift-templates`
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Errore salvataggio')
      }
      onMessage(editingId ? '✅ Turno aggiornato' : '✅ Turno aggiunto')
      setIsModalOpen(false)
      await loadTemplates()
    } catch (e) {
      onMessage(`❌ ${e instanceof Error ? e.message : 'Errore'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (t: ShiftTemplateDto) => {
    if (!restaurantId) return
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/shift-templates/${t.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isActive: !t.isActive }),
        }
      )
      if (!res.ok) throw new Error()
      await loadTemplates()
    } catch {
      onMessage('❌ Errore aggiornamento stato')
    }
  }

  const handleDelete = async (id: string) => {
    if (!restaurantId) return
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/shift-templates/${id}`,
        { method: 'DELETE', credentials: 'include' }
      )
      if (!res.ok) throw new Error()
      onMessage('✅ Turno eliminato')
      setDeleteConfirmId(null)
      await loadTemplates()
    } catch {
      onMessage('❌ Errore eliminazione')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  const activeCount = templates.filter((t) => t.isActive).length

  return (
    <div className="space-y-6">
      {/* Header + summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Turni predefiniti</h3>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} turni attivi · {templates.length} totali
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition"
        >
          <span className="text-lg leading-none">+</span> Aggiungi turno
        </button>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['PRANZO', 'CENA', 'SPEZZATO', 'BREAKFAST'] as ShiftTemplateType[]).map((type) => {
          const count = templates.filter((t) => t.type === type && t.isActive).length
          return (
            <div
              key={type}
              className={`rounded-lg px-4 py-3 flex items-center justify-between ${TYPE_COLORS[type]}`}
            >
              <span className="text-sm font-medium">{TYPE_LABELS[type]}</span>
              <span className="text-xl font-bold">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Templates grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-lg font-medium">Nessun turno configurato</p>
          <p className="text-sm mt-1">Aggiungi i turni tipici del ristorante</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`bg-white border rounded-xl p-4 shadow-sm transition ${
                t.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* Color swatch */}
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: t.color }}
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{t.name}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[t.type]}`}>
                      {TYPE_LABELS[t.type]}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(t.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Elimina"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-800">
                  {t.startTime} – {t.endTime}
                </p>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(t)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                    t.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t.isActive ? 'Attivo' : 'Inattivo'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Modifica turno' : 'Aggiungi turno'}
              </h3>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome turno *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="es. Pranzo, Cena, Apertura…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ora fine *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ShiftTemplateType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {(Object.keys(TYPE_LABELS) as ShiftTemplateType[]).map((k) => (
                    <option key={k} value={k}>{TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition ${
                        form.color === c ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : 'hover:scale-110'
                      }`}
                      title={c}
                    />
                  ))}
                  {/* Custom hex input */}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                    title="Colore personalizzato"
                  />
                </div>
              </div>

              {/* Sort order + active */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500"
                    />
                    <span className="text-sm text-gray-700">Attivo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50 transition"
              >
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <p className="text-gray-800 font-medium mb-1">Eliminare il turno?</p>
            <p className="text-sm text-gray-500 mb-5">
              {templates.find((t) => t.id === deleteConfirmId)?.name} — questa azione non è reversibile.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
