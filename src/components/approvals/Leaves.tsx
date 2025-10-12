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

  const userRole = (session?.user as any)?.role || ''
  const userDept = ((session?.user as any)?.department || '').toLowerCase()
  const isAdmin = ['ADMIN','PROPRIETARIO','MANAGER','DIRETTORE'].includes(userRole)

  const load = () => {
    try {
      const all: LeaveRequestItem[] = JSON.parse(localStorage.getItem('leave_requests') || '[]')
      const pending = all.filter(r => r.status === 'PENDING')
      const filtered = isAdmin
        ? pending
        : pending.filter(r => (r.department || '').toLowerCase() === userDept)
      setItems(filtered.reverse())
    } catch {
      setItems([])
    }
  }

  useEffect(() => { load() }, [session?.user])

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

  if (!items.length) {
    return (
      <div className="text-sm text-gray-500">Nessuna richiesta ferie/permessi in attesa.</div>
    )
  }

  return (
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
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">PENDING</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleAction(item.id, 'APPROVED')} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">✅ Approva</button>
            <button onClick={() => handleAction(item.id, 'REJECTED')} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">❌ Rifiuta</button>
          </div>
        </div>
      ))}
    </div>
  )
}
