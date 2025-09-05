'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useAudit } from '@/hooks/useAudit'
import { useNotifications } from '@/hooks/useNotifications'
import { 
  getLeaveRequests, 
  getLeaveRequestsByStatus,
  updateLeaveRequestStatus,
  LEAVE_TYPES 
} from '@/lib/leaveSystem'

export default function LeaveApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canApproveLeave, canViewAllLeaves } = usePermissions()
  const { logApproveAction, logRejectAction } = useAudit()
  const { notifyLeaveApproved, notifyLeaveRejected } = useNotifications()
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    loadRequests()
  }, [session, status, router, filter])

  const loadRequests = () => {
    let requests = []
    
    if (filter === 'pending') {
      requests = getLeaveRequestsByStatus('PENDING')
    } else if (filter === 'approved') {
      requests = getLeaveRequestsByStatus('APPROVED')
    } else if (filter === 'rejected') {
      requests = getLeaveRequestsByStatus('REJECTED')
    } else {
      requests = getLeaveRequests()
    }
    
    setPendingRequests(requests)
  }

  const handleApprove = async (requestId: string) => {
    if (!session?.user?.id) return
    
    setIsProcessing(true)
    
    const result = updateLeaveRequestStatus(requestId, 'APPROVED', session.user.id, comment)
    
    if (result.success) {
      logApproveAction('leave_request', requestId, { comment })
      
      // Crea notifica di approvazione
      const request = pendingRequests.find(r => r.id === requestId)
      if (request) {
        const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const employeeName = `Dipendente ${request.userId}`
        notifyLeaveApproved(employeeName, days)
      }
      
      setComment('')
      loadRequests()
      setSelectedRequest(null)
    } else {
      alert('Errore nell\'approvazione: ' + result.error)
    }
    
    setIsProcessing(false)
  }

  const handleReject = async (requestId: string) => {
    if (!session?.user?.id || !comment.trim()) {
      alert('Inserisci un motivo per il rifiuto')
      return
    }
    
    setIsProcessing(true)
    
    const result = updateLeaveRequestStatus(requestId, 'REJECTED', session.user.id, comment)
    
    if (result.success) {
      logRejectAction('leave_request', requestId, { reason: comment })
      
      // Crea notifica di rifiuto
      const request = pendingRequests.find(r => r.id === requestId)
      if (request) {
        const employeeName = `Dipendente ${request.userId}`
        notifyLeaveRejected(employeeName, comment)
      }
      
      setComment('')
      loadRequests()
      setSelectedRequest(null)
    } else {
      alert('Errore nel rifiuto: ' + result.error)
    }
    
    setIsProcessing(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <PermissionGuard permission="ferie_approve">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/leaves')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Torna alle Ferie</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  ✅ Approvazioni Ferie e Permessi
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  {pendingRequests.filter(r => r.status === 'PENDING').length} in attesa
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Filtri */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Filtri</h2>
              </div>
              <div className="p-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⏳ In Attesa ({getLeaveRequestsByStatus('PENDING').length})
                  </button>
                  <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'approved'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✅ Approvate ({getLeaveRequestsByStatus('APPROVED').length})
                  </button>
                  <button
                    onClick={() => setFilter('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'rejected'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ❌ Rifiutate ({getLeaveRequestsByStatus('REJECTED').length})
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'all'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📋 Tutte ({getLeaveRequests().length})
                  </button>
                </div>
              </div>
            </div>

            {/* Lista Richieste */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Richieste {filter === 'pending' ? 'in Attesa' : filter === 'approved' ? 'Approvate' : filter === 'rejected' ? 'Rifiutate' : 'Tutte'}
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dipendente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Periodo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giorni
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Richiesta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests.map((request) => {
                      const config = LEAVE_TYPES[request.type]
                      const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                      
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">
                                Dipendente {request.userId}
                              </div>
                              {request.isUrgent && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  🚨 Urgente
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{config?.icon}</span>
                              <div className="text-sm font-medium text-gray-900">{config?.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.startDate.toLocaleDateString('it-IT')} - {request.endDate.toLocaleDateString('it-IT')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {days} giorni
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status === 'APPROVED' ? '✅ Approvata' :
                               request.status === 'PENDING' ? '⏳ In Attesa' :
                               request.status === 'REJECTED' ? '❌ Rifiutata' :
                               request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.createdAt.toLocaleDateString('it-IT')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {request.status === 'PENDING' && canApproveLeave() ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedRequest(request)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  👁️ Vedi
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    handleApprove(request.id)
                                  }}
                                  disabled={isProcessing}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  ✅ Approva
                                </button>
                                <button
                                  onClick={() => setSelectedRequest(request)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  ❌ Rifiuta
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedRequest(request)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                👁️ Vedi
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                
                {pendingRequests.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">
                      {filter === 'pending' ? '⏳' : filter === 'approved' ? '✅' : filter === 'rejected' ? '❌' : '📋'}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nessuna richiesta {filter === 'pending' ? 'in attesa' : filter === 'approved' ? 'approvata' : filter === 'rejected' ? 'rifiutata' : ''}
                    </h3>
                    <p className="text-gray-500">
                      {filter === 'pending' ? 'Tutte le richieste sono state processate' : 'Non ci sono richieste in questa categoria'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modal Dettagli Richiesta */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Dettagli Richiesta
                  </h3>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo</label>
                      <p className="text-sm text-gray-900">
                        {LEAVE_TYPES[selectedRequest.type]?.icon} {LEAVE_TYPES[selectedRequest.type]?.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        selectedRequest.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedRequest.status === 'APPROVED' ? '✅ Approvata' :
                         selectedRequest.status === 'PENDING' ? '⏳ In Attesa' :
                         selectedRequest.status === 'REJECTED' ? '❌ Rifiutata' :
                         selectedRequest.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data Inizio</label>
                      <p className="text-sm text-gray-900">
                        {selectedRequest.startDate.toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data Fine</label>
                      <p className="text-sm text-gray-900">
                        {selectedRequest.endDate.toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  
                  {selectedRequest.reason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Motivo</label>
                      <p className="text-sm text-gray-900">{selectedRequest.reason}</p>
                    </div>
                  )}
                  
                  {selectedRequest.status === 'PENDING' && canApproveLeave() && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commento (opzionale)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder="Aggiungi un commento per l'approvazione o il rifiuto..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
                
                {selectedRequest.status === 'PENDING' && canApproveLeave() && (
                  <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Chiudi
                    </button>
                    <button
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      ❌ Rifiuta
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Approva
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
