'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'

type TableStatus = 'available' | 'occupied'

interface TableItem {
  id: string
  tableNumber: number
  seats: number
  x: number // col start (0-based)
  y: number // row start (0-based)
  w: number // width in cols
  h: number // height in rows
}

interface Booking {
  id: string
  date: string // yyyy-mm-dd
  time: string // HH:mm
  partySize: number
  tableNumber: number | null
  status: 'confirmed' | 'pending' | 'cancelled' | 'waiting'
}

const STORAGE_KEY = 'table_layout_v1'

export default function FloorPlanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [gridCols] = useState(12)
  const [gridRows] = useState(8)
  const [tables, setTables] = useState<TableItem[]>([])
  const [selectedDateISO, setSelectedDateISO] = useState(() => {
    const d = new Date(); const z = (n:number)=> n<10?`0${n}`:`${n}`; return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
  })
  const [isAdding, setIsAdding] = useState(false)
  const [newTable, setNewTable] = useState({ tableNumber: '', seats: '' })

  const cellSizeRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{dx:number, dy:number}>({dx:0, dy:0})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setTables(JSON.parse(raw))
      else setTables([
        { id: 't1', tableNumber: 1, seats: 2, x: 1, y: 1, w: 1, h: 1 },
        { id: 't2', tableNumber: 2, seats: 2, x: 3, y: 1, w: 1, h: 1 },
        { id: 't3', tableNumber: 3, seats: 4, x: 5, y: 2, w: 2, h: 1 },
        { id: 't4', tableNumber: 4, seats: 6, x: 8, y: 3, w: 2, h: 2 }
      ])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tables)) } catch {}
  }, [tables])

  // mock prenotazioni del giorno
  const bookings: Booking[] = useMemo(() => ([
    { id: 'b1', date: selectedDateISO, time: '19:30', partySize: 2, tableNumber: 1, status: 'confirmed' },
    { id: 'b2', date: selectedDateISO, time: '20:00', partySize: 4, tableNumber: 3, status: 'confirmed' },
    { id: 'b3', date: selectedDateISO, time: '21:00', partySize: 6, tableNumber: 4, status: 'pending' }
  ]), [selectedDateISO])

  const occupiedSet = useMemo(() => new Set((bookings||[]).filter(b => b.status !== 'cancelled' && b.tableNumber).map(b => String(b.tableNumber))), [bookings])

  const onMouseDown = (e: React.MouseEvent, id: string) => {
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

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragId) return
    const container = cellSizeRef.current?.getBoundingClientRect()
    if (!container) return
    const cellW = container.width / gridCols
    const cellH = container.height / gridRows
    const x = Math.floor((e.clientX - container.left) / cellW) - dragOffset.dx
    const y = Math.floor((e.clientY - container.top) / cellH) - dragOffset.dy
    setTables(prev => prev.map(t => t.id === dragId ? ({ ...t, x: Math.max(0, Math.min(gridCols - t.w, x)), y: Math.max(0, Math.min(gridRows - t.h, y)) }) : t))
  }

  const onMouseUp = () => setDragId(null)

  const addTable = () => {
    const num = parseInt(newTable.tableNumber)
    const seats = parseInt(newTable.seats)
    if (!num || !seats) return
    const id = `t_${Date.now()}`
    setTables(prev => [...prev, { id, tableNumber: num, seats, x: 0, y: 0, w: seats >= 6 ? 2 : 1, h: 1 }])
    setIsAdding(false)
    setNewTable({ tableNumber: '', seats: '' })
  }

  const removeTable = (id: string) => {
    setTables(prev => prev.filter(t => t.id !== id))
  }

  const toGridStyle = (t: TableItem) => ({
    gridColumn: `${t.x + 1} / span ${t.w}`,
    gridRow: `${t.y + 1} / span ${t.h}`
  })

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  if (!session) return null

  return (
    <PermissionGuard permission="turni_manage">
      <div className="min-h-screen bg-gray-50" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        {/* Header */}
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
                <h1 className="text-3xl font-bold text-gray-900">
                  🗺️ Piano Tavoli
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="date"
                  value={selectedDateISO}
                  onChange={(e) => setSelectedDateISO(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setIsAdding(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  ➕ Aggiungi Tavolo
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Legend */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400"></span><span>Libero</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400"></span><span>Occupato (oggi)</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-yellow-200 border border-yellow-400"></span><span>Capienza ≥ 6</span></div>
            </div>

            {/* Grid Floor */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="mb-3 text-sm text-gray-700">Trascina i tavoli per riposizionarli. Salvataggio automatico.</div>
              <div
                ref={cellSizeRef}
                className="relative grid gap-1"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${gridRows}, 60px)` }}
              >
                {/* grid background */}
                {Array.from({ length: gridCols * gridRows }).map((_, idx) => (
                  <div key={idx} className="border border-dashed border-gray-200" />
                ))}

                {/* tables */}
                {tables.map(t => {
                  const isOccupied = occupiedSet.has(String(t.tableNumber))
                  const base = t.seats >= 6 ? 'bg-yellow-100 border-yellow-300' : 'bg-green-100 border-green-300'
                  const busy = isOccupied ? 'bg-red-100 border-red-300' : base
                  return (
                    <div
                      key={t.id}
                      style={toGridStyle(t)}
                      className={`absolute rounded-md border p-2 cursor-move select-none ${busy}`}
                      onMouseDown={(e) => onMouseDown(e, t.id)}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <div className="font-semibold text-gray-900">Tavolo {t.tableNumber}</div>
                        <button onClick={() => removeTable(t.id)} className="text-xs text-red-600 hover:text-red-800">✕</button>
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
          </div>
        </main>

        {/* Modal add table */}
        {isAdding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">➕ Nuovo Tavolo</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero Tavolo</label>
                  <input
                    type="number"
                    value={newTable.tableNumber}
                    onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posti</label>
                  <input
                    type="number"
                    value={newTable.seats}
                    onChange={(e) => setNewTable({ ...newTable, seats: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Annulla</button>
                <button onClick={addTable} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Aggiungi</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}


