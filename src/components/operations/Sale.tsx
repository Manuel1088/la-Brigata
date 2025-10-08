'use client'
import { useEffect, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useSession } from 'next-auth/react'
import { useCompanyData } from '@/hooks/useCompanyData'

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

export default function OperationsSale() {
  const { data: session } = useSession()
  const [areas, setAreas] = useState<BookingArea[]>([])
  const [areasKey, setAreasKey] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingArea, setEditingArea] = useState<BookingArea | null>(null)

  // Form per nuova area
  const [form, setForm] = useState<BookingArea>({ 
    id: '', 
    name: '', 
    type: 'sala', 
    openTime: '11:00', 
    closeTime: '23:00', 
    seatingsPerService: 1, 
    hasTwoServices: false, 
    lunchOpen: '12:00', 
    lunchClose: '15:00', 
    dinnerOpen: '19:00', 
    dinnerClose: '23:00' 
  })

  const { data: companyData } = useCompanyData(session?.user?.id)

  const saveAreas = (next: BookingArea[]) => {
    setAreas(next)
    try {
      localStorage.setItem(areasKey, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('booking_areas_updated'))
    } catch (error) {
      console.error('Error saving areas:', error)
    }
  }

  // Carica aree
  useEffect(() => {
    let cancelled = false
    const fiscal: string | undefined = companyData?.company?.fiscalCode
    if (!fiscal) return
    const key = `booking_areas_v1::${fiscal}`
    setAreasKey(key)
    const load = () => {
      try {
        const raw = localStorage.getItem(key)
        const areasData = raw ? JSON.parse(raw) : []
        if (!cancelled) {
          setAreas(areasData)
          if (!selectedArea && areasData.length > 0) setSelectedArea(areasData[0].id)
        }
      } catch (error) {
        console.error('Error loading areas:', error)
        if (!cancelled) setAreas([])
      }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('booking_areas_updated', onUpdate as any) } catch {}
    return () => {
      try { window.removeEventListener('booking_areas_updated', onUpdate as any) } catch {}
      cancelled = true
    }
  }, [selectedArea, companyData])

  // ✅ HELPER: Parse sicuro per numeri
  const safeParseInt = (value: string, defaultValue: number = 1): number => {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : Math.max(1, parsed)
  }

  // ✅ HELPER: Statistiche per tipo
  const getAreaCountByType = (type: AreaType): number => {
    return areas.filter(a => a.type === type).length
  }

  const getTwoServicesCount = (): number => {
    return areas.filter(a => a.hasTwoServices).length
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = [...areas]
    if (editingArea) {
      const idx = next.findIndex(a => a.id === editingArea.id)
      if (idx >= 0) next[idx] = { ...form, id: editingArea.id }
    } else {
      next.push({ ...form, id: crypto.randomUUID() })
    }
    saveAreas(next)
    setShowAddModal(false)
    setEditingArea(null)
    resetForm()
  }

  const handleEdit = (area: BookingArea) => {
    setEditingArea(area)
    setForm({
      id: area.id,
      name: area.name,
      type: area.type,
      quantity: area.quantity,
      openTime: area.openTime || '11:00',
      closeTime: area.closeTime || '23:00',
      seatingsPerService: area.seatingsPerService || 1,
      hasTwoServices: area.hasTwoServices || false,
      lunchOpen: area.lunchOpen || '12:00',
      lunchClose: area.lunchClose || '15:00',
      dinnerOpen: area.dinnerOpen || '19:00',
      dinnerClose: area.dinnerClose || '23:00'
    })
    setShowAddModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa area?')) {
      const next = areas.filter(a => a.id !== id)
      saveAreas(next)
    }
  }

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      type: 'sala',
      openTime: '11:00',
      closeTime: '23:00',
      seatingsPerService: 1,
      hasTwoServices: false,
      lunchOpen: '12:00',
      lunchClose: '15:00',
      dinnerOpen: '19:00',
      dinnerClose: '23:00'
    })
  }

  const getAreaTypeLabel = (type: AreaType): string => {
    const labels: Record<AreaType, string> = {
      'sala': '🍽️ Sala',
      'sala_colazioni': '🌅 Sala Colazioni',
      'bar': '🍹 Bar',
      'ristorante': '🏛️ Ristorante',
      'terrazza': '🌿 Terrazza',
      'privé': '🔒 Privé',
      'altro': '🏢 Altro'
    }
    return labels[type] || type
  }

  const getAreaTypeColor = (type: AreaType): string => {
    const colors: Record<AreaType, string> = {
      'sala': 'bg-blue-50 border-blue-200',
      'sala_colazioni': 'bg-yellow-50 border-yellow-200',
      'bar': 'bg-green-50 border-green-200',
      'ristorante': 'bg-purple-50 border-purple-200',
      'terrazza': 'bg-emerald-50 border-emerald-200',
      'privé': 'bg-gray-50 border-gray-200',
      'altro': 'bg-gray-50 border-gray-200'
    }
    return colors[type] || 'bg-gray-50 border-gray-200'
  }

  const formatTime = (time: string): string => {
    return time.slice(0, 5) // HH:MM format
  }

  return (
    <PermissionGuard permission="areas_view">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🏢 Sale e Aree</h2>
              <p className="text-gray-600 mt-1">Configura le aree del ristorante e i loro orari</p>
            </div>
            
            <button
              onClick={() => {
                resetForm()
                setEditingArea(null)
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ➕ Nuova Area
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{areas.length}</div>
            <div className="text-sm text-blue-700">Aree Totali</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {getAreaCountByType('sala')}
            </div>
            <div className="text-sm text-green-700">Sale</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {getAreaCountByType('bar')}
            </div>
            <div className="text-sm text-purple-700">Bar</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {getTwoServicesCount()}
            </div>
            <div className="text-sm text-yellow-700">Doppio Servizio</div>
          </div>
        </div>

        {/* Lista aree */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aree Configurate</h3>
          </div>
          
          <div className="p-6">
            {areas.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🏢</div>
                <p className="text-gray-500">Nessuna area configurata</p>
                <p className="text-sm text-gray-400 mt-1">Aggiungi la prima area per iniziare</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areas.map(area => (
                  <div key={area.id} className={`border rounded-lg p-4 transition hover:shadow-md ${getAreaTypeColor(area.type)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{area.name}</h4>
                        <p className="text-sm text-gray-600">{getAreaTypeLabel(area.type)}</p>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(area)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(area.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-100 rounded transition"
                          title="Elimina"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Orari:</span>
                        <div className="font-medium">
                          {formatTime(area.openTime || '11:00')} - {formatTime(area.closeTime || '23:00')}
                        </div>
                      </div>
                      
                      {area.hasTwoServices && (
                        <div>
                          <span className="text-gray-600">Pranzo:</span>
                          <div className="font-medium">
                            {formatTime(area.lunchOpen || '12:00')} - {formatTime(area.lunchClose || '15:00')}
                          </div>
                          <span className="text-gray-600">Cena:</span>
                          <div className="font-medium">
                            {formatTime(area.dinnerOpen || '19:00')} - {formatTime(area.dinnerClose || '23:00')}
                          </div>
                        </div>
                      )}
                      
                      {area.quantity && (
                        <div>
                          <span className="text-gray-600">Quantità:</span>
                          <div className="font-medium">{area.quantity}</div>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-gray-600">Servizi per turno:</span>
                        <div className="font-medium">{area.seatingsPerService || 1}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal aggiunta/modifica area */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingArea ? '✏️ Modifica Area' : '➕ Nuova Area'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Area *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as AreaType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sala">🍽️ Sala</option>
                      <option value="sala_colazioni">🌅 Sala Colazioni</option>
                      <option value="bar">🍹 Bar</option>
                      <option value="ristorante">🏛️ Ristorante</option>
                      <option value="terrazza">🌿 Terrazza</option>
                      <option value="privé">🔒 Privé</option>
                      <option value="altro">🏢 Altro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantità (opzionale)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity || ''}
                    onChange={(e) => setForm(prev => ({ 
                      ...prev, 
                      quantity: e.target.value ? safeParseInt(e.target.value, 1) : undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Numero di tavoli o posti"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apertura</label>
                    <input
                      type="time"
                      value={form.openTime}
                      onChange={(e) => setForm(prev => ({ ...prev, openTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chiusura</label>
                    <input
                      type="time"
                      value={form.closeTime}
                      onChange={(e) => setForm(prev => ({ ...prev, closeTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Servizi per turno</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.seatingsPerService}
                    onChange={(e) => setForm(prev => ({ 
                      ...prev, 
                      seatingsPerService: safeParseInt(e.target.value, 1) 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasTwoServices"
                    checked={form.hasTwoServices}
                    onChange={(e) => setForm(prev => ({ ...prev, hasTwoServices: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="hasTwoServices" className="ml-2 text-sm text-gray-700">
                    Doppio servizio (Pranzo e Cena separati)
                  </label>
                </div>

                {form.hasTwoServices && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">🌞 Pranzo - Apertura</label>
                      <input
                        type="time"
                        value={form.lunchOpen}
                        onChange={(e) => setForm(prev => ({ ...prev, lunchOpen: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">🌞 Pranzo - Chiusura</label>
                      <input
                        type="time"
                        value={form.lunchClose}
                        onChange={(e) => setForm(prev => ({ ...prev, lunchClose: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">🌙 Cena - Apertura</label>
                      <input
                        type="time"
                        value={form.dinnerOpen}
                        onChange={(e) => setForm(prev => ({ ...prev, dinnerOpen: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">🌙 Cena - Chiusura</label>
                      <input
                        type="time"
                        value={form.dinnerClose}
                        onChange={(e) => setForm(prev => ({ ...prev, dinnerClose: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingArea(null)
                      resetForm()
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    💾 {editingArea ? 'Aggiorna' : 'Salva'} Area
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}