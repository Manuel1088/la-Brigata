'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
// import { LEAVE_TYPES } from '@/lib/leaveSystem'

// Stati richiesta ferie
export enum LeaveStatus {
  SUBMITTED = 'SUBMITTED',
  MANAGER_MODIFIED = 'MANAGER_MODIFIED',
  EMPLOYEE_COUNTER = 'EMPLOYEE_COUNTER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export default function LeavesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageEmployees } = usePermissions()
  
  const isManager = canManageEmployees()
  const [activeView, setActiveView] = useState('my-requests')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<{ type: string; startDate: string; endDate: string; reason: string }>({ type: 'VACATION', startDate: '', endDate: '', reason: '' })
  const userId: string = session?.user?.id || ''
  const department = session?.user?.department || ''
  interface LeaveRequestLocal {
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
  const [myRequests, setMyRequests] = useState<LeaveRequestLocal[]>([])

  // Load personal requests safely (no state updates during render)
  useEffect(() => {
    const loadMine = () => {
      try {
        const all = JSON.parse(localStorage.getItem('leave_requests') || '[]') as LeaveRequestLocal[]
        const mine = all.filter((r) => r.userId === userId)
        setMyRequests(mine)
      } catch {
        setMyRequests([])
      }
    }
    if (userId) loadMine()
    const onUpdate = () => loadMine()
    window.addEventListener('leave_system_updated', onUpdate)
    return () => window.removeEventListener('leave_system_updated', onUpdate)
  }, [userId])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏖️ Ferie e Permessi</h1>
              <p className="text-gray-600 mt-2">
                {isManager 
                  ? 'Gestisci richieste ferie del team'
                  : 'Richiedi e gestisci le tue ferie'
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Link approvazioni (solo Manager/Owner) */}
        {isManager && (
          <div className="mb-4">
            <button onClick={() => router.push('/approvals')} className="text-sm text-orange-600 font-semibold hover:underline">
              Vai a Approvazioni →
            </button>
          </div>
        )}

        {/* VISTA: Le Mie Richieste */}
        {activeView === 'my-requests' && (
          <div className="space-y-6">
            {/* Saldo Ferie */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600">26</div>
                <div className="text-sm text-green-700">Giorni Totali</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                <div className="text-3xl font-bold text-orange-600">10</div>
                <div className="text-sm text-orange-700">Usati</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">16</div>
                <div className="text-sm text-blue-700">Disponibili</div>
              </div>
            </div>

            {/* Nuova Richiesta */}
            <button
              onClick={() => setIsFormOpen(true)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow"
            >
              ➕ Nuova Richiesta
            </button>

            {isFormOpen && (
              <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuova Richiesta</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tipo</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="VACATION">Ferie</option>
                      <option value="ROL">ROL</option>
                      <option value="PAID_LEAVE">Permesso Retribuito</option>
                      <option value="UNPAID_LEAVE">Permesso Non Retribuito</option>
                      <option value="SICK_LEAVE">Malattia</option>
                      <option value="PARENTAL_LEAVE">Congedo Parentale</option>
                      <option value="STUDY_LEAVE">Permesso Studio</option>
                      <option value="UNION_LEAVE">Permesso Sindacale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Dal</label>
                    <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Al</label>
                    <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm text-gray-700 mb-1">Motivo (opzionale)</label>
                  <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Es. Vacanza famiglia" />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Annulla</button>
                  <button
                    onClick={() => {
                      if (!form.startDate || !form.endDate) { alert('Seleziona date'); return }
                      const list = JSON.parse(localStorage.getItem('leave_requests') || '[]') as LeaveRequestLocal[]
                      const newReq: LeaveRequestLocal = {
                        id: crypto.randomUUID(), userId: userId, department, type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason,
                        status: 'PENDING', createdAt: new Date().toISOString()
                      }
                      list.push(newReq)
                      localStorage.setItem('leave_requests', JSON.stringify(list))
                      window.dispatchEvent(new CustomEvent('leave_system_updated'))
                      setIsFormOpen(false)
                      // ricarica lista
                      try { setMyRequests(list.filter((r) => r.userId === userId)) } catch {}
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Invia
                  </button>
                </div>
              </div>
            )}

            {/* Le Tue Richieste */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Le Tue Richieste</h3>
              
              <div className="space-y-4">
                {(!myRequests || myRequests.length === 0) ? (
                  <div className="text-sm text-gray-500">Nessuna richiesta inviata.</div>
                ) : (
                  myRequests.slice().reverse().map((req) => (
                    <div key={req.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600">{req.type}</div>
                          <div className="font-semibold">{new Date(req.startDate).toLocaleDateString('it-IT')} - {new Date(req.endDate).toLocaleDateString('it-IT')}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'PENDING' ? 'bg-blue-100 text-blue-800' : req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              {/* Richiesta Modificata dal Manager */}
              {/* Esempi statici mantenuti per UI */}
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                    ⚠️ MODIFICATA DAL MANAGER
                  </span>
                  <span className="text-xs text-gray-500">5 Ottobre 2025</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div>
                    <span className="text-sm text-gray-600">Date richieste:</span>
                    <div className="font-medium line-through text-gray-500">10-15 Dicembre</div>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Proposte dal manager:</span>
                    <div className="font-bold text-green-700">12-17 Dicembre</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-4 p-3 bg-white rounded">
                  <strong>Motivazione:</strong> &quot;Abbiamo già 2 persone in ferie dal 10-12. Le date 12-17 vanno meglio.&quot;
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    ✅ Accetto
                  </button>
                  <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                    ❌ Rifiuto
                  </button>
                  <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    ✏️ Altre Date
                  </button>
                </div>
              </div>

              {/* Richiesta Pending */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hidden">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                      ⏳ IN ATTESA
                    </span>
                    <div className="mt-2 font-semibold">5-10 Gennaio 2026</div>
                    <div className="text-sm text-gray-600">5 giorni • Richiesta del 8 Ottobre</div>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                    🗑️ Annulla
                  </button>
                </div>
              </div>

              {/* Richiesta Approvata */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 hidden">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                      ✅ APPROVATA
                    </span>
                    <div className="mt-2 font-semibold">20-25 Agosto 2025</div>
                    <div className="text-sm text-gray-600">5 giorni • Approvata da Marco Rossi il 1 Agosto</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Vista approvazioni rimossa: usare pagina /approvals */}
      </main>
    </div>
  )
}

