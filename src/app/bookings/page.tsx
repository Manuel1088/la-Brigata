'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { addOrUpdateCustomerFromBooking } from '@/lib/customers'

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

export default function BookingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showAreaSelectModal, setShowAreaSelectModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  // Aree/Sale da Impostazioni
  type AreaType = 'sala' | 'sala_colazioni' | 'bar' | 'ristorante' | 'terrazza' | 'privé' | 'altro'
  interface BookingArea { id: string; name: string; type: AreaType; quantity: number }
  const [areas, setAreas] = useState<BookingArea[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [calCurrentMonth, setCalCurrentMonth] = useState<Date>(new Date())
  const [calSelectedDate, setCalSelectedDate] = useState<string>('')
  const [calWalkins, setCalWalkins] = useState<{ lunch: number; dinner: number }>({ lunch: 0, dinner: 0 })
  // Form Aree/Sale inline
  const [newAreaName, setNewAreaName] = useState<string>('')
  const [newAreaType, setNewAreaType] = useState<AreaType>('sala')
  const [showManagePanel, setShowManagePanel] = useState<boolean>(false)

  // Stato per mappa tavoli per Sala (unifica Piano Tavoli)
  const [gridCols] = useState<number>(12)
  const [gridRows] = useState<number>(8)
  const cellSizeRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const [floorTables, setFloorTables] = useState<TableItem[]>([])
  const [floorDateISO, setFloorDateISO] = useState<string>(() => {
    const d = new Date(); const z = (n: number) => (n < 10 ? `0${n}` : `${n}`); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
  })
  const STORAGE_KEY_PREFIX = 'table_layout_v1_'
  const [floorAddForm, setFloorAddForm] = useState<{ tableNumber: string; seats: string }>({ tableNumber: '', seats: '' })
  const [tableModalTab, setTableModalTab] = useState<'lista' | 'piano'>('lista')
  const [isLayoutEdit, setIsLayoutEdit] = useState<boolean>(false)
  const [passantiWeekOffset, setPassantiWeekOffset] = useState<number>(0)
  const [showPassantiStats, setShowPassantiStats] = useState<boolean>(false)
  const [isWalkinSubmitting, setIsWalkinSubmitting] = useState<boolean>(false)
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    date: '',
    time: '',
    partySize: '',
    tableNumber: '',
    notes: ''
  })
  

  // Form data per nuova prenotazione
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '',
    customerEmail: '',
    date: '',
    time: '',
    partySize: '1',
    tableNumber: '',
    notes: ''
  })

  // Form data per nuovo tavolo
  const [tableForm, setTableForm] = useState({
    tableNumber: '',
    seats: ''
  })

  // Reset form Nuova Prenotazione ad ogni apertura
  useEffect(() => {
    if (showBookingModal) {
      setBookingForm({
        customerName: '',
        customerFirstName: '',
        customerLastName: '',
        customerPhone: '',
        customerEmail: '',
        date: '',
        time: '',
        partySize: '1',
        tableNumber: '',
        notes: ''
      })
    }
  }, [showBookingModal])

  // Carica dati
  useEffect(() => {
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

  // Storage helpers per prenotazioni per Sala
  const BOOKINGS_STORAGE_PREFIX = 'bookings_v1_'
  const loadBookingsForArea = (areaId: string): Booking[] => {
    try {
      const raw = localStorage.getItem(`${BOOKINGS_STORAGE_PREFIX}${areaId}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  const saveBookingsForArea = (areaId: string, list: Booking[]) => {
    try { localStorage.setItem(`${BOOKINGS_STORAGE_PREFIX}${areaId}`, JSON.stringify(list)) } catch {}
    try { window.dispatchEvent(new CustomEvent('bookings_updated')) } catch {}
  }

  // Ricarica prenotazioni quando cambia Sala
  useEffect(() => {
    if (!selectedAreaId) return
    const list = loadBookingsForArea(selectedAreaId)
    setBookings(list)
  }, [selectedAreaId])

  // Ascolta aggiornamenti esterni
  useEffect(() => {
    const handler = () => { if (selectedAreaId) setBookings(loadBookingsForArea(selectedAreaId)) }
    window.addEventListener('bookings_updated', handler)
    return () => window.removeEventListener('bookings_updated', handler)
  }, [selectedAreaId])

  const loadFloorTablesFor = (areaId: string) => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${areaId}`)
      if (raw) setFloorTables(JSON.parse(raw))
      else setFloorTables([])
    } catch { setFloorTables([]) }
  }

  // Carica layout tavoli per Sala quando cambio Sala (sempre)
  useEffect(() => {
    if (!selectedAreaId) return
    loadFloorTablesFor(selectedAreaId)
    // Default data ISO alla data filtri se presente
    if (selectedDate) setFloorDateISO(selectedDate)
  }, [selectedAreaId])

  // Assicurati che quando apriamo Piano da riclick giorno, ricarichiamo mappe corrette
  useEffect(() => {
    if (!showTableModal) return
    if (tableModalTab !== 'piano') return
    if (!selectedAreaId) return
    loadFloorTablesFor(selectedAreaId)
  }, [showTableModal, tableModalTab, selectedAreaId])

  // Salva layout tavoli per Sala
  useEffect(() => {
    if (!selectedAreaId) return
    try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${selectedAreaId}`, JSON.stringify(floorTables)) } catch {}
  }, [floorTables, selectedAreaId])

  // Seleziona automaticamente la prima sala se nessuna selezionata o se la selezione non esiste più
  useEffect(() => {
    if (areas.length === 0) {
      if (selectedAreaId) setSelectedAreaId('')
      return
    }
    if (!selectedAreaId || !areas.some(a => a.id === selectedAreaId)) {
      setSelectedAreaId(areas[0].id)
    }
  }, [areas])

  const saveAreas = (next: BookingArea[]) => {
    setAreas(next)
    try { localStorage.setItem('booking_areas_v1', JSON.stringify(next)) } catch {}
    try { window.dispatchEvent(new CustomEvent('booking_areas_updated')) } catch {}
  }

  const addArea = () => {
    const name = (newAreaName || '').trim()
    if (!name) return
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? (globalThis.crypto as any).randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const next: BookingArea[] = [...areas, { id, name, type: newAreaType, quantity: 1 }]
    saveAreas(next)
    setNewAreaName('')
    setNewAreaType('sala')
  }

  const removeArea = (id: string) => {
    const next = areas.filter(a => a.id !== id)
    if (selectedAreaId === id) setSelectedAreaId('')
    saveAreas(next)
  }

  // Reimposta calendario quando si seleziona un'area
  useEffect(() => {
    if (!selectedAreaId) return
    const now = new Date()
    setCalCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    setCalSelectedDate(`${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`)
  }, [selectedAreaId])

  // Carica/salva walk-in per area+data
  useEffect(() => {
    if (!calSelectedDate || !selectedAreaId) return
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
    if (!calSelectedDate || !selectedAreaId) return
    try { localStorage.setItem(`walkins_${selectedAreaId}_${calSelectedDate}`, JSON.stringify(next)) } catch {}
  }

  // (mock disabilitato: si usa storage per persistenza)

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
      customerName: ((bookingForm.customerFirstName || '') + ' ' + (bookingForm.customerLastName || '')).trim() || bookingForm.customerName,
      customerPhone: bookingForm.customerPhone,
      customerEmail: bookingForm.customerEmail || undefined,
      date: bookingForm.date,
      time: bookingForm.time,
      partySize: parseInt(bookingForm.partySize),
      tableNumber: bookingForm.tableNumber ? parseInt(bookingForm.tableNumber) : null,
      status: 'pending',
      notes: bookingForm.notes,
      createdAt: new Date().toISOString()
    }
    
    const next = [newBooking, ...bookings]
    setBookings(next)
    if (selectedAreaId) saveBookingsForArea(selectedAreaId, next)
    try { addOrUpdateCustomerFromBooking(newBooking as any) } catch {}
    // Imposta anche la data selezionata nel calendario corrente
    if (bookingForm.date) setCalSelectedDate(bookingForm.date)
    setBookingForm({
      customerName: '',
      customerFirstName: '',
      customerLastName: '',
      customerPhone: '',
      customerEmail: '',
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
    const next = bookings.map(booking => 
      booking.id === bookingId ? { ...booking, status: newStatus } : booking
    )
    setBookings(next)
    if (selectedAreaId) saveBookingsForArea(selectedAreaId, next)
  }

  const deleteBooking = (bookingId: string) => {
    const next = bookings.filter(b => b.id !== bookingId)
    setBookings(next)
    if (selectedAreaId) saveBookingsForArea(selectedAreaId, next)
  }

  const startEditBooking = (b: Booking) => {
    setEditingBookingId(b.id)
    setEditingForm({
      customerName: b.customerName || '',
      customerPhone: b.customerPhone || '',
      customerEmail: b.customerEmail || '',
      date: b.date || '',
      time: b.time || '',
      partySize: String(b.partySize || ''),
      tableNumber: b.tableNumber != null ? String(b.tableNumber) : '',
      notes: b.notes || ''
    })
  }

  const cancelEditBooking = () => {
    setEditingBookingId(null)
    setEditingForm({ customerName: '', customerPhone: '', customerEmail: '', date: '', time: '', partySize: '', tableNumber: '', notes: '' })
  }

  const confirmEditBooking = () => {
    if (!editingBookingId) return
    const updated = bookings.map(b => {
      if (b.id !== editingBookingId) return b
      return {
        ...b,
        customerName: editingForm.customerName,
        customerPhone: editingForm.customerPhone,
        customerEmail: editingForm.customerEmail || undefined,
        date: editingForm.date,
        time: editingForm.time,
        partySize: Math.max(1, parseInt(editingForm.partySize || '1', 10)),
        tableNumber: editingForm.tableNumber ? parseInt(editingForm.tableNumber, 10) : null,
        notes: editingForm.notes,
      }
    })
    setBookings(updated)
    if (selectedAreaId) saveBookingsForArea(selectedAreaId, updated)
    cancelEditBooking()
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

    // Filtro per sala selezionata: considera solo prenotazioni con tavolo della sala corrente
    if (selectedAreaId) {
      const tableSet = new Set(floorTables.map(t => t.tableNumber))
      // Mostra anche prenotazioni senza tavolo assegnato (appartengono comunque alla sala corrente perché salvate nello storage per area)
      filtered = filtered.filter(b => b.tableNumber === null || tableSet.has((b.tableNumber ?? -1) as number))
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

  // Occupazione per mappa (set di tavoli occupati in quella data)
  const occupiedSet = useMemo(() => new Set((getBookingsForDate(floorDateISO) || []).filter(b => b.status !== 'cancelled' && b.tableNumber).map(b => String(b.tableNumber))), [bookings, floorDateISO])

  // Drag handlers per mappa tavoli
  const onMouseDownTable = (e: React.MouseEvent, id: string) => {
    const target = e.currentTarget as HTMLDivElement
    const rect = target.getBoundingClientRect()
    const container = cellSizeRef.current?.getBoundingClientRect()
    if (!container) return
    const cellW = container.width / gridCols
    const cellH = container.height / gridRows
    const dx = Math.round((e.clientX - rect.left) / cellW)
    const dy = Math.round((e.clientY - rect.top) / cellH)
    setDragId(id)
    setDragOffset({ dx, dy })
  }

  const onMouseMoveTable = (e: React.MouseEvent) => {
    if (!dragId) return
    const container = cellSizeRef.current?.getBoundingClientRect()
    if (!container) return
    const cellW = container.width / gridCols
    const cellH = container.height / gridRows
    const x = Math.floor((e.clientX - container.left) / cellW) - dragOffset.dx
    const y = Math.floor((e.clientY - container.top) / cellH) - dragOffset.dy
    setFloorTables(prev => prev.map(t => t.id === dragId ? ({ ...t, x: Math.max(0, Math.min(gridCols - t.w, x)), y: Math.max(0, Math.min(gridRows - t.h, y)) }) : t))
  }

  const onMouseUpTable = () => setDragId(null)

  const toGridStyle = (t: TableItem) => ({ gridColumn: `${t.x + 1} / span ${t.w}`, gridRow: `${t.y + 1} / span ${t.h}` })

  const addFloorTable = (numStr: string, seatsStr: string, setter: (v: { tableNumber: string; seats: string }) => void) => {
    const num = parseInt(numStr || '0', 10)
    const seats = parseInt(seatsStr || '0', 10)
    if (!num || !seats) return
    const id = `t_${Date.now()}`
    setFloorTables(prev => [...prev, { id, tableNumber: num, seats, x: 0, y: 0, w: seats >= 6 ? 2 : 1, h: 1 }])
    setter({ tableNumber: '', seats: '' })
  }

  const removeFloorTable = (id: string) => setFloorTables(prev => prev.filter(t => t.id !== id))

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
                  📅 Prenotazioni
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/customers')}
                  className="bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition h-12 w-36 flex items-center justify-center"
                >
                  👤 Clienti
                </button>
                <button
                  onClick={() => setShowAreaSelectModal(true)}
                  className="bg-green-600 text-white rounded-lg hover:bg-green-700 transition h-12 w-36 flex items-center justify-center"
                >
                  ➕ Nuova Prenotazione
                </button>
                <button
                  onClick={() => { setTableModalTab('lista'); if (selectedAreaId) loadFloorTablesFor(selectedAreaId); setShowTableModal(true) }}
                  className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition h-12 w-36 flex items-center justify-center"
                >
                  🪑 Gestisci Tavoli
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Aree/Sale (permanente) + Passanti affiancati */}
            <div className="grid md:grid-cols-2 gap-6 mb-6 items-stretch">
              <div className="bg-white p-4 rounded-lg shadow h-full">
                <div className="relative mb-2">
                  <div className="font-semibold text-gray-900 text-center">Sale</div>
                  <div className="absolute right-0 top-0 flex items-center gap-2">
                    <button
                      onClick={() => setShowManagePanel(v => !v)}
                      className="h-6 px-2 text-xs text-gray-600 hover:text-gray-800"
                      title="Gestisci sale"
                    >
                      Modifica
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {areas.map(a => (
                    <button
                      key={a.id}
                      className={`flex items-center gap-2 px-3 py-1 rounded border text-sm ${selectedAreaId === a.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                      onClick={() => setSelectedAreaId(a.id)}
                      title={`${a.type}`}
                    >
                      <span>{a.name}</span>
                    </button>
                  ))}
                  {areas.length === 0 && (
                    <div className="text-sm text-gray-500 text-center w-full">Nessuna area. Usa “+” per aggiungere.</div>
                  )}
                </div>

                {showManagePanel && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-gray-900">Gestisci Sale</div>
                      <button onClick={() => setShowManagePanel(false)} className="px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Chiudi</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded p-3">
                        <div className="font-medium text-gray-900 mb-2">Aggiungi Sala</div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Nome</label>
                            <input
                              type="text"
                              value={newAreaName}
                              onChange={(e) => setNewAreaName(e.target.value)}
                              placeholder="Es. Mirabelle"
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Tipo</label>
                            <select
                              value={newAreaType}
                              onChange={(e) => setNewAreaType(e.target.value as AreaType)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
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
                            <button
                              onClick={addArea}
                              className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                              title="Aggiungi sala"
                            >
                              Aggiungi
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="font-medium text-gray-900 mb-2">Sale esistenti</div>
                        <div className="space-y-2 max-h-64 overflow-auto">
                          {areas.length === 0 && (
                            <div className="text-sm text-gray-500">Nessuna sala presente.</div>
                          )}
                          {areas.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium text-gray-900">{a.name}</div>
                                <div className="text-xs text-gray-600">{a.type}</div>
                              </div>
                              <button
                                onClick={() => removeArea(a.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                                title="Elimina"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {calSelectedDate && (
                  <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
                    <div className="relative mb-3">
                      <div className="flex items-center justify-center gap-2">
                        <span>🚶</span>
                        <span className="font-semibold text-gray-900">Tavolo Passanti</span>
                      </div>
                      <button
                        onClick={() => { setPassantiWeekOffset(0); setShowPassantiStats(v => !v) }}
                        className="absolute right-0 top-0 h-6 w-6 flex items-center justify-center text-gray-600 hover:text-gray-800"
                        title="Statistiche"
                      >
                        📈
                      </button>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                      <div className="text-sm font-semibold text-gray-900">Coperti</div>
                      <div className="flex justify-center">
                        {(() => {
                          const hour = new Date().getHours()
                          const value = hour >= 17 ? calWalkins.dinner : calWalkins.lunch
                          return (
                            <input
                              type="number"
                              min={0}
                              value={value}
                              onChange={(e) => {
                                const v = Math.max(0, parseInt(e.target.value || '0', 10))
                                const hourNow = new Date().getHours()
                                if (hourNow >= 17) saveCalWalkins({ lunch: calWalkins.lunch, dinner: v })
                                else saveCalWalkins({ lunch: v, dinner: calWalkins.dinner })
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-gray-900"
                            />
                          )
                        })()}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (isWalkinSubmitting) return
                            setIsWalkinSubmitting(true)
                            try {
                              const now = new Date()
                              const hourNow = now.getHours()
                              const z = (n:number) => (n < 10 ? `0${n}` : `${n}`)
                              const todayISO = `${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`
                              const segment = hourNow >= 17 ? 'dinner' : 'lunch'
                              const defaultTime = segment === 'dinner' ? '20:00' : '13:00'
                              // Usa il numero inserito nel riquadro Coperti come numero di coperti del nuovo tavolo
                              const coversFromInput = Math.max(1, (segment === 'dinner' ? calWalkins.dinner : calWalkins.lunch) || 0)
                              const area = areas.find(a => a.id === selectedAreaId)
                              // Trova primo tavolo libero della sala selezionata per oggi nel segmento
                              const parseH = (t:string) => parseInt((t||'0').split(':')[0]||'0',10)
                              const takenNumbers = new Set(
                                bookings
                                  .filter(b => b.date === todayISO && ((segment === 'dinner' && (parseH(b.time) >= 18)) || (segment === 'lunch' && (parseH(b.time) >= 11 && parseH(b.time) < 16))))
                                  .map(b => b.tableNumber)
                                  .filter(n => n !== null)
                              ) as Set<number>
                              const availableTable = floorTables.find(t => !takenNumbers.has(t.tableNumber))
                              const newBooking = {
                                id: Date.now().toString(),
                                customerName: 'Walk-in',
                                customerPhone: '',
                                date: todayISO,
                                time: defaultTime,
                                partySize: coversFromInput,
                                tableNumber: availableTable ? availableTable.tableNumber : null,
                                status: 'pending',
                                notes: `Passanti${area ? ' - ' + area.name : ''} (${segment === 'dinner' ? 'Cena' : 'Pranzo'})`,
                                createdAt: new Date().toISOString()
                              }
                              setBookings(prev => {
                                const next = [newBooking, ...prev]
                                if (selectedAreaId) saveBookingsForArea(selectedAreaId, next)
                                return next
                              })
                              try { addOrUpdateCustomerFromBooking(newBooking as any) } catch {}
                              // Dopo registrazione, resetta il valore coperti a 1
                              if (segment === 'dinner') {
                                saveCalWalkins({ lunch: calWalkins.lunch, dinner: 1 })
                              } else {
                                saveCalWalkins({ lunch: 1, dinner: calWalkins.dinner })
                              }
                            } finally {
                              // Un piccolo delay per evitare doppi click rapidissimi
                              setTimeout(() => setIsWalkinSubmitting(false), 200)
                            }
                          }}
                          disabled={isWalkinSubmitting}
                          className={`px-3 py-1 rounded text-sm ${isWalkinSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                        >
                          Invia
                        </button>
                      </div>
                    </div>
                    {showPassantiStats && (() => {
                      const toISO = (d: Date) => {
                        const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
                        return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
                      }
                      const getMonday = (d: Date) => {
                        const copy = new Date(d)
                        const day = (copy.getDay() + 6) % 7 // 0 = Monday
                        copy.setDate(copy.getDate() - day)
                        copy.setHours(0, 0, 0, 0)
                        return copy
                      }
                      const getISOWeekNumber = (date: Date) => {
                        const target = new Date(date.valueOf())
                        const dayNr = (target.getDay() + 6) % 7
                        target.setDate(target.getDate() - dayNr + 3)
                        const firstThursday = new Date(target.getFullYear(), 0, 4)
                        const firstThursdayDayNr = (firstThursday.getDay() + 6) % 7
                        firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNr + 3)
                        return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
                      }

                      const ref = new Date()
                      const lastYearSameDate = new Date(ref)
                      lastYearSameDate.setFullYear(ref.getFullYear() - 1)
                      const baseMonday = getMonday(lastYearSameDate)
                      const weekMonday = new Date(baseMonday)
                      weekMonday.setDate(baseMonday.getDate() + passantiWeekOffset * 7)
                      const isoWeek = getISOWeekNumber(weekMonday)

                      const dayLabels = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
                      const refToday = new Date()
                      const refWeekdayIdx = (refToday.getDay() + 6) % 7 // Lunedì=0
                      const daily = Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(weekMonday)
                        d.setDate(weekMonday.getDate() + i)
                        const iso = toISO(d)
                        const passantiBookings = bookings.filter((b) => {
                          if (b.status === 'cancelled') return false
                          if (b.date !== iso) return false
                          const name = (b.customerName || '').toLowerCase()
                          const notes = (b.notes || '').toLowerCase()
                          return name === 'walk-in' || notes.includes('passanti')
                        })
                        const tablesCount = passantiBookings.length
                        const coversCount = passantiBookings.reduce((sum, b) => sum + (b.partySize || 0), 0)
                        return { tablesCount, coversCount }
                      })

                      return (
                        <div className="mt-3 border-t border-gray-200 pt-2">
                          <div className="text-base font-medium text-gray-900 text-center mb-2">Anno scorso — Settimana {isoWeek}</div>
                          <div className="space-y-1 text-xs text-gray-700 mt-2">
                            {daily.map((v, i) => (
                              <div key={i} className="flex items-center w-full">
                                <div className={`font-semibold text-sm w-1/2 ${passantiWeekOffset === 0 && i === refWeekdayIdx ? 'text-red-600' : ''}`}>{dayLabels[i]}</div>
                                <div className="w-1/2 flex items-center justify-between">
                                  <span>Tavoli: {v.tablesCount}</span>
                                  <span>Coperti: {v.coversCount}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {showPassantiStats && (
                      <div className="mt-auto pt-3 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setPassantiWeekOffset(o => o - 1)}
                          className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
                          aria-label="Settimana precedente"
                          title="Settimana precedente"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => setPassantiWeekOffset(0)}
                          className="text-sm text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-0"
                        >
                          Oggi
                        </button>
                        <button
                          onClick={() => setPassantiWeekOffset(o => o + 1)}
                          className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
                          aria-label="Settimana successiva"
                          title="Settimana successiva"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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

            

            {/* Calendario Prenotazioni per Area selezionata */}
            {!!selectedAreaId && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200 relative">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <span>📅</span>
                      <span>{areas.find(a => a.id === selectedAreaId)?.name || ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCalCurrentMonth(new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() - 1, 1))}
                        className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                        aria-label="Mese precedente"
                        title="Mese precedente"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => {
                          const now = new Date()
                          setCalCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                          const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
                          setCalSelectedDate(`${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`)
                        }}
                        className="text-xs text-blue-700 hover:text-blue-900"
                      >
                        Oggi
                      </button>
                      <button
                        onClick={() => setCalCurrentMonth(new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() + 1, 1))}
                        className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                        aria-label="Mese successivo"
                        title="Mese successivo"
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-base font-bold text-gray-900">
                      {(() => {
                        const label = calCurrentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
                        return label.charAt(0).toUpperCase() + label.slice(1)
                      })()}
                    </div>
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
                        {['L','M','M','G','V','S','D'].map((d, i) => (
                          <div key={`${d}-${i}`} className="px-2 py-1 text-center uppercase tracking-wide">{d}</div>
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

                    const tableSet = new Set(floorTables.map(t => t.tableNumber))
                    const cellEls = cells.map(d => {
                      const inMonth = d.getMonth() === calCurrentMonth.getMonth()
                      const dayISO = toLocalISO(d)
                      const dayBookings = bookings.filter(b => {
                        if (b.date !== dayISO) return false
                        if (b.status === 'cancelled') return false
                        if (!selectedAreaId) return true
                        // Considera solo i tavoli appartenenti alla sala selezionata, ma includi anche prenotazioni senza tavolo
                        const num = b.tableNumber ?? -1
                        return b.tableNumber === null || tableSet.has(num)
                      })
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
                            : 'text-gray-400 opacity-50'

                      return (
                        <div
                          key={dayISO}
                          onClick={() => {
                            if (calSelectedDate === dayISO) {
                              setFloorDateISO(dayISO)
                              setTableModalTab('piano')
                              setShowTableModal(true)
                              setSelectedDate(dayISO)
                            } else {
                              setCalSelectedDate(dayISO)
                              setSelectedDate(dayISO)
                            }
                          }}
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
                          <div className={`mt-1 text-[10px] flex justify-center gap-2 ${inMonth ? 'text-gray-700' : 'text-gray-400 opacity-50'}`}>
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

                {/* (Riquadro Passanti eliminato su richiesta) */}
              </div>
            )}

            {/* Lista Prenotazioni */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-3 items-center">
                  <div className="text-sm text-gray-900">
                    {selectedDate ? formatDate(selectedDate) : ''}
                  </div>
                  <h3 className="text-lg font-semibold text-center text-gray-900">Prenotazioni</h3>
                  <div className="text-right text-sm text-gray-900">
                    {(() => {
                      const total = getFilteredBookings()
                        .filter(b => b.status !== 'cancelled')
                        .reduce((sum, b) => sum + b.partySize, 0)
                      return `Totale coperti: ${total}`
                    })()}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {getFilteredBookings().map((booking) => {
                  const isEditing = editingBookingId === booking.id
                  return (
                    <div key={booking.id} className="p-6 hover:bg-gray-50 cursor-pointer" onDoubleClick={() => startEditBooking(booking)}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingForm.customerName}
                                onChange={(e) => setEditingForm({ ...editingForm, customerName: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Nome cliente"
                              />
                            ) : (
                              <h4 className="text-lg font-medium text-gray-900">{booking.customerName}</h4>
                            )}
                          </div>
                          {isEditing ? (
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Data</label>
                                <input
                                  type="date"
                                  value={editingForm.date}
                                  onChange={(e) => setEditingForm({ ...editingForm, date: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Ora</label>
                                <input
                                  type="time"
                                  value={editingForm.time}
                                  onChange={(e) => setEditingForm({ ...editingForm, time: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Persone</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={editingForm.partySize}
                                  onChange={(e) => setEditingForm({ ...editingForm, partySize: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Tavolo</label>
                                <select
                                  value={editingForm.tableNumber}
                                  onChange={(e) => setEditingForm({ ...editingForm, tableNumber: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                >
                                  <option value="">Non assegnato</option>
                                  {floorTables
                                    .slice()
                                    .sort((a,b) => a.tableNumber - b.tableNumber)
                                    .map((t) => (
                                      <option key={t.id} value={t.tableNumber}>
                                        Tavolo {t.tableNumber} ({t.seats} posti)
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div className="col-span-2 md:col-span-4">
                                <label className="block text-xs text-gray-700 mb-1">Telefono</label>
                                <input
                                  type="tel"
                                  value={editingForm.customerPhone}
                                  onChange={(e) => setEditingForm({ ...editingForm, customerPhone: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                              <div className="col-span-2 md:col-span-4">
                                <label className="block text-xs text-gray-700 mb-1">Email</label>
                                <input
                                  type="email"
                                  value={editingForm.customerEmail}
                                  onChange={(e) => setEditingForm({ ...editingForm, customerEmail: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                              <div className="col-span-2 md:col-span-4">
                                <label className="block text-xs text-gray-700 mb-1">Note</label>
                                <textarea
                                  value={editingForm.notes}
                                  onChange={(e) => setEditingForm({ ...editingForm, notes: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                  rows={2}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-lg font-medium text-gray-900">{booking.customerName}</div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div><span className="font-medium">Ora:</span> {formatTime(booking.time)}</div>
                                  <div><span className="font-medium">Persone:</span> {booking.partySize}</div>
                                  <div><span className="font-medium">Tavolo:</span> {booking.tableNumber || 'Non assegnato'}</div>
                                </div>
                              </div>
                              {booking.notes && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <span className="font-medium">Note:</span> {booking.notes}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex space-x-2" onDoubleClick={(e) => e.stopPropagation()}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={confirmEditBooking}
                                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
                              >
                                Conferma
                              </button>
                              <button
                                onClick={cancelEditBooking}
                                className="px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Annulla
                              </button>
                            </>
                          ) : (
                            <>
                              {booking.status !== 'confirmed' && (
                                <button
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
                                >
                                  Conferma
                                </button>
                              )}
                              
                              <button
                                onClick={() => { booking.status !== 'confirmed' ? deleteBooking(booking.id) : updateBookingStatus(booking.id, 'cancelled') }}
                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
                              >
                                Cancella
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
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
        {/* Modal Seleziona Sala per nuova prenotazione */}
        {showAreaSelectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Seleziona Sala</h3>
              {areas.length === 0 ? (
                <div className="text-sm text-gray-600 mb-4">Nessuna sala disponibile. Crea una sala da "Modifica" nella card Sale.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {areas.map(a => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAreaId(a.id)
                        setShowAreaSelectModal(false)
                        setShowBookingModal(true)
                      }}
                      className={`px-3 py-2 rounded border text-sm ${selectedAreaId === a.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                      title={a.type}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAreaSelectModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuova Prenotazione */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-center mb-3">📅 Nuova Prenotazione</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const d = bookingForm.date ? new Date(bookingForm.date) : new Date()
                      d.setDate(d.getDate() - 1)
                      const z = (n:number) => (n < 10 ? `0${n}` : `${n}`)
                      const next = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
                      setBookingForm({ ...bookingForm, date: next })
                    }}
                    className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                    aria-label="Giorno precedente"
                    title="Giorno precedente"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                    className="text-sm font-semibold text-gray-900"
                    title="Seleziona data"
                  >
                    {(() => {
                      const d = bookingForm.date ? new Date(bookingForm.date) : new Date()
                      return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    })()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = bookingForm.date ? new Date(bookingForm.date) : new Date()
                      d.setDate(d.getDate() + 1)
                      const z = (n:number) => (n < 10 ? `0${n}` : `${n}`)
                      const next = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
                      setBookingForm({ ...bookingForm, date: next })
                    }}
                    className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                    aria-label="Giorno successivo"
                    title="Giorno successivo"
                  >
                    →
                  </button>
                </div>
              </div>
              <form onSubmit={handleBookingSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nominativo Cliente
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nome"
                        value={bookingForm.customerFirstName}
                        onChange={(e) => setBookingForm({...bookingForm, customerFirstName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Cognome"
                        value={bookingForm.customerLastName}
                        onChange={(e) => setBookingForm({...bookingForm, customerLastName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={bookingForm.customerEmail}
                      onChange={(e) => setBookingForm({...bookingForm, customerEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="hidden">
                      {/* Input data tenuto per showPicker via ref */}
                      <input
                        type="date"
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
                        ref={dateInputRef}
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
                        Tavolo
                      </label>
                      <select
                        value={bookingForm.tableNumber}
                        onChange={(e) => setBookingForm({...bookingForm, tableNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Seleziona tavolo</option>
                        {floorTables
                          .slice()
                          .sort((a,b) => a.tableNumber - b.tableNumber)
                          .map((t) => (
                            <option key={t.id} value={t.tableNumber}>
                              Tavolo {t.tableNumber} ({t.seats} posti)
                            </option>
                          ))}
                        {floorTables.length === 0 && (
                          <option value="" disabled>Nessun tavolo definito per questa sala</option>
                        )}
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

        {/* Modal Gestione Tavoli (unificato con Piano Tavoli per Sala) */}
        {showTableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-5xl w-full mx-4" onMouseMove={onMouseMoveTable} onMouseUp={onMouseUpTable}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { if (tableModalTab === 'piano') setTableModalTab('lista'); else setShowTableModal(false) }}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Indietro</span>
                  </button>
                  <h3 className="text-lg font-semibold">🪑 Gestione Tavoli — {areas.find(a => a.id === selectedAreaId)?.name || 'Seleziona una Sala'}</h3>
                </div>
                <button onClick={() => setShowTableModal(false)} className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Chiudi</button>
              </div>
              {!selectedAreaId ? (
                <div className="text-sm text-gray-600">Seleziona una Sala nella pagina per gestire la mappa tavoli.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {tableModalTab === 'piano' && (
                        <input
                          type="date"
                          value={floorDateISO}
                          onChange={(e) => setFloorDateISO(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTableModalTab('lista')}
                        className={`px-3 py-2 text-sm border-b-2 ${tableModalTab === 'lista' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                      >
                        Lista Tavoli
                      </button>
                      <button
                        onClick={() => setTableModalTab('piano')}
                        className={`px-3 py-2 text-sm border-b-2 ${tableModalTab === 'piano' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                      >
                        Piano Tavoli
                      </button>
                      {tableModalTab === 'piano' && (
                        <button
                          onClick={() => setIsLayoutEdit(v => !v)}
                          className={`ml-2 px-3 py-1 rounded text-sm ${isLayoutEdit ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                          title="Abilita spostamento tavoli"
                        >
                          {isLayoutEdit ? 'Disabilita spostamento' : 'Abilita spostamento'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 border-b border-gray-200" />

                  {tableModalTab === 'lista' && (
                    <div className="mb-3">
                      {/* Form aggiunta tavolo */}
                      <div className="flex flex-wrap items-end gap-2 mb-3">
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Numero Tavolo</label>
                          <input
                            type="number"
                            value={floorAddForm.tableNumber}
                            onChange={(e) => setFloorAddForm({ ...floorAddForm, tableNumber: e.target.value })}
                            className="w-28 px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Posti</label>
                          <input
                            type="number"
                            value={floorAddForm.seats}
                            onChange={(e) => setFloorAddForm({ ...floorAddForm, seats: e.target.value })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <button
                          onClick={() => addFloorTable(floorAddForm.tableNumber, floorAddForm.seats, setFloorAddForm)}
                          className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                        >
                          Aggiungi Tavolo
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {floorTables.length === 0 && (
                          <div className="col-span-full text-sm text-gray-500">Nessun tavolo presente per questa sala.</div>
                        )}
                        {floorTables.map(t => {
                          const isOccupied = occupiedSet.has(String(t.tableNumber))
                          return (
                            <div key={t.id} className={`p-3 rounded border ${isOccupied ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                              <div className="text-center">
                                <p className="font-medium">Tavolo {t.tableNumber}</p>
                                <p className="text-sm text-gray-600">{t.seats} posti</p>
                                <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${isOccupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                  {isOccupied ? 'Occupato' : 'Libero'}
                                </span>
                              </div>
                              <div className="mt-2 flex justify-center">
                                <button onClick={() => removeFloorTable(t.id)} className="text-xs text-red-600 hover:text-red-800">Elimina</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {tableModalTab === 'piano' && (
                    <>
                      {/* Legend */}
                      <div className="bg-white p-3 rounded border mb-3 flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400"></span><span>Libero</span></div>
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400"></span><span>Occupato (giorno scelto)</span></div>
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-yellow-200 border border-yellow-400"></span><span>Capienza ≥ 6</span></div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <div className="mb-3 text-sm text-gray-700">{isLayoutEdit ? 'Sposta i tavoli e rilascia per salvare (per Sala).' : 'Mappa tavoli (solo visualizzazione). Libero = verde, Occupato = rosso.'}</div>
                        <div
                          ref={cellSizeRef}
                          className="relative grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${gridRows}, 60px)` }}
                        >
                          {/* Sfondo griglia */}
                          {Array.from({ length: gridCols * gridRows }).map((_, idx) => (
                            <div key={idx} className="border border-dashed border-gray-200" />
                          ))}
                          {/* Tavoli */}
                          {floorTables.map(t => {
                            const isOccupied = occupiedSet.has(String(t.tableNumber))
                            const base = t.seats >= 6 ? 'bg-yellow-100 border-yellow-300' : 'bg-green-100 border-green-300'
                            const busy = isOccupied ? 'bg-red-100 border-red-300' : base
                            return (
                              <div
                                key={t.id}
                                style={toGridStyle(t) as any}
                                className={`absolute rounded-md border p-2 ${isLayoutEdit ? 'cursor-move' : 'cursor-default'} select-none ${busy}`}
                                onMouseDown={(e) => { if (isLayoutEdit) onMouseDownTable(e, t.id) }}
                              >
                                <div className="flex justify-between items-center text-sm">
                                  <div className="font-semibold text-gray-900">Tavolo {t.tableNumber}</div>
                                </div>
                                <div className="text-xs text-gray-700">{t.seats} posti</div>
                                {isOccupied && (
                                  <div className="text-xs text-red-700 mt-1">Prenotato</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
