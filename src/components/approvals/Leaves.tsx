import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from '@/lib/leaves'

export type LeaveRequestItem = {
  id: string
  userId: string
  userName: string
  userDepartment: string | null
  type: string
  startDate: string
  endDate: string
  certificateNumber: string | null
  reason: string | null
  status: string
  createdAt: string
}

const isSickLeaveType = (type: string) =>
  type === 'SICK_LEAVE' || type === 'SICK_LEAVE_CHILD'

export default function ApprovalsLeaves({ onUpdate }: { onUpdate: () => void }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<LeaveRequestItem[]>([])
  const [allItems, setAllItems] = useState<LeaveRequestItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setAllItems([])
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/leaves?includeBalances=false')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore caricamento')
      const all = (data.requests ?? []) as LeaveRequestItem[]
      setAllItems(all)
      const pending = all
        .filter((r) => r.status === 'PENDING')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setItems(pending)
      setStatusFilter('PENDING')
    } catch {
      setAllItems([])
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const total = allItems.length
    const pending = allItems.filter((r) => r.status === 'PENDING').length
    const approved = allItems.filter((r) => r.status === 'APPROVED').length
    const rejected = allItems.filter((r) => r.status === 'REJECTED').length
    return { total, pending, approved, rejected }
  }, [allItems])

  const applyFilter = (what: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL') => {
    setStatusFilter(what)
    let list = allItems.slice()
    if (what !== 'ALL') list = list.filter((r) => r.status === what)
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    setItems(list)
  }

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    let rejectionReason: string | undefined
    if (action === 'REJECTED') {
      const reason = window.prompt('Motivo del rifiuto:')?.trim()
      if (!reason) return
      rejectionReason = reason
    }
    setActingId(id)
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, rejectionReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Operazione non riuscita')
        return
      }
      await load()
      window.dispatchEvent(new CustomEvent('approvals_updated'))
      onUpdate?.()
    } catch {
      alert('Errore di rete')
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Caricamento richieste ferie...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`bg-blue-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter === 'ALL' ? 'ring-2 ring-blue-300 shadow' : 'border border-blue-200'}`}
          onClick={() => applyFilter('ALL')}
        >
          <div className="text-2xl font-bold text-blue-600">{counts.total}</div>
          <div className="text-sm text-blue-700">Totali</div>
        </div>
        <div
          className={`bg-yellow-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter === 'PENDING' ? 'ring-2 ring-yellow-300 shadow' : 'border border-yellow-200'}`}
          onClick={() => applyFilter('PENDING')}
        >
          <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
          <div className="text-sm text-yellow-700">In Attesa</div>
        </div>
        <div
          className={`bg-green-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter === 'APPROVED' ? 'ring-2 ring-green-300 shadow' : 'border border-green-200'}`}
          onClick={() => applyFilter('APPROVED')}
        >
          <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
          <div className="text-sm text-green-700">Approvate</div>
        </div>
        <div
          className={`bg-red-50 rounded-lg p-4 text-center cursor-pointer hover:opacity-90 transition ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-300 shadow' : 'border border-red-200'}`}
          onClick={() => applyFilter('REJECTED')}
        >
          <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
          <div className="text-sm text-red-700">Rifiutate</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">
          Nessuna richiesta {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()}.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.userName}</div>
                  <div className="text-xs text-gray-600">
                    {LEAVE_TYPE_LABELS[item.type] ?? item.type}
                  </div>
                  <div className="font-semibold">
                    {new Date(item.startDate).toLocaleDateString('it-IT')} -{' '}
                    {new Date(item.endDate).toLocaleDateString('it-IT')}
                  </div>
                  {isSickLeaveType(item.type) && (
                    <div className="text-sm text-gray-600 mt-1">
                      Certificato:{' '}
                      {item.certificateNumber?.trim()
                        ? item.certificateNumber
                        : 'non fornito'}
                    </div>
                  )}
                  {item.reason && (
                    <div className="text-sm text-gray-600 mt-1">{item.reason}</div>
                  )}
                  {item.userDepartment && (
                    <div className="text-xs text-gray-500 mt-1">
                      Reparto: {item.userDepartment}
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'PENDING'
                      ? 'bg-blue-100 text-blue-800'
                      : item.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {LEAVE_STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>
              {item.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={actingId === item.id}
                    onClick={() => handleAction(item.id, 'APPROVED')}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                  >
                    Approva
                  </button>
                  <button
                    disabled={actingId === item.id}
                    onClick={() => handleAction(item.id, 'REJECTED')}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
                  >
                    Rifiuta
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
