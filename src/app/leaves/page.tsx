'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { LEAVE_TYPES, getLeaveBalances, getLeaveRequests, getLeaveRequestsByStatus, updateLeaveRequestStatus, proposeLeaveDates } from '@/lib/leaveSystem'

export default function LeavesUnifiedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canRequestLeave, canApproveLeave, canViewAllLeaves } = usePermissions()

  const [activeTab, setActiveTab] = useState<'personal' | 'approvals'>('personal')

  useEffect(() => {
    if (status !== 'loading' && !session) router.push('/login')
  }, [status, session, router])

  const toSafeDate = (v: any): Date | null => {
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v
    const d = new Date(v); return isNaN(d.getTime()) ? null : d
  }

  const balances = useMemo(() => session?.user?.id ? getLeaveBalances(session.user.id) : [], [session?.user?.id])
  const myRequests = useMemo(() => session?.user?.id ? getLeaveRequests(session.user.id) : [], [session?.user?.id])

  // Approvals state
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const approvals = useMemo(() => {
    if (filter === 'pending') return getLeaveRequestsByStatus('PENDING')
    if (filter === 'approved') return getLeaveRequestsByStatus('APPROVED')
    if (filter === 'rejected') return getLeaveRequestsByStatus('REJECTED')
    return getLeaveRequests()
  }, [filter])

  const [comment, setComment] = useState('')
  const [proposedStart, setProposedStart] = useState('')
  const [proposedEnd, setProposedEnd] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  return (
    <PermissionGuard permission="ferie_view">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">🏖️ Ferie e Permessi</h1>
              </div>
              <div className="flex items-center space-x-2">
                {canRequestLeave() && (
                  <button onClick={() => router.push('/leaves/new')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">➕ Nuova Richiesta</button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button onClick={() => setActiveTab('personal')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='personal'?'border-blue-500 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>👤 Personali</button>
                  {canApproveLeave() && (
                    <button onClick={() => setActiveTab('approvals')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='approvals'?'border-blue-500 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>✅ Approvazioni</button>
                  )}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {/* Saldi */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold text-gray-900">💳 I Miei Saldi</h2></div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {balances.map(b => {
                      const cfg = LEAVE_TYPES[b.type]
                      return (
                        <div key={b.type} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center"><span className="text-2xl mr-2">{cfg?.icon}</span><div><div className="font-semibold">{cfg?.name || b.type}</div><div className="text-xs text-gray-500">{cfg?.description || ''}</div></div></div>
                            <span className={`px-2 py-1 rounded-full text-xs ${b.percentage>80?'bg-red-100 text-red-800':b.percentage>60?'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-800'}`}>{b.percentage}%</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-700"><span>Usati</span><span>{b.used}/{b.total}</span></div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Le Mie Richieste */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold text-gray-900">📋 Le Mie Richieste</h2></div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giorni</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th></tr></thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {myRequests.map(r => {
                          const cfg = LEAVE_TYPES[r.type]
                          const s = toSafeDate(r.startDate); const e = toSafeDate(r.endDate)
                          const days = s && e ? Math.ceil((e.getTime()-s.getTime())/(1000*60*60*24))+1 : 0
                          return (
                            <tr key={r.id}><td className="px-6 py-4 whitespace-nowrap"><span className="text-xl mr-2">{cfg?.icon}</span>{cfg?.name||r.type}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s?.toLocaleDateString('it-IT')||'-'} - {e?.toLocaleDateString('it-IT')||'-'}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{days}</td><td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">{r.status}</span></td></tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'approvals' && canApproveLeave() && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">✅ Approvazioni</h2>
                    <div className="space-x-2">
                      <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded text-sm ${filter==='pending'?'bg-yellow-100 text-yellow-800':'bg-gray-100 text-gray-700'}`}>⏳ In Attesa</button>
                      <button onClick={() => setFilter('approved')} className={`px-3 py-1 rounded text-sm ${filter==='approved'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-700'}`}>✅ Approvate</button>
                      <button onClick={() => setFilter('rejected')} className={`px-3 py-1 rounded text-sm ${filter==='rejected'?'bg-red-100 text-red-800':'bg-gray-100 text-gray-700'}`}>❌ Rifiutate</button>
                      <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm ${filter==='all'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-700'}`}>📋 Tutte</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dipendente</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giorni</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th></tr></thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {approvals.map(r => {
                          const cfg = LEAVE_TYPES[r.type]
                          const s = toSafeDate(r.startDate); const e = toSafeDate(r.endDate)
                          const days = s && e ? Math.ceil((e.getTime()-s.getTime())/(1000*60*60*24))+1 : 0
                          return (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">Dipendente {r.userId}</td>
                              <td className="px-6 py-4 whitespace-nowrap"><span className="text-xl mr-2">{cfg?.icon}</span>{cfg?.name||r.type}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s?.toLocaleDateString('it-IT')||'-'} - {e?.toLocaleDateString('it-IT')||'-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{days}</td>
                              <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs ${r.status==='PENDING'?'bg-yellow-100 text-yellow-800':r.status==='APPROVED'?'bg-green-100 text-green-800':r.status==='REJECTED'?'bg-red-100 text-red-800':'bg-gray-100 text-gray-800'}`}>{r.status}</span></td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {r.status==='PENDING' && canApproveLeave() ? (
                                  <div className="flex space-x-2">
                                    <button onClick={() => updateLeaveRequestStatus(r.id,'APPROVED',session?.user?.id||'')} className="text-green-600 hover:text-green-900">✅ Approva</button>
                                    <button onClick={() => updateLeaveRequestStatus(r.id,'REJECTED',session?.user?.id||'', 'Rifiutata')} className="text-red-600 hover:text-red-900">❌ Rifiuta</button>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {canApproveLeave() && (
                    <div className="p-6 border-t space-y-3">
                      <div className="text-sm font-medium">✏️ Proponi nuove date (seleziona richiesta dall'elenco)</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="date" value={proposedStart} onChange={(e)=>setProposedStart(e.target.value)} className="px-3 py-2 border rounded" />
                        <input type="date" value={proposedEnd} onChange={(e)=>setProposedEnd(e.target.value)} className="px-3 py-2 border rounded" />
                        <input type="text" placeholder="Commento" value={comment} onChange={(e)=>setComment(e.target.value)} className="px-3 py-2 border rounded" />
                      </div>
                      <button onClick={()=>{ if(!proposedStart||!proposedEnd) return; const first = approvals.find(a=>a.status==='PENDING'); if(!first||!session?.user?.id) return; proposeLeaveDates(first.id, session.user.id, new Date(proposedStart), new Date(proposedEnd), comment) }} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition text-sm">Invia proposta sulla prima richiesta in attesa</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
