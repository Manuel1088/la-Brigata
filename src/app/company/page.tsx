'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useCompanyData } from '@/hooks/useCompanyData'

interface DayHours {
  open: string
  close: string
  isClosed: boolean
}

type DayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

type OpeningHours = Record<DayId, DayHours>

interface RestaurantRoom {
  id: string
  name: string
  capacity: number
  tables: number
  icon: string
  isActive: boolean
  openingHours: OpeningHours
}

type OutletType = 'RISTORANTE' | 'COLAZIONI' | 'BAR' | 'SKYBAR' | 'ALTRO'

interface Outlet {
  id: string
  name: string
  type: OutletType
  icon: string
  isActive: boolean
  address?: string
  openingHours: OpeningHours
  rooms: RestaurantRoom[]
}

const DAYS_OF_WEEK: Array<{ id: DayId; label: string }> = [
  { id: 'monday', label: 'Lunedì' },
  { id: 'tuesday', label: 'Martedì' },
  { id: 'wednesday', label: 'Mercoledì' },
  { id: 'thursday', label: 'Giovedì' },
  { id: 'friday', label: 'Venerdì' },
  { id: 'saturday', label: 'Sabato' },
  { id: 'sunday', label: 'Domenica' }
]

const ROOM_ICONS = ['🍽️', '🌿', '👑', '🎉', '🏛️', '🌅', '🎨']

export default function CompanyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageCompany } = usePermissions()
  const { company: companyData, restaurant: restaurantData, isLoading } = useCompanyData(session?.user?.id)
  
  const [activeTab, setActiveTab] = useState<'info' | 'outlets' | 'rooms' | 'stats'>('info')
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    fiscalCode: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  })
  
  // Restaurant form
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    address: '',
    phone: ''
  })
  
  // Rooms & Hours
  const [rooms, setRooms] = useState<RestaurantRoom[]>([])
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, tables: 0, icon: '🍽️' })

  // Outlets (Punti Ristoro)
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutletId, setSelectedOutletId] = useState<string>('')
  const [showAddOutlet, setShowAddOutlet] = useState(false)
  const [newOutlet, setNewOutlet] = useState<{ name: string, type: OutletType, icon: string }>({ name: '', type: 'RISTORANTE', icon: '🍽️' })
  const [addRoomTarget, setAddRoomTarget] = useState<'outlet' | 'standalone'>('outlet')
  
  // Orari predefiniti per nuove sale
  const getDefaultHours = (): OpeningHours => ({
    monday: { open: '12:00', close: '23:00', isClosed: false },
    tuesday: { open: '12:00', close: '23:00', isClosed: false },
    wednesday: { open: '12:00', close: '23:00', isClosed: false },
    thursday: { open: '12:00', close: '23:00', isClosed: false },
    friday: { open: '12:00', close: '00:00', isClosed: false },
    saturday: { open: '12:00', close: '00:00', isClosed: false },
    sunday: { open: '12:00', close: '22:00', isClosed: false }
  })

  const normalizeOpeningHours = (
    hours: Partial<Record<DayId, Partial<DayHours>>> | undefined
  ): OpeningHours => {
    const base: OpeningHours = getDefaultHours()
    if (!hours) return base
    const result: OpeningHours = { ...(base as OpeningHours) }
    ;(Object.keys(base) as Array<keyof OpeningHours>).forEach((dayKey: keyof OpeningHours) => {
      const day = dayKey as DayId
      const h = (hours as Partial<Record<DayId, Partial<DayHours>>>)[day]
      if (h) {
        result[day] = {
          open: h.open ?? base[day].open,
          close: h.close ?? base[day].close,
          isClosed: h.isClosed ?? base[day].isClosed,
        }
      }
    })
    return result
  }

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

  // Carica dati company da API
  useEffect(() => {
    if (companyData) {
      setCompanyForm({
        name: (companyData as { name?: string }).name || '',
        fiscalCode: (companyData as { fiscalCode?: string }).fiscalCode || '',
        address: (companyData as { address?: string }).address || '',
        phone: (companyData as { phone?: string }).phone || '',
        email: (companyData as { email?: string }).email || '',
        website: ''
      })
    }
  }, [companyData])

  // Carica dati restaurant da API
  useEffect(() => {
    if (restaurantData) {
      setRestaurantForm({
        name: (restaurantData as { name?: string }).name || '',
        address: (restaurantData as { address?: string }).address || '',
        phone: (restaurantData as { phone?: string }).phone || ''
      })
    }
  }, [restaurantData])

  // Carica rooms e hours da localStorage
  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem('restaurant_rooms')
      if (savedRooms) {
        const parsedUnknown = JSON.parse(savedRooms) as unknown
        const arr = Array.isArray(parsedUnknown) ? (parsedUnknown as RestaurantRoom[]) : []
        const normalized = arr.map((r) => ({
          ...r,
          openingHours: normalizeOpeningHours(r.openingHours as Partial<Record<DayId, Partial<DayHours>>> | undefined)
        }))
        setRooms(normalized)
      } else {
        setRooms([
          { id: '1', name: 'Sala Principale', capacity: 60, tables: 15, icon: '🍽️', isActive: true, openingHours: getDefaultHours() },
          { id: '2', name: 'Dehors', capacity: 30, tables: 8, icon: '🌿', isActive: true, openingHours: getDefaultHours() }
        ])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [])

  // Punti Ristoro (Outlets): carica/migra da localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('company_outlets')
      if (raw) {
        const parsed: Outlet[] = JSON.parse(raw) || []
        const normalized = parsed.map(o => ({
          ...o,
          openingHours: normalizeOpeningHours(o.openingHours as Partial<Record<DayId, Partial<DayHours>>> | undefined),
          rooms: (o.rooms || []).map(r => ({
            ...r,
            openingHours: normalizeOpeningHours(r.openingHours as Partial<Record<DayId, Partial<DayHours>>> | undefined)
          }))
        }))
        setOutlets(normalized)
        if (!selectedOutletId && normalized.length > 0) setSelectedOutletId(normalized[0].id)
      } else {
        // Migrazione semplice: crea un outlet di default con le sale esistenti
        const defaultOutlet: Outlet = {
          id: 'outlet_default',
          name: 'Punto Ristoro',
          type: 'RISTORANTE',
          icon: '🍽️',
          isActive: true,
          openingHours: getDefaultHours(),
          rooms: rooms && rooms.length > 0 ? rooms : [
            { id: '1', name: 'Sala Principale', capacity: 60, tables: 15, icon: '🍽️', isActive: true, openingHours: getDefaultHours() }
          ]
        }
        setOutlets([defaultOutlet])
        setSelectedOutletId(defaultOutlet.id)
        try { localStorage.setItem('company_outlets', JSON.stringify([defaultOutlet])) } catch {}
      }
    } catch {}
  }, [rooms, selectedOutletId])

  const persistOutlets = (next: Outlet[]) => {
    setOutlets(next)
    try { localStorage.setItem('company_outlets', JSON.stringify(next)) } catch {}
  }

  const handleSaveCompany = async () => {
    if (!companyData || !(companyData as { id?: string }).id) return
    
    setIsSaving(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: (companyData as { id: string }).id,
          ...companyForm
        })
      })

      if (!response.ok) {
        throw new Error('Errore nel salvataggio')
      }

      setMessage('✅ Dati azienda salvati!')
      setIsEditingCompany(false)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ Errore nel salvataggio azienda')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRestaurant = async () => {
    if (!restaurantData || !(restaurantData as { id?: string }).id) return
    
    setIsSaving(true)
    setMessage('')
    
    try {
      const response = await fetch(`/api/restaurants/${(restaurantData as { id: string }).id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restaurantForm)
      })

      if (!response.ok) {
        throw new Error('Errore nel salvataggio')
      }

      setMessage('✅ Dati ristorante salvati!')
      setIsEditingRestaurant(false)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ Errore nel salvataggio ristorante')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddRoom = () => {
    if (!newRoom.name || newRoom.capacity <= 0 || newRoom.tables <= 0) {
      setMessage('❌ Compila tutti i campi della sala')
      return
    }
    
    const room: RestaurantRoom = {
      id: Date.now().toString(),
      ...newRoom,
      isActive: true,
      openingHours: getDefaultHours()
    }
    // Destinazione: outlet selezionato oppure standalone
    if (addRoomTarget === 'outlet' && selectedOutletId) {
      const updated = outlets.map(o => o.id === selectedOutletId ? { ...o, rooms: [...(o.rooms || []), room] } : o)
      persistOutlets(updated)
    } else {
      const updatedRooms = [...rooms, room]
      setRooms(updatedRooms)
      localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    }
    
    setNewRoom({ name: '', capacity: 0, tables: 0, icon: '🍽️' })
    setShowAddRoom(false)
    setMessage('✅ Sala aggiunta con successo!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRemoveRoom = (roomId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sala?')) return
    
    if (selectedOutletId) {
      const updated = outlets.map(o => o.id === selectedOutletId ? { ...o, rooms: o.rooms.filter(r => r.id !== roomId) } : o)
      persistOutlets(updated)
    } else {
      const updatedRooms = rooms.filter(r => r.id !== roomId)
      setRooms(updatedRooms)
      localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    }
    setMessage('✅ Sala eliminata')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleToggleRoom = (roomId: string) => {
    if (selectedOutletId) {
      const updated = outlets.map(o => o.id === selectedOutletId ? { ...o, rooms: o.rooms.map(r => r.id === roomId ? { ...r, isActive: !r.isActive } : r) } : o)
      persistOutlets(updated)
    } else {
      const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, isActive: !r.isActive } : r)
      setRooms(updatedRooms)
      localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    }
  }

  const handleUpdateRoomHours = (
    roomId: string,
    day: DayId,
    field: 'open' | 'close' | 'isClosed',
    value: string | boolean
  ) => {
    const updatedRooms = rooms.map(room => {
      if (room.id === roomId) {
        const defaultHours = getDefaultHours()
        const existingOpening = room.openingHours || defaultHours
        const existingDay = existingOpening[day] || { open: '12:00', close: '23:00', isClosed: false }
        return {
          ...room,
          openingHours: {
            ...existingOpening,
            [day]: field === 'isClosed' 
              ? { ...existingDay, isClosed: Boolean(value) }
              : { ...existingDay, [field]: String(value) }
          }
        }
      }
      return room
    })
    setRooms(updatedRooms)
    localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    setMessage('✅ Orari aggiornati')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleUpdateOutletHours = (
    outletId: string,
    day: DayId,
    field: 'open' | 'close' | 'isClosed',
    value: string | boolean
  ) => {
    const updated = outlets.map(o => {
      if (o.id !== outletId) return o
      const defaultHours = getDefaultHours()
      const existingOpening = o.openingHours || defaultHours
      const existingDay = existingOpening[day] || { open: '12:00', close: '23:00', isClosed: false }
      return {
        ...o,
        openingHours: {
          ...existingOpening,
          [day]: field === 'isClosed'
            ? { ...existingDay, isClosed: Boolean(value) }
            : { ...existingDay, [field]: String(value) }
        }
      }
    })
    persistOutlets(updated)
    setMessage('✅ Orari punto ristoro aggiornati')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleCopyHoursToAll = (sourceRoomId: string) => {
    const sourceRoom = rooms.find(r => r.id === sourceRoomId)
    if (!sourceRoom) return

    const updatedRooms = rooms.map(room => ({
      ...room,
      openingHours: { ...sourceRoom.openingHours }
    }))
    
    setRooms(updatedRooms)
    localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    setMessage('✅ Orari copiati in tutte le sale')
    setTimeout(() => setMessage(''), 2000)
  }

  const totalCapacity = rooms.filter(r => r.isActive).reduce((sum, r) => sum + r.capacity, 0)
  const totalTables = rooms.filter(r => r.isActive).reduce((sum, r) => sum + r.tables, 0)

  if (status === 'loading' || isLoading) {
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

  const tabs = [
    { id: 'info', label: 'Informazioni', icon: '📋' },
    { id: 'outlets', label: 'Punti Ristoro', icon: '🍽️' },
    { id: 'rooms', label: 'Sale & Orari', icon: '🏛️' },
    { id: 'stats', label: 'Statistiche', icon: '📊' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🏢 {(companyData as { name?: string } | undefined)?.name || 'La Mia Azienda'}
              </h1>
              <p className="text-gray-600 mt-2">
                Gestione centralizzata azienda e ristoranti
              </p>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.includes('✅') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'info' | 'outlets' | 'rooms' | 'stats')}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-orange-500 text-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Informazioni Azienda */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">📋 Dati Aziendali</h3>
                  <div className="flex gap-2">
                    {isEditingCompany ? (
                      <>
                        <button
                          onClick={() => setIsEditingCompany(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={handleSaveCompany}
                          disabled={isSaving}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          {isSaving ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingCompany(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Modifica
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Nome Azienda */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Azienda
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.name || 'Non specificato'}</p>
                    )}
                  </div>

                  {/* Codice Fiscale */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Codice Fiscale / P.IVA
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.fiscalCode}
                        onChange={(e) => setCompanyForm({...companyForm, fiscalCode: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.fiscalCode || 'Non specificato'}</p>
                    )}
                  </div>

                  {/* Indirizzo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sede Legale
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Via, Città, CAP"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.address || 'Non specificato'}</p>
                    )}
                  </div>

                  {/* Telefono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefono
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="tel"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.phone || 'Non specificato'}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Aziendale
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.email || 'Non specificato'}</p>
                    )}
                  </div>

                  {/* Sito Web */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sito Web
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="url"
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({...companyForm, website: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="https://..."
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.website || 'Non specificato'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Punti Ristoro */}
            {activeTab === 'outlets' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">🍽️ Punti Ristoro</h3>
                  <button
                    onClick={() => setShowAddOutlet(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ➕ Aggiungi Punto Ristoro
                  </button>
                </div>

                {/* Selettore Outlet */}
                {outlets.length > 0 && (
                  <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🍽️</span>
                      <select
                        value={selectedOutletId}
                        onChange={(e) => setSelectedOutletId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {outlets.map(o => (
                          <option key={o.id} value={o.id}>{o.name} • {o.type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Editor orari PUNTO RISTORO + elenco sale con override */}
                {selectedOutletId && (
                  <div className="space-y-6">
                    {/* Orari Punto Ristoro (unificati Lun-Dom) */}
                    <div className="border-2 border-blue-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">🕐 Orari Punto Ristoro (Lun-Dom)</h4>
                      {(() => {
                        const o = outlets.find(o => o.id === selectedOutletId)!
                        const openObj = o.openingHours || getDefaultHours()
                        const d = openObj['monday'] || { open: '12:00', close: '23:00', isClosed: false }
                        return (
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                            <div className="w-28 font-medium text-gray-900 text-sm">Tutti i giorni</div>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!d.isClosed}
                                onChange={(e) => {
                                  const v = !e.target.checked
                                  DAYS_OF_WEEK.forEach(day => handleUpdateOutletHours(selectedOutletId, day.id, 'isClosed', v))
                                }}
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                              <span className="text-xs text-gray-600">Aperto</span>
                            </label>
                            {!d.isClosed ? (
                              <>
                                <input
                                  type="time"
                                  value={d.open}
                                  onChange={(e) => DAYS_OF_WEEK.forEach(day => handleUpdateOutletHours(selectedOutletId, day.id, 'open', e.target.value))}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <span className="text-gray-500 text-sm">-</span>
                                <input
                                  type="time"
                                  value={d.close}
                                  onChange={(e) => DAYS_OF_WEEK.forEach(day => handleUpdateOutletHours(selectedOutletId, day.id, 'close', e.target.value))}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </>
                            ) : (
                              <span className="text-red-600 font-medium text-sm">Chiuso</span>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Sale dell'outlet selezionato */}
                    <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-gray-900">🏛️ Sale</h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={addRoomTarget}
                          onChange={(e) => setAddRoomTarget(e.target.value as 'outlet' | 'standalone')}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          title="Dove aggiungere la sala"
                        >
                          <option value="outlet">Nel punto ristoro selezionato</option>
                          <option value="standalone">Indipendente (non legata a punto ristoro)</option>
                        </select>
                        <button
                          onClick={() => setShowAddRoom(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          ➕ Aggiungi Sala
                        </button>
                      </div>
                    </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(outlets.find(o => o.id === selectedOutletId)?.rooms || []).map(room => (
                          <div key={room.id} className={`border-2 rounded-lg p-4 ${room.isActive ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-4xl">{room.icon}</div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleToggleRoom(room.id)}
                                  className={`px-2 py-1 rounded text-xs font-medium ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                >
                                  {room.isActive ? '✓' : '✗'}
                                </button>
                                <button
                                  onClick={() => handleRemoveRoom(room.id)}
                                  className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <h5 className="font-semibold text-gray-900 mb-2">{room.name}</h5>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex justify-between">
                                <span>Capacità:</span>
                                <span className="font-medium">{room.capacity} posti</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tavoli:</span>
                                <span className="font-medium">{room.tables}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sale indipendenti (non collegate ad alcun punto ristoro) */}
                {rooms.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-gray-900">🏛️ Sale indipendenti</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setAddRoomTarget('standalone'); setShowAddRoom(true) }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          ➕ Aggiungi Sala Indipendente
                        </button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rooms.map(room => (
                        <div key={room.id} className={`border-2 rounded-lg p-4 ${room.isActive ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-4xl">{room.icon}</div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Indipendente</span>
                              <button
                                onClick={() => handleToggleRoom(room.id)}
                                className={`px-2 py-1 rounded text-xs font-medium ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                              >
                                {room.isActive ? '✓' : '✗'}
                              </button>
                              <button
                                onClick={() => handleRemoveRoom(room.id)}
                                className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <h5 className="font-semibold text-gray-900 mb-2">{room.name}</h5>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Capacità:</span>
                              <span className="font-medium">{room.capacity} posti</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tavoli:</span>
                              <span className="font-medium">{room.tables}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Sale & Orari */}
            {activeTab === 'rooms' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{rooms.filter(r => r.isActive).length}</div>
                    <div className="text-sm text-blue-700">Sale Attive</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{totalTables}</div>
                    <div className="text-sm text-green-700">Tavoli Totali</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{totalCapacity}</div>
                    <div className="text-sm text-purple-700">Coperti Totali</div>
                  </div>
                </div>

                {/* Gestione Sale */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">🏛️ Sale</h4>
                    <button
                      onClick={() => setShowAddRoom(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ➕ Aggiungi Sala
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map(room => (
                      <div
                        key={room.id}
                        className={`border-2 rounded-lg p-4 ${
                          room.isActive ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-4xl">{room.icon}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleRoom(room.id)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                room.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {room.isActive ? '✓' : '✗'}
                            </button>
                            <button
                              onClick={() => handleRemoveRoom(room.id)}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <h5 className="font-semibold text-gray-900 mb-2">{room.name}</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Capacità:</span>
                            <span className="font-medium">{room.capacity} posti</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tavoli:</span>
                            <span className="font-medium">{room.tables}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orari Apertura per Sala */}
                {rooms.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">🕐 Orari di Apertura per Sala</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      💡 Ogni sala può avere orari di apertura indipendenti
                    </p>
                    <div className="space-y-6">
                      {rooms.filter(r => r.isActive).map(room => (
                        <div key={room.id} className="border-2 border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{room.icon}</span>
                              <h5 className="text-lg font-semibold text-gray-900">{room.name}</h5>
                            </div>
                            {rooms.filter(r => r.isActive).length > 1 && (
                              <button
                                onClick={() => handleCopyHoursToAll(room.id)}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                                title="Copia questi orari in tutte le altre sale"
                              >
                                📋 Copia in tutte
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {DAYS_OF_WEEK.map(day => (
                              <div key={day.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                                <div className="w-28 font-medium text-gray-900 text-sm">{day.label}</div>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!(room.openingHours && room.openingHours[day.id] ? room.openingHours[day.id].isClosed : false)}
                                    onChange={(e) => handleUpdateRoomHours(room.id, day.id, 'isClosed', !e.target.checked)}
                                    className="w-4 h-4 text-orange-600 rounded"
                                  />
                                  <span className="text-xs text-gray-600">Aperto</span>
                                </label>
                                
                                {!(room.openingHours && room.openingHours[day.id] ? room.openingHours[day.id].isClosed : false) ? (
                                  <>
                                    <input
                                      type="time"
                                      value={(room.openingHours && room.openingHours[day.id] ? room.openingHours[day.id].open : '12:00')}
                                      onChange={(e) => handleUpdateRoomHours(room.id, day.id, 'open', e.target.value)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <span className="text-gray-500 text-sm">-</span>
                                    <input
                                      type="time"
                                      value={(room.openingHours && room.openingHours[day.id] ? room.openingHours[day.id].close : '23:00')}
                                      onChange={(e) => handleUpdateRoomHours(room.id, day.id, 'close', e.target.value)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </>
                                ) : (
                                  <span className="text-red-600 font-medium text-sm">Chiuso</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {rooms.filter(r => r.isActive).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>Nessuna sala attiva. Aggiungi una sala per configurare gli orari.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Statistiche */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">📊 Overview Aziendale</h3>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Total Restaurants */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
                    <div className="text-4xl mb-3">🍽️</div>
                    <div className="text-3xl font-bold text-orange-600">1</div>
                    <div className="text-sm text-orange-700 mt-1">Ristoranti Attivi</div>
                  </div>

                  {/* Total Capacity */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="text-4xl mb-3">👥</div>
                    <div className="text-3xl font-bold text-blue-600">{totalCapacity}</div>
                    <div className="text-sm text-blue-700 mt-1">Coperti Totali</div>
                  </div>

                  {/* Total Rooms */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="text-4xl mb-3">🏛️</div>
                    <div className="text-3xl font-bold text-purple-600">{rooms.filter(r => r.isActive).length}</div>
                    <div className="text-sm text-purple-700 mt-1">Sale Operative</div>
                  </div>
                </div>

                {/* Future features */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-2">📈 Prossime Features</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Occupancy rate medio per location</li>
                    <li>• Revenue per ristorante</li>
                    <li>• Performance comparison multi-location</li>
                    <li>• Employee distribution across locations</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Aggiungi Nuova Sala</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Sala
                </label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="es. Sala Privata"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacità (posti)
                </label>
                <input
                  type="number"
                  value={newRoom.capacity || ''}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Tavoli
                </label>
                <input
                  type="number"
                  value={newRoom.tables || ''}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, tables: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icona
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ROOM_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewRoom(prev => ({ ...prev, icon }))}
                      className={`text-3xl p-2 rounded border-2 ${
                        newRoom.icon === icon ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddRoom(false)
                    setNewRoom({ name: '', capacity: 0, tables: 0, icon: '🍽️' })
                  }}
                  className="flex-1 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddRoom}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

