'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { useCompanyData } from '@/hooks/useCompanyData'

interface Booking {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: string
  time: string
  partySize: number
  tableNumber: number | null
  status: string
  notes: string
  createdAt: string
}

interface Table {
  id: string
  tableNumber: number
  seats: number
  status: string
}

// Layout per la mappa tavoli
interface TableItem {
  id: string
  tableNumber: number
  seats: number
  x: number
  y: number
  w: number
  h: number
}

interface WalkinEntry {
  id: string
  date: string
  time: string
  tableNumber: number | null
  covers: number
  areaId: string
  createdAt: string
}

export default function OperationsBookings() {
  const { data: session } = useSession()
  const router = useRouter()
  const { can } = usePermissions()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showAreaSelectModal, setShowAreaSelectModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [selectedTime, setSelectedTime] = useState<string>('19:00')
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [areas, setAreas] = useState<Array<{id: string, name: string}>>([])
  const [areasKey, setAreasKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [tableLayout, setTableLayout] = useState<TableItem[]>([])
  const [draggedTable, setDraggedTable] = useState<TableItem | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const floorPlanRef = useRef<HTMLDivElement>(null)
  const lunchRef = useRef<HTMLDivElement>(null)
  const dinnerFirstRef = useRef<HTMLDivElement>(null)
  const dinnerSecondRef = useRef<HTMLDivElement>(null)

  // Passanti state
  const [walkins, setWalkins] = useState<WalkinEntry[]>([])
  const [walkinTable] = useState<number>(1) // Tavolo fisso 1
  const [walkinCovers, setWalkinCovers] = useState<number>(2)

  // Form per nuova prenotazione
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    notes: '',
    tableNumber: null as number | null
  })

  const { data: companyData } = useCompanyData(session?.user?.id)
  const restaurantId = session?.user?.restaurantId as string | undefined

  // Carica aree di prenotazione
  useEffect(() => {
    let cancelled = false
    const fiscal: string | undefined = (companyData as { company?: { fiscalCode?: string } } | undefined)?.company?.fiscalCode
    if (!fiscal) return
    const key = `booking_areas_v1::${fiscal}`
    setAreasKey(key)
    const load = () => {
      try {
        const raw = localStorage.getItem(key)
        const areasData = raw ? JSON.parse(raw) : [] as Array<{ id: string; name: string }>
        const areaList = (areasData || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))
        if (!cancelled) {
          setAreas(areaList)
          if (!selectedArea && areaList.length > 0) setSelectedArea(areaList[0].id)
        }
      } catch {
        if (!cancelled) setAreas([])
      }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('booking_areas_updated', onUpdate) } catch {}
    return () => { try { window.removeEventListener('booking_areas_updated', onUpdate) } catch {}; cancelled = true }
  }, [selectedArea, companyData])

  // Carica prenotazioni da API
  useEffect(() => {
    const loadBookings = async () => {
      if (!restaurantId || !selectedDate) {
        setBookings([])
        return
      }
      try {
        const params = new URLSearchParams({
          restaurantId,
          date: selectedDate,
        })
        if (selectedArea) params.set('area', selectedArea)
        const res = await fetch(`/api/bookings?${params}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Caricamento prenotazioni fallito')
        const data = await res.json()
        setBookings((data.bookings ?? []) as Booking[])
      } catch {
        setBookings([])
      }
    }
    loadBookings()
  }, [selectedDate, selectedArea, restaurantId])

  // Carica passanti
  useEffect(() => {
    try {
      const key = `walkins_v1::${selectedDate}::${selectedArea}`
      const raw = localStorage.getItem(key)
      const data = raw ? JSON.parse(raw) : []
      setWalkins(data)
    } catch {
      setWalkins([])
    }
  }, [selectedDate, selectedArea])

  // Carica tavoli da API (migra da localStorage se DB vuoto)
  useEffect(() => {
    const loadTables = async () => {
      if (!restaurantId) {
        setTables([])
        return
      }
      try {
        const res = await fetch(
          `/api/tables?restaurantId=${encodeURIComponent(restaurantId)}`,
          { credentials: 'include' }
        )
        if (!res.ok) throw new Error('Caricamento tavoli fallito')
        const data = await res.json()
        let list = (data.tables ?? []) as Table[]

        if (list.length === 0 && selectedArea) {
          try {
            const raw = localStorage.getItem(`tables_v1::${selectedArea}`)
            const localTables = raw ? (JSON.parse(raw) as Table[]) : []
            for (const t of localTables) {
              await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  restaurantId,
                  tableNumber: t.tableNumber,
                  seats: t.seats,
                  status: t.status || 'available',
                }),
              })
            }
            if (localTables.length > 0) {
              const res2 = await fetch(
                `/api/tables?restaurantId=${encodeURIComponent(restaurantId)}`,
                { credentials: 'include' }
              )
              if (res2.ok) {
                const data2 = await res2.json()
                list = (data2.tables ?? []) as Table[]
              }
            }
          } catch {
            /* ignore migration errors */
          }
        }

        setTables(list)
      } catch {
        setTables([])
      }
    }
    loadTables()
  }, [selectedArea, restaurantId])

  // Carica layout tavoli
  useEffect(() => {
    const loadTableLayout = () => {
      try {
        const key = `table_layout_v1::${selectedArea}`
        const raw = localStorage.getItem(key)
        const layout = raw ? JSON.parse(raw) : []
        setTableLayout(layout)
      } catch {
        setTableLayout([])
      }
    }
    loadTableLayout()
  }, [selectedArea])

  const reloadBookings = async () => {
    if (!restaurantId || !selectedDate) return
    const params = new URLSearchParams({
      restaurantId,
      date: selectedDate,
    })
    if (selectedArea) params.set('area', selectedArea)
    const res = await fetch(`/api/bookings?${params}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setBookings((data.bookings ?? []) as Booking[])
    }
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantId) {
      setMessage('❌ Ristorante non configurato')
      return
    }
    setIsLoading(true)

    try {
      const payload = {
        restaurantId,
        date: selectedDate,
        time: selectedTime,
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        customerEmail: bookingForm.customerEmail || undefined,
        partySize: bookingForm.partySize,
        tableNumber: bookingForm.tableNumber,
        area: selectedArea || undefined,
        status: 'confirmed',
        notes: bookingForm.notes,
      }

      const res = editingBooking
        ? await fetch(`/api/bookings/${editingBooking.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          })
        : await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Salvataggio fallito')
      }

      await reloadBookings()
      window.dispatchEvent(new CustomEvent('customers_updated'))

      setMessage(
        editingBooking ? '✅ Prenotazione aggiornata!' : '✅ Prenotazione creata!'
      )
      setTimeout(() => {
        setMessage('')
        setShowBookingModal(false)
        setEditingBooking(null)
        resetForm()
      }, 2000)
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Errore nel salvataggio'
      setMessage(`❌ ${msg}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setBookingForm({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      partySize: 2,
      notes: '',
      tableNumber: null
    })
  }

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking)
    setBookingForm({
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || '',
      partySize: booking.partySize,
      notes: booking.notes,
      tableNumber: booking.tableNumber
    })
    setSelectedDate(booking.date)
    setSelectedTime(booking.time)
    setShowBookingModal(true)
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Eliminazione fallita')
      await reloadBookings()
      setMessage('✅ Prenotazione eliminata!')
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('❌ Errore nell\'eliminazione')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const getAvailableTables = () => {
    const bookedTables = bookings.map(b => b.tableNumber).filter(Boolean)
    return tables.filter(t => !bookedTables.includes(t.tableNumber))
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5) // HH:MM format
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Navigazione tra giorni con frecce
  const goToPrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // label calcolata ma non usata: rimossa per evitare warning

  // Raggruppamento per fasce orarie
  const lunchBookings = useMemo(() => {
    return bookings.filter(b => b.time >= '12:00' && b.time < '16:00')
  }, [bookings])

  const dinnerFirstBookings = useMemo(() => {
    return bookings.filter(b => b.time >= '19:00' && b.time < '21:00')
  }, [bookings])

  const dinnerSecondBookings = useMemo(() => {
    return bookings.filter(b => b.time >= '21:00')
  }, [bookings])

  return (
    <PermissionGuard permission="bookings_view">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📅 Prenotazioni</h2>
              <p className="text-gray-600 mt-1">Gestisci le prenotazioni e la mappa dei tavoli</p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              
              <button
                onClick={() => setShowFloorPlan(!showFloorPlan)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                {showFloorPlan ? '📋 Lista' : '🗺️ Mappa Tavoli'}
              </button>
              
              {can('bookings_create') && (
                <button
                  onClick={() => {
                    resetForm()
                    setShowBookingModal(true)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  ➕ Nuova Prenotazione
                </button>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Filtri su due righe: riga 1 frecce + data, riga 2 fasce 12:00 / 19:00 / 21:00 */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Riga 1: frecce + data */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={goToPrevDay}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              aria-label="Giorno precedente"
              title="Giorno precedente"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={goToNextDay}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              aria-label="Giorno successivo"
              title="Giorno successivo"
            >
              →
            </button>
          </div>
          {/* Riga 2: fasce */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setSelectedTime('12:00'); try { lunchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {} }}
              className={`px-4 py-2 rounded-lg transition border ${selectedTime === '12:00' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            >
              12:00
            </button>
            <button
              onClick={() => { setSelectedTime('19:00'); try { dinnerFirstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {} }}
              className={`px-4 py-2 rounded-lg transition border ${selectedTime === '19:00' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            >
              19:00
            </button>
            <button
              onClick={() => { setSelectedTime('21:00'); try { dinnerSecondRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {} }}
              className={`px-4 py-2 rounded-lg transition border ${selectedTime === '21:00' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            >
              21:00
            </button>
          </div>
        </div>

        {/* Registrazione Passanti */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 text-center">🚶 Passanti</h3>
          </div>
          <div className="p-6">
            {/* Controlli su un'unica riga sotto il titolo */}
            <div className="flex items-end gap-3 flex-wrap justify-between">
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tavolo</label>
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-800">1</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Coperti</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={walkinCovers}
                  onChange={(e) => setWalkinCovers(parseInt(e.target.value || '0', 10) || 1)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  const now = new Date()
                  const hour = now.getHours()
                  let bucketTime = '19:00'
                  if (hour >= 21) bucketTime = '21:00'
                  else if (hour >= 19) bucketTime = '19:00'
                  else if (hour >= 12 && hour <= 15) bucketTime = '12:00'
                  const entry: WalkinEntry = {
                    id: crypto.randomUUID(),
                    date: selectedDate,
                    time: bucketTime,
                    tableNumber: 1,
                    covers: walkinCovers,
                    areaId: selectedArea,
                    createdAt: new Date().toISOString()
                  }
                  const key = `walkins_v1::${selectedDate}::${selectedArea}`
                  const next = [...walkins, entry]
                  try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
                  setWalkins(next)
                  setMessage('✅ Passanti registrati')
                  setTimeout(() => setMessage(''), 2000)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                ➕ Aggiungi Passanti
              </button>
              <div className="text-right ml-auto">
                <div className="text-xs text-gray-600">Totale oggi</div>
                <div className="text-xl font-bold text-gray-900">
                  {walkins.reduce((sum, w) => sum + (w.covers || 0), 0)}
                </div>
              </div>
            </div>

            {/* Lista passanti registrati oggi */}
            <div className="mt-6">
              {walkins.length === 0 ? (
                <div className="text-sm text-gray-500">Nessun passante registrato per questa data</div>
              ) : (
                <div className="space-y-2">
                  {walkins
                    .sort((a,b) => a.time.localeCompare(b.time))
                    .map(w => (
                    <div key={w.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">{formatTime(w.time)}</span>
                        <span className="font-medium text-gray-900">{w.covers} copert{w.covers === 1 ? 'o' : 'i'}</span>
                        <span className="text-gray-600">{w.tableNumber ? `Tavolo ${w.tableNumber}` : 'Tavolo non specificato'}</span>
                      </div>
                      <button
                        onClick={() => {
                          const key = `walkins_v1::${selectedDate}::${selectedArea}`
                          const next = walkins.filter(x => x.id !== w.id)
                          try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
                          setWalkins(next)
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista prenotazioni */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Prenotazioni per {new Date(selectedDate).toLocaleDateString('it-IT')}
            </h3>
          </div>
          
          <div className="p-6">
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-gray-500">Nessuna prenotazione per questa data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{booking.customerName}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTime(booking.time)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Telefono:</span>
                            <span className="ml-2 font-medium">{booking.customerPhone}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Persone:</span>
                            <span className="ml-2 font-medium">{booking.partySize}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Tavolo:</span>
                            <span className="ml-2 font-medium">
                              {booking.tableNumber ? `Tavolo ${booking.tableNumber}` : 'Non assegnato'}
                            </span>
                          </div>
                        </div>
                        
                        {booking.notes && (
                          <div className="mt-3 text-sm text-gray-600">
                            <span className="font-medium">Note:</span> {booking.notes}
                          </div>
                        )}
                      </div>
                      
                      {can('bookings_edit') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBooking(booking)}
                            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            ✏️ Modifica
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            ❌ Elimina
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal nuova prenotazione */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingBooking ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}
              </h3>
              
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome Cliente</label>
                  <input
                    type="text"
                    value={bookingForm.customerName}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
                  <input
                    type="tel"
                    value={bookingForm.customerPhone}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (opzionale)</label>
                  <input
                    type="email"
                    value={bookingForm.customerEmail}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Numero Persone</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={bookingForm.partySize}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, partySize: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tavolo</label>
                  <select
                    value={bookingForm.tableNumber || ''}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, tableNumber: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleziona tavolo</option>
                    {getAvailableTables().map(table => (
                      <option key={table.id} value={table.tableNumber}>
                        Tavolo {table.tableNumber} ({table.seats} posti)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Note speciali, allergie, preferenze..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false)
                      setEditingBooking(null)
                      resetForm()
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Salvataggio...' : '💾 Salva'}
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
