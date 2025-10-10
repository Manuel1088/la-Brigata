'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'

interface RestaurantRoom {
  id: string
  name: string
  capacity: number
  tables: number
  icon: string
  isActive: boolean
}

interface OpeningHours {
  [key: string]: { open: string; close: string; isClosed: boolean }
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lunedì' },
  { id: 'tuesday', label: 'Martedì' },
  { id: 'wednesday', label: 'Mercoledì' },
  { id: 'thursday', label: 'Giovedì' },
  { id: 'friday', label: 'Venerdì' },
  { id: 'saturday', label: 'Sabato' },
  { id: 'sunday', label: 'Domenica' }
]

const ROOM_ICONS = ['🍽️', '🌿', '👑', '🎉', '🏛️', '🌅', '🎨']

export default function SettingsRestaurant() {
  const { data: session } = useSession()
  const { restaurant, isLoading } = useCompanyData(session?.user?.id)
  
  const [activeSection, setActiveSection] = useState<'rooms' | 'hours'>('rooms')
  const [rooms, setRooms] = useState<RestaurantRoom[]>([])
  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    monday: { open: '12:00', close: '23:00', isClosed: false },
    tuesday: { open: '12:00', close: '23:00', isClosed: false },
    wednesday: { open: '12:00', close: '23:00', isClosed: false },
    thursday: { open: '12:00', close: '23:00', isClosed: false },
    friday: { open: '12:00', close: '00:00', isClosed: false },
    saturday: { open: '12:00', close: '00:00', isClosed: false },
    sunday: { open: '12:00', close: '22:00', isClosed: false }
  })
  
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, tables: 0, icon: '🍽️' })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Carica dati da localStorage
  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem('restaurant_rooms')
      if (savedRooms) {
        setRooms(JSON.parse(savedRooms))
      } else {
        // Dati iniziali di default
        setRooms([
          { id: '1', name: 'Sala Principale', capacity: 60, tables: 15, icon: '🍽️', isActive: true },
          { id: '2', name: 'Dehors', capacity: 30, tables: 8, icon: '🌿', isActive: true }
        ])
      }

      const savedHours = localStorage.getItem('restaurant_hours')
      if (savedHours) {
        setOpeningHours(JSON.parse(savedHours))
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error)
    }
  }, [])

  const handleAddRoom = () => {
    if (!newRoom.name || newRoom.capacity <= 0 || newRoom.tables <= 0) {
      setMessage('❌ Compila tutti i campi della sala')
      return
    }
    
    const room: RestaurantRoom = {
      id: Date.now().toString(),
      ...newRoom,
      isActive: true
    }
    
    const updatedRooms = [...rooms, room]
    setRooms(updatedRooms)
    localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    
    setNewRoom({ name: '', capacity: 0, tables: 0, icon: '🍽️' })
    setShowAddRoom(false)
    setMessage('✅ Sala aggiunta con successo!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRemoveRoom = (roomId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sala?')) return
    
    const updatedRooms = rooms.filter(r => r.id !== roomId)
    setRooms(updatedRooms)
    localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
    
    setMessage('✅ Sala eliminata')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleToggleRoom = (roomId: string) => {
    const updatedRooms = rooms.map(r => 
      r.id === roomId ? { ...r, isActive: !r.isActive } : r
    )
    setRooms(updatedRooms)
    localStorage.setItem('restaurant_rooms', JSON.stringify(updatedRooms))
  }

  const handleSaveHours = () => {
    setIsSaving(true)
    localStorage.setItem('restaurant_hours', JSON.stringify(openingHours))
    setMessage('✅ Orari salvati con successo!')
    setTimeout(() => {
      setMessage('')
      setIsSaving(false)
    }, 2000)
  }

  const totalCapacity = rooms.filter(r => r.isActive).reduce((sum, r) => sum + r.capacity, 0)
  const totalTables = rooms.filter(r => r.isActive).reduce((sum, r) => sum + r.tables, 0)

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.includes('✅') 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Restaurant Info from API */}
      {restaurant && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🍽️ {restaurant.name}</h3>
          {restaurant.address && (
            <p className="text-sm text-blue-700">📍 {restaurant.address}</p>
          )}
        </div>
      )}

      {/* Section Selector */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveSection('rooms')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeSection === 'rooms'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="text-xl mr-2">🏛️</span>
          Sale
        </button>
        <button
          onClick={() => setActiveSection('hours')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeSection === 'hours'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="text-xl mr-2">🕐</span>
          Orari
        </button>
      </div>

      {/* Section: Rooms */}
      {activeSection === 'rooms' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{rooms.filter(r => r.isActive).length}</div>
              <div className="text-sm text-blue-700">Sale Attive</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{totalTables}</div>
              <div className="text-sm text-green-700">Tavoli</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{totalCapacity}</div>
              <div className="text-sm text-purple-700">Coperti</div>
            </div>
          </div>

          {/* Add Room Button */}
          <button
            onClick={() => setShowAddRoom(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-600 transition font-medium"
          >
            ➕ Aggiungi Sala
          </button>

          {/* Rooms List */}
          <div className="space-y-4">
            {rooms.map(room => (
              <div
                key={room.id}
                className={`border-2 rounded-lg p-4 ${
                  room.isActive ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{room.icon}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{room.name}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {room.capacity} posti • {room.tables} tavoli
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleRoom(room.id)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        room.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {room.isActive ? '✓ Attiva' : '✗ Disattiva'}
                    </button>
                    <button
                      onClick={() => handleRemoveRoom(room.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
      )}

      {/* Section: Opening Hours */}
      {activeSection === 'hours' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Orari di Apertura</h3>
          
          {DAYS_OF_WEEK.map(day => (
            <div key={day.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
              <div className="w-32 font-medium text-gray-900">{day.label}</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!openingHours[day.id].isClosed}
                  onChange={(e) => setOpeningHours(prev => ({
                    ...prev,
                    [day.id]: { ...prev[day.id], isClosed: !e.target.checked }
                  }))}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-600">Aperto</span>
              </label>
              
              {!openingHours[day.id].isClosed && (
                <>
                  <input
                    type="time"
                    value={openingHours[day.id].open}
                    onChange={(e) => setOpeningHours(prev => ({
                      ...prev,
                      [day.id]: { ...prev[day.id], open: e.target.value }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="time"
                    value={openingHours[day.id].close}
                    onChange={(e) => setOpeningHours(prev => ({
                      ...prev,
                      [day.id]: { ...prev[day.id], close: e.target.value }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </>
              )}
              
              {openingHours[day.id].isClosed && (
                <span className="text-red-600 font-medium">Chiuso</span>
              )}
            </div>
          ))}

          <button
            onClick={handleSaveHours}
            disabled={isSaving}
            className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva Orari'}
          </button>
        </div>
      )}
    </div>
  )
}

