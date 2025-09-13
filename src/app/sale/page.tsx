"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type AreaType = 'sala' | 'sala_colazioni' | 'bar' | 'ristorante' | 'terrazza' | 'privé' | 'altro'

interface BookingArea {
  id: string
  name: string
  type: AreaType
  quantity?: number
  openTime?: string
  closeTime?: string
  seatingsPerService?: number
  hasTwoServices?: boolean
  lunchOpen?: string
  lunchClose?: string
  dinnerOpen?: string
  dinnerClose?: string
}

export default function SalePage() {
  const router = useRouter()
  const [areas, setAreas] = useState<BookingArea[]>([])

  // form nuovo
  const [form, setForm] = useState<BookingArea>({ id: '', name: '', type: 'sala', openTime: '11:00', closeTime: '23:00', seatingsPerService: 1, hasTwoServices: false, lunchOpen: '12:00', lunchClose: '15:00', dinnerOpen: '19:00', dinnerClose: '23:00' })

  // editing
  const [editingId, setEditingId] = useState<string>('')
  const [editMap, setEditMap] = useState<Record<string, BookingArea>>({})

  const loadAreas = () => {
    try {
      const raw = localStorage.getItem('booking_areas_v1')
      setAreas(raw ? JSON.parse(raw) : [])
    } catch {
      setAreas([])
    }
  }

  const saveAreas = (next: BookingArea[]) => {
    setAreas(next)
    try { localStorage.setItem('booking_areas_v1', JSON.stringify(next)) } catch {}
    try { window.dispatchEvent(new CustomEvent('booking_areas_updated')) } catch {}
  }

  useEffect(() => { loadAreas() }, [])

  const addArea = () => {
    const name = (form.name || '').trim()
    if (!name) return
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? (globalThis.crypto as any).randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const next: BookingArea[] = [
      ...areas,
      {
        id,
        name,
        type: form.type || 'sala',
        quantity: 1,
        openTime: form.hasTwoServices ? undefined : (form.openTime || '11:00'),
        closeTime: form.hasTwoServices ? undefined : (form.closeTime || '23:00'),
        hasTwoServices: !!form.hasTwoServices,
        lunchOpen: form.hasTwoServices ? (form.lunchOpen || '12:00') : undefined,
        lunchClose: form.hasTwoServices ? (form.lunchClose || '15:00') : undefined,
        dinnerOpen: form.hasTwoServices ? (form.dinnerOpen || '19:00') : undefined,
        dinnerClose: form.hasTwoServices ? (form.dinnerClose || '23:00') : undefined,
        seatingsPerService: Math.max(1, Number(form.seatingsPerService || 1)),
      }
    ]
    saveAreas(next)
    setForm({ id: '', name: '', type: 'sala', openTime: '11:00', closeTime: '23:00', seatingsPerService: 1, hasTwoServices: false, lunchOpen: '12:00', lunchClose: '15:00', dinnerOpen: '19:00', dinnerClose: '23:00' })
  }

  const startEdit = (a: BookingArea) => {
    setEditingId(a.id)
    setEditMap(prev => ({ ...prev, [a.id]: { ...a } }))
  }

  const cancelEdit = () => {
    setEditingId('')
  }

  const saveEdit = (id: string) => {
    const payload = editMap[id]
    if (!payload) return
    const next = areas.map(a => a.id === id ? {
      ...a,
      name: (payload.name || '').trim() || a.name,
      type: payload.type || 'sala',
      openTime: payload.hasTwoServices ? undefined : (payload.openTime || '11:00'),
      closeTime: payload.hasTwoServices ? undefined : (payload.closeTime || '23:00'),
      hasTwoServices: !!payload.hasTwoServices,
      lunchOpen: payload.hasTwoServices ? (payload.lunchOpen || '12:00') : undefined,
      lunchClose: payload.hasTwoServices ? (payload.lunchClose || '15:00') : undefined,
      dinnerOpen: payload.hasTwoServices ? (payload.dinnerOpen || '19:00') : undefined,
      dinnerClose: payload.hasTwoServices ? (payload.dinnerClose || '23:00') : undefined,
      seatingsPerService: Math.max(1, Number(payload.seatingsPerService || 1)),
    } : a)
    saveAreas(next)
    setEditingId('')
  }

  const removeArea = (id: string) => {
    const next = areas.filter(a => a.id !== id)
    saveAreas(next)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Indietro</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">🏬 Sale</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aggiungi Sala */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aggiungi Sala</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Es. Mirabelle"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AreaType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="sala">Sala</option>
                  <option value="sala_colazioni">Sala Colazioni</option>
                  <option value="bar">Bar</option>
                  <option value="ristorante">Ristorante</option>
                  <option value="terrazza">Terrazza</option>
                  <option value="privé">Privé</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!form.hasTwoServices} onChange={(e) => setForm({ ...form, hasTwoServices: e.target.checked })} />
                  Due servizi (Pranzo/Cena)
                </label>
              </div>
              {!form.hasTwoServices ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Apertura</label>
                    <input type="time" value={form.openTime || ''} onChange={e => setForm({ ...form, openTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Chiusura</label>
                    <input type="time" value={form.closeTime || ''} onChange={e => setForm({ ...form, closeTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Apertura Pranzo</label>
                    <input type="time" value={form.lunchOpen || ''} onChange={e => setForm({ ...form, lunchOpen: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Chiusura Pranzo</label>
                    <input type="time" value={form.lunchClose || ''} onChange={e => setForm({ ...form, lunchClose: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Apertura Cena</label>
                    <input type="time" value={form.dinnerOpen || ''} onChange={e => setForm({ ...form, dinnerOpen: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Chiusura Cena</label>
                    <input type="time" value={form.dinnerClose || ''} onChange={e => setForm({ ...form, dinnerClose: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Turni per servizio</label>
                <input
                  type="number"
                  min={1}
                  value={form.seatingsPerService || 1}
                  onChange={(e) => setForm({ ...form, seatingsPerService: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <button onClick={addArea} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Aggiungi</button>
              </div>
            </div>
          </div>

          {/* Sale esistenti */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sale esistenti</h2>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {areas.length === 0 && (
                <div className="text-sm text-gray-600">Nessuna sala presente.</div>
              )}
              {areas.map(a => {
                const isEd = editingId === a.id
                const current = isEd ? editMap[a.id] : a
                return (
                  <div key={a.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      <button onClick={() => removeArea(a.id)} className="text-red-600 hover:text-red-800" title="Elimina">✕</button>
                    </div>
                    {!isEd ? (
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-gray-700">
                        <div><span className="font-semibold">Tipo:</span> {a.type}</div>
                        <div><span className="font-semibold">Turni/servizio:</span> {a.seatingsPerService || 1}</div>
                        {!a.hasTwoServices ? (
                          <>
                            <div><span className="font-semibold">Apertura:</span> {a.openTime || '-'}</div>
                            <div><span className="font-semibold">Chiusura:</span> {a.closeTime || '-'}</div>
                          </>
                        ) : (
                          <>
                            <div><span className="font-semibold">Pranzo:</span> {a.lunchOpen || '-'} - {a.lunchClose || '-'}</div>
                            <div><span className="font-semibold">Cena:</span> {a.dinnerOpen || '-'} - {a.dinnerClose || '-'}</div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Nome</label>
                          <input value={current?.name || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), name: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Tipo</label>
                          <select value={current?.type || 'sala'} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), type: e.target.value as AreaType } }))} className="w-full px-2 py-1 border border-gray-300 rounded">
                            <option value="sala">Sala</option>
                            <option value="sala_colazioni">Sala Colazioni</option>
                            <option value="bar">Bar</option>
                            <option value="ristorante">Ristorante</option>
                            <option value="terrazza">Terrazza</option>
                            <option value="privé">Privé</option>
                            <option value="altro">Altro</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="inline-flex items-center gap-2 text-xs text-gray-700 mb-1">
                            <input type="checkbox" checked={!!current?.hasTwoServices} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), hasTwoServices: e.target.checked } }))} />
                            Due servizi (Pranzo/Cena)
                          </label>
                        </div>
                        {!current?.hasTwoServices ? (
                          <>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Apertura</label>
                              <input type="time" value={current?.openTime || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), openTime: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Chiusura</label>
                              <input type="time" value={current?.closeTime || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), closeTime: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Apertura Pranzo</label>
                              <input type="time" value={current?.lunchOpen || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), lunchOpen: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Chiusura Pranzo</label>
                              <input type="time" value={current?.lunchClose || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), lunchClose: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Apertura Cena</label>
                              <input type="time" value={current?.dinnerOpen || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), dinnerOpen: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Chiusura Cena</label>
                              <input type="time" value={current?.dinnerClose || ''} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), dinnerClose: e.target.value } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Turni per servizio</label>
                          <input type="number" min={1} value={current?.seatingsPerService || 1} onChange={(e) => setEditMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || a), seatingsPerService: Math.max(1, parseInt(e.target.value || '1', 10)) } }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      {!isEd ? (
                        <button onClick={() => startEdit(a)} className="px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Modifica</button>
                      ) : (
                        <>
                          <button onClick={() => saveEdit(a.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">Salva</button>
                          <button onClick={cancelEdit} className="px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Annulla</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


