'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useCompanyData } from '@/hooks/useCompanyData'

type AreaType = 'sala' | 'sala_colazioni' | 'bar' | 'ristorante' | 'terrazza' | 'privé' | 'altro'

interface BookingArea {
  id: string
  name: string
  type: AreaType
  quantity: number // quante sale/ambienti di questo tipo
}

const STORAGE_KEY_BASE = 'booking_areas_v1'

export default function BookingSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [areas, setAreas] = useState<BookingArea[]>([])
  const [form, setForm] = useState<{ name: string; type: AreaType; quantity: string }>({ name: '', type: 'sala', quantity: '1' })
  const [storageKey, setStorageKey] = useState<string>('')

  // Resolve company fiscal code via shared hook
  const { data: companyData } = useCompanyData(session?.user?.id)
  useEffect(() => {
    const fiscal: string | undefined = companyData?.company?.fiscalCode
    if (fiscal) setStorageKey(`${STORAGE_KEY_BASE}::${fiscal}`)
    else setStorageKey('')
  }, [companyData])

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setAreas(JSON.parse(raw))
      else setAreas([
        { id: 'a1', name: 'Sala Principale', type: 'sala', quantity: 1 },
        { id: 'a2', name: 'Bar', type: 'bar', quantity: 1 },
        { id: 'a3', name: 'Ristorante', type: 'ristorante', quantity: 1 }
      ])
    } catch {}
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(areas))
      window.dispatchEvent(new CustomEvent('booking_areas_updated'))
    } catch {}
  }, [areas, storageKey])

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  if (!session) return null

  const addArea = () => {
    const quantity = Math.max(0, parseInt(form.quantity || '0', 10))
    if (!form.name.trim()) return
    const id = `area_${Date.now()}`
    setAreas(prev => [...prev, { id, name: form.name.trim(), type: form.type, quantity }])
    setForm({ name: '', type: 'sala', quantity: '1' })
  }

  const updateArea = (id: string, patch: Partial<BookingArea>) => {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  const removeArea = (id: string) => {
    setAreas(prev => prev.filter(a => a.id !== id))
  }

  return (
    <PermissionGuard permission="turni_manage">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/bookings')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">⚙️ Impostazioni Prenotazioni</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {!storageKey && (
            <div className="bg-white p-4 rounded shadow mb-6">Caricamento dati aziendali...</div>
          )}
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Aree / Sale</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="es. Sala Colazioni"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as AreaType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quante (numero di sale)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button onClick={addArea} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Aggiungi Area</button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Elenco Aree</h2>
              {areas.length === 0 ? (
                <div className="text-gray-500">Nessuna area configurata</div>
              ) : (
                <div className="space-y-3">
                  {areas.map(area => (
                    <div key={area.id} className="border rounded-lg p-3">
                      <div className="grid md:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Nome</label>
                          <input
                            value={area.name}
                            onChange={(e) => updateArea(area.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                          <select
                            value={area.type}
                            onChange={(e) => updateArea(area.id, { type: e.target.value as AreaType })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Numero di sale</label>
                          <input
                            type="number"
                            min={0}
                            value={area.quantity}
                            onChange={(e) => updateArea(area.id, { quantity: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button onClick={() => removeArea(area.id)} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Elimina</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}


