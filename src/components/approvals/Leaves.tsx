import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

interface LeaveRequestItem {
  id: string
  userId: string
  department?: string
  type: string
  startDate: string
  endDate: string
  reason?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export default function ApprovalsLeaves({ onUpdate }: { onUpdate: () => void }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<LeaveRequestItem[]>([])
  const [allItems, setAllItems] = useState<LeaveRequestItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING')

  const userRole = session?.user?.role || ''
  const userDept = (session?.user?.department || '').toLowerCase()
  const isAdmin = ['ADMIN','PROPRIETARIO','MANAGER','DIRETTORE'].includes(userRole)

  const load = () => {
    try {
      const raw = localStorage.getItem('leave_requests')
      const all: LeaveRequestItem[] = raw ? JSON.parse(raw) : []
      const filteredByScope = isAdmin ? all : all.filter(r => (r.department || '').toLowerCase() === userDept)
      setAllItems(filteredByScope)
      // default view: pending (ordine di arrivo: più vecchi prima)
      const pending = filteredByScope
        .filter(r => r.status === 'PENDING')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setItems(pending)
    } catch {
      setAllItems([])
      setItems([])
    }
  }

  useEffect(() => { load() }, [session?.user])

  const counts = useMemo(() => {
    const total = allItems.length
    const pending = allItems.filter(r => r.status === 'PENDING').length
    const approved = allItems.filter(r => r.status === 'APPROVED').length
    const rejected = allItems.filter(r => r.status === 'REJECTED').length
    return { total, pending, approved, rejected }
  }, [allItems])

  const applyFilter = (what: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL') => {
    setStatusFilter(what)
    let list = allItems.slice()
    if (what !== 'ALL') list = list.filter(r => r.status === what)
    // Ordine di arrivo: più vecchi prima
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    setItems(list)
  }

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const all: LeaveRequestItem[] = JSON.parse(localStorage.getItem('leave_requests') || '[]')
      const idx = all.findIndex(r => r.id === id)
      if (idx !== -1) {
        all[idx].status = action
        localStorage.setItem('leave_requests', JSON.stringify(all))
        load()
        try { window.dispatchEvent(new CustomEvent('leave_system_updated')); window.dispatchEvent(new CustomEvent('approvals_updated')) } catch {}
        onUpdate?.()
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Counters (stile uniforme a Cambi Turno) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`bg-blue-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter==='ALL' ? 'ring-2 ring-blue-300 shadow' : 'border border-blue-200'}`}
          onClick={() => applyFilter('ALL')}
        >
          <div className="text-2xl font-bold text-blue-600">{counts.total}</div>
          <div className="text-sm text-blue-700">Totali</div>
        </div>
        <div
          className={`bg-yellow-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter==='PENDING' ? 'ring-2 ring-yellow-300 shadow' : 'border border-yellow-200'}`}
          onClick={() => applyFilter('PENDING')}
        >
          <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
          <div className="text-sm text-yellow-700">In Attesa</div>
        </div>
        <div
          className={`bg-green-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter==='APPROVED' ? 'ring-2 ring-green-300 shadow' : 'border border-green-200'}`}
          onClick={() => applyFilter('APPROVED')}
        >
          <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
          <div className="text-sm text-green-700">Approvate</div>
        </div>
        <div
          className={`bg-red-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter==='REJECTED' ? 'ring-2 ring-red-300 shadow' : 'border border-red-200'}`}
          onClick={() => applyFilter('REJECTED')}
        >
          <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
          <div className="text-sm text-red-700">Rifiutate</div>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-sm text-gray-500">Nessuna richiesta {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()}.</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-600">{item.type}</div>
                  <div className="font-semibold">{new Date(item.startDate).toLocaleDateString('it-IT')} - {new Date(item.endDate).toLocaleDateString('it-IT')}</div>
                  {item.reason && <div className="text-sm text-gray-600 mt-1">{item.reason}</div>}
                  {item.department && <div className="text-xs text-gray-500 mt-1">Reparto: {item.department}</div>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'PENDING' ? 'bg-blue-100 text-blue-800' : item.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {item.status}
                </span>
              </div>
              {item.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAction(item.id, 'APPROVED')} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">✅ Approva</button>
                  <button onClick={() => handleAction(item.id, 'REJECTED')} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">❌ Rifiuta</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
