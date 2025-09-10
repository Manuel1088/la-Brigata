'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'

interface Booking {
  id: string
  customerName: string
  customerPhone: string
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

export default function BookingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  // Aree/Sale da Impostazioni
  type AreaType = 'sala' | 'sala_colazioni' | 'bar' | 'ristorante' | 'terrazza' | 'privé' | 'altro'
  interface BookingArea { id: string; name: string; type: AreaType; quantity: number }
  const [areas, setAreas] = useState<BookingArea[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all')
  const [calCurrentMonth, setCalCurrentMonth] = useState<Date>(new Date())
  const [calSelectedDate, setCalSelectedDate] = useState<string>('')
  const [calWalkins, setCalWalkins] = useState<{ lunch: number; dinner: number }>({ lunch: 0, dinner: 0 })

  // Form data per nuova prenotazione
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerPhone: '',
    date: '',
    time: '',
    partySize: '',
    tableNumber: '',
    notes: ''
  })

  // Form data per nuovo tavolo
  const [tableForm, setTableForm] = useState({
    tableNumber: '',
    seats: ''
  })

  // Carica dati
  useEffect(() => {
    loadBookings()
    loadTables()
    // Carica aree da Impostazioni e ascolta aggiornamenti
    const loadAreas = () => {
      try {
        const raw = localStorage.getItem('booking_areas_v1')
        if (raw) setAreas(JSON.parse(raw))
        else setAreas([])
      } catch { setAreas([]) }
    }
    loadAreas()
    const handler = () => loadAreas()
    window.addEventListener('booking_areas_updated', handler)
    return () => window.removeEventListener('booking_areas_updated', handler)
  }, [])

  // Reimposta calendario quando si seleziona un'area
  useEffect(() => {
    if (selectedAreaId === 'all') return
    const now = new Date()
    setCalCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    setCalSelectedDate(`${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`)
  }, [selectedAreaId])

  // Carica/salva walk-in per area+data
  useEffect(() => {
    if (!calSelectedDate || selectedAreaId === 'all') return
    try {
      const raw = localStorage.getItem(`walkins_${selectedAreaId}_${calSelectedDate}`)
      if (raw) setCalWalkins(JSON.parse(raw))
      else setCalWalkins({ lunch: 0, dinner: 0 })
    } catch {
      setCalWalkins({ lunch: 0, dinner: 0 })
    }
  }, [calSelectedDate, selectedAreaId])

  const saveCalWalkins = (next: { lunch: number; dinner: number }) => {
    setCalWalkins(next)
    if (!calSelectedDate || selectedAreaId === 'all') return
    try { localStorage.setItem(`walkins_${selectedAreaId}_${calSelectedDate}`, JSON.stringify(next)) } catch {}
  }

  const loadBookings = () => {
    // Dati mock per demo - in produzione verranno caricati dal database
    setBookings([
      {
        id: '1',
        customerName: 'Rossi',
        customerPhone: '+39 123 456 7890',
        date: '2024-01-15',
        time: '19:30',
        partySize: 4,
        tableNumber: 5,
        status: 'confirmed',
        notes: 'Anniversario di matrimonio',
        createdAt: '2024-01-10T10:00:00Z'
      },
      {
        id: '2',
        customerName: 'Bianchi',
        customerPhone: '+39 098 765 4321',
        date: '2024-01-15',
        time: '20:00',
        partySize: 2,
        tableNumber: 3,
        status: 'confirmed',
        notes: '',
        createdAt: '2024-01-12T14:30:00Z'
      },
      {
        id: '3',
        customerName: 'Verdi',
        customerPhone: '+39 555 123 4567',
        date: '2024-01-16',
        time: '19:00',
        partySize: 6,
        tableNumber: 8,
        status: 'pending',
        notes: 'Cena di lavoro',
        createdAt: '2024-01-14T16:45:00Z'
      },
      {
        id: '4',
        customerName: 'Neri',
        customerPhone: '+39 333 987 6543',
        date: '2024-01-16',
        time: '20:30',
        partySize: 3,
        tableNumber: null,
        status: 'waiting',
        notes: 'In attesa di tavolo libero',
        createdAt: '2024-01-15T18:20:00Z'
      }
    ])
  }

  const loadTables = () => {
    // Dati mock per demo - in produzione verranno caricati dal database
    setTables([
      { id: '1', tableNumber: 1, seats: 2, status: 'available' },
      { id: '2', tableNumber: 2, seats: 2, status: 'available' },
      { id: '3', tableNumber: 3, seats: 4, status: 'occupied' },
      { id: '4', tableNumber: 4, seats: 4, status: 'available' },
      { id: '5', tableNumber: 5, seats: 6, status: 'occupied' },
      { id: '6', tableNumber: 6, seats: 6, status: 'available' },
      { id: '7', tableNumber: 7, seats: 8, status: 'available' },
      { id: '8', tableNumber: 8, seats: 8, status: 'occupied' }
    ])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'waiting':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata'
      case 'pending':
        return 'In Attesa'
      case 'waiting':
        return 'In Attesa Tavolo'
      case 'cancelled':
        return 'Cancellata'
      default:
        return status
    }
  }

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newBooking: Booking = {
      id: Date.now().toString(),
      customerName: bookingForm.customerName,
      customerPhone: bookingForm.customerPhone,
      date: bookingForm.date,
      time: bookingForm.time,
      partySize: parseInt(bookingForm.partySize),
      tableNumber: bookingForm.tableNumber ? parseInt(bookingForm.tableNumber) : null,
      status: 'confirmed',
      notes: bookingForm.notes,
      createdAt: new Date().toISOString()
    }
    
    setBookings([newBooking, ...bookings])
    setBookingForm({
      customerName: '',
      customerPhone: '',
      date: '',
      time: '',
      partySize: '',
      tableNumber: '',
      notes: ''
    })
    setShowBookingModal(false)
  }

  const handleTableSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newTable: Table = {
      id: Date.now().toString(),
      tableNumber: parseInt(tableForm.tableNumber),
      seats: parseInt(tableForm.seats),
      status: 'available'
    }
    
    setTables([...tables, newTable])
    setTableForm({ tableNumber: '', seats: '' })
    setShowTableModal(false)
  }

  const updateBookingStatus = (bookingId: string, newStatus: string) => {
    setBookings(bookings.map(booking => 
      booking.id === bookingId ? { ...booking, status: newStatus } : booking
    ))
  }

  const getFilteredBookings = () => {
    let filtered = bookings

    // Filtro per data
    if (selectedDate) {
      filtered = filtered.filter(booking => booking.date === selectedDate)
    }

    // Filtro per status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus)
    }

    // Filtro per area selezionata (mock: quando collegheremo tavoli->area, filtreremo su tableNumber/areaId)
    if (selectedAreaId !== 'all') {
      // Per ora non esiste relazione booking->area, quindi non applichiamo davvero il filtro sui dati mock.
      // Manteniamo la selezione per UI.
    }

    return filtered
  }

  const getAvailableTables = () => {
    return tables.filter(table => table.status === 'available')
  }

  const getOccupiedTables = () => {
    return tables.filter(table => table.status === 'occupied')
  }

  const getBookingsForDate = (date: string) => {
    return bookings.filter(booking => booking.date === date)
  }

  const getTotalGuests = () => {
    return getFilteredBookings().reduce((sum, booking) => sum + booking.partySize, 0)
  }

  const getConfirmedBookings = () => {
    return getFilteredBookings().filter(booking => booking.status === 'confirmed').length
  }

  return (
    <PermissionGuard permission="turni_manage">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  📅 Gestione Prenotazioni
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/bookings/settings')}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  ⚙️ Impostazioni
                </button>
                <button
                  onClick={() => router.push('/bookings/floor')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                >
                  🗺️ Piano Tavoli
                </button>
                <button
                  onClick={() => router.push('/bookings/calendar')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  📅 Calendario
                </button>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  ➕ Nuova Prenotazione
                </button>
                <button
                  onClick={() => setShowTableModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  🪑 Gestisci Tavoli
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Statistiche */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📅</div>
                <h3 className="text-lg font-semibold mb-2">Prenotazioni Oggi</h3>
                <p className="text-2xl font-bold text-blue-600">{getBookingsForDate(selectedDate).length}</p>
                <p className="text-sm text-gray-500">{getTotalGuests()} coperti</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2">Confermate</h3>
                <p className="text-2xl font-bold text-green-600">{getConfirmedBookings()}</p>
                <p className="text-sm text-gray-500">Prenotazioni confermate</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">🪑</div>
                <h3 className="text-lg font-semibold mb-2">Tavoli Occupati</h3>
                <p className="text-2xl font-bold text-orange-600">{getOccupiedTables().length}</p>
                <p className="text-sm text-gray-500">Su {tables.length} totali</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">Occupazione</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((getOccupiedTables().length / tables.length) * 100)}%
                </p>
                <p className="text-sm text-gray-500">Tavoli occupati</p>
              </div>
            </div>

            {/* Filtri */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tutti</option>
                    <option value="confirmed">Confermate</option>
                    <option value="pending">In Attesa</option>
                    <option value="waiting">In Attesa Tavolo</option>
                    <option value="cancelled">Cancellate</option>
                  </select>
                </div>
              </div>
              {/* Aree/Sale */}
              {areas.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Aree/Sale</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-3 py-1 rounded border text-sm ${selectedAreaId === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                      onClick={() => setSelectedAreaId('all')}
                    >
                      Tutte
                    </button>
                    {areas.map(a => (
                      <button
                        key={a.id}
                        className={`px-3 py-1 rounded border text-sm ${selectedAreaId === a.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                        onClick={() => setSelectedAreaId(a.id)}
                        title={`${a.type} • ${a.quantity}x`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Calendario Prenotazioni per Area selezionata */}
            {selectedAreaId !== 'all' && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-lg font-semibold text-gray-900">
                    📅 Calendario Prenotazioni — {areas.find(a => a.id === selectedAreaId)?.name || ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCalCurrentMonth(new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() - 1, 1))}
                      className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                    >
                      ← Mese precedente
                    </button>
                    <div className="text-sm text-gray-900">
                      {calCurrentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                      onClick={() => setCalCurrentMonth(new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() + 1, 1))}
                      className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                    >
                      Mese successivo →
                    </button>
                    <button
                      onClick={() => {
                        const now = new Date()
                        setCalCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                        const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
                        setCalSelectedDate(`${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`)
                      }}
                      className="ml-2 text-xs text-blue-700 hover:text-blue-900"
                    >
                      Oggi
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {(() => {
                    const toLocalISO = (d: Date) => {
                      const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
                      return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
                    }
                    const todayISO = toLocalISO(new Date())
                    const firstDay = new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth(), 1)
                    const startDay = (firstDay.getDay() + 6) % 7 // Lunedì
                    const gridStart = new Date(firstDay)
                    gridStart.setDate(firstDay.getDate() - startDay)
                    gridStart.setHours(0,0,0,0)
                    const cells: Date[] = []
                    for (let i = 0; i < 42; i++) {
                      const d = new Date(gridStart)
                      d.setDate(gridStart.getDate() + i)
                      cells.push(d)
                    }

                    const dayHeader = (
                      <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
                        {['L','M','M','G','V','S','D'].map(d => (
                          <div key={d} className="px-2 py-1 text-center uppercase tracking-wide">{d}</div>
                        ))}
                      </div>
                    )

                    const dotColorByStatus: Record<string, string> = {
                      confirmed: 'bg-green-500',
                      pending: 'bg-yellow-500',
                      waiting: 'bg-blue-500',
                      cancelled: 'bg-red-500',
                      default: 'bg-gray-400'
                    }

                    const parseHour = (t: string) => { const [hh] = (t || '0').split(':'); const n = parseInt(hh || '0', 10); return isNaN(n)?0:n }

                    const cellEls = cells.map(d => {
                      const inMonth = d.getMonth() === calCurrentMonth.getMonth()
                      const dayISO = toLocalISO(d)
                      const dayBookings = bookings.filter(b => b.date === dayISO)
                      let lunchGuests = 0, dinnerGuests = 0
                      dayBookings.forEach(b => {
                        const h = parseHour(b.time)
                        if (h >= 11 && h < 16) lunchGuests += b.partySize
                        else if (h >= 18 && h <= 23) dinnerGuests += b.partySize
                      })
                      const isSelected = calSelectedDate === dayISO
                      const isToday = dayISO === todayISO
                      const numberCls = isSelected
                        ? 'bg-blue-600 text-white'
                        : isToday
                          ? 'border border-red-600 text-red-600'
                          : inMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'

                      return (
                        <div
                          key={dayISO}
                          onClick={() => setCalSelectedDate(dayISO)}
                          className={`p-2 h-20 cursor-pointer ${inMonth ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 rounded-lg transition`}
                          title={`${dayBookings.length} prenotazioni`}
                        >
                          <div className="flex justify-center">
                            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${numberCls}`}>{d.getDate()}</div>
                          </div>
                          <div className="mt-2 flex justify-center gap-1">
                            {dayBookings.slice(0,4).map(b => {
                              const color = (dotColorByStatus as any)[b.status] || dotColorByStatus.default
                              return <span key={b.id} className={`w-1.5 h-1.5 rounded-full ${color}`}></span>
                            })}
                          </div>
                          <div className="mt-1 text-[10px] text-gray-700 flex justify-center gap-2">
                            <span>P: {lunchGuests}</span>
                            <span>C: {dinnerGuests}</span>
                          </div>
                        </div>
                      )
                    })

                    return (
                      <div>
                        {dayHeader}
                        <div className="grid grid-cols-7 gap-0">
                          {cellEls}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Dettagli Giorno Selezionato per Area */}
                {calSelectedDate && (
                  <div className="px-6 pb-6">
                    <div className="bg-white rounded-lg border">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Prenotazioni per {new Date(calSelectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                      </div>
                      <div className="p-6">
                        {(() => {
                          const isLunch = (t: string) => { const h = parseInt((t || '0').split(':')[0] || '0', 10); return h >= 11 && h < 16 }
                          const isDinner = (t: string) => { const h = parseInt((t || '0').split(':')[0] || '0', 10); return h >= 18 && h <= 23 }
                          let lunch = 0, dinner = 0
                          bookings.filter(b => b.date === calSelectedDate && b.status !== 'cancelled').forEach(b => {
                            if (isLunch(b.time)) lunch += b.partySize
                            else if (isDinner(b.time)) dinner += b.partySize
                          })
                          return (
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                              <div className="border rounded-lg p-3">
                                <div className="font-semibold text-gray-900 mb-1">🍽️ Pranzo</div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">Prenotati:</span>
                                  <span className="font-bold text-gray-900">{lunch}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="text-gray-700">Passanti (walk-in):</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={calWalkins.lunch}
                                    onChange={(e) => saveCalWalkins({ lunch: Math.max(0, parseInt(e.target.value || '0', 10)), dinner: calWalkins.dinner })}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                                  />
                                </div>
                              </div>
                              <div className="border rounded-lg p-3">
                                <div className="font-semibold text-gray-900 mb-1">🌙 Cena</div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">Prenotati:</span>
                                  <span className="font-bold text-gray-900">{dinner}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="text-gray-700">Passanti (walk-in):</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={calWalkins.dinner}
                                    onChange={(e) => saveCalWalkins({ lunch: calWalkins.lunch, dinner: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })()}

                        {(() => {
                          const dayBookings = bookings.filter(b => b.date === calSelectedDate)
                          return dayBookings.length > 0 ? (
                            <div className="space-y-4">
                              {dayBookings.map((booking) => (
                                <div key={booking.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <h4 className="text-lg font-medium text-gray-900">{booking.customerName}</h4>
                                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}>{getStatusText(booking.status)}</span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                      <div><span className="font-medium">Ora:</span> {booking.time}</div>
                                      <div><span className="font-medium">Persone:</span> {booking.partySize}</div>
                                      <div><span className="font-medium">Tavolo:</span> {booking.tableNumber || 'Non assegnato'}</div>
                                      <div><span className="font-medium">Telefono:</span> {booking.customerPhone}</div>
                                    </div>
                                    {booking.notes && (
                                      <div className="mt-2 text-sm text-gray-600"><span className="font-medium">Note:</span> {booking.notes}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-4">Nessuna prenotazione per questa data</div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lista Prenotazioni */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Prenotazioni</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {getFilteredBookings().map((booking) => (
                  <div key={booking.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            {booking.customerName}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Data:</span> {formatDate(booking.date)}
                          </div>
                          <div>
                            <span className="font-medium">Ora:</span> {formatTime(booking.time)}
                          </div>
                          <div>
                            <span className="font-medium">Persone:</span> {booking.partySize}
                          </div>
                          <div>
                            <span className="font-medium">Tavolo:</span> {booking.tableNumber || 'Non assegnato'}
                          </div>
                        </div>
                        {booking.customerPhone && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Telefono:</span> {booking.customerPhone}
                          </div>
                        )}
                        {booking.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Note:</span> {booking.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
                            >
                              Cancella
                            </button>
                          </>
                        )}
                        {booking.status === 'waiting' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
                          >
                            Assegna Tavolo
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
                          >
                            Cancella
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {getFilteredBookings().length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    Nessuna prenotazione trovata
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modal Nuova Prenotazione */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">📅 Nuova Prenotazione</h3>
              <form onSubmit={handleBookingSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Cliente
                    </label>
                    <input
                      type="text"
                      value={bookingForm.customerName}
                      onChange={(e) => setBookingForm({...bookingForm, customerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={bookingForm.customerPhone}
                      onChange={(e) => setBookingForm({...bookingForm, customerPhone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ora
                      </label>
                      <input
                        type="time"
                        value={bookingForm.time}
                        onChange={(e) => setBookingForm({...bookingForm, time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numero Persone
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bookingForm.partySize}
                        onChange={(e) => setBookingForm({...bookingForm, partySize: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tavolo (opzionale)
                      </label>
                      <select
                        value={bookingForm.tableNumber}
                        onChange={(e) => setBookingForm({...bookingForm, tableNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Seleziona tavolo</option>
                        {getAvailableTables().map((table) => (
                          <option key={table.id} value={table.tableNumber}>
                            Tavolo {table.tableNumber} ({table.seats} posti)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    Salva
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Gestione Tavoli */}
        {showTableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">🪑 Gestione Tavoli</h3>
              
              {/* Lista Tavoli Esistenti */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Tavoli Esistenti</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {tables.map((table) => (
                    <div key={table.id} className={`p-3 rounded border ${
                      table.status === 'occupied' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-center">
                        <p className="font-medium">Tavolo {table.tableNumber}</p>
                        <p className="text-sm text-gray-600">{table.seats} posti</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                          table.status === 'occupied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {table.status === 'occupied' ? 'Occupato' : 'Libero'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Nuovo Tavolo */}
              <form onSubmit={handleTableSubmit}>
                <h4 className="font-medium mb-3">Aggiungi Nuovo Tavolo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numero Tavolo
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tableForm.tableNumber}
                      onChange={(e) => setTableForm({...tableForm, tableNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numero Posti
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tableForm.seats}
                      onChange={(e) => setTableForm({...tableForm, seats: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowTableModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Chiudi
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    Aggiungi Tavolo
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
