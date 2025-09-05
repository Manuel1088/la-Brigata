'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useAudit } from '@/hooks/useAudit'
import { useNotifications } from '@/hooks/useNotifications'
import { 
  LEAVE_TYPES, 
  getLeaveBalances, 
  validateLeaveRequest,
  createLeaveRequest,
  LeaveTypeConfig 
} from '@/lib/leaveSystem'

export default function NewLeaveRequestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canRequestLeave } = usePermissions()
  const { logCreateAction } = useAudit()
  const { notifyLeaveRequest } = useNotifications()
  
  const [selectedType, setSelectedType] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isUrgent, setIsUrgent] = useState<boolean>(false)
  const [attachment, setAttachment] = useState<string>('')
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [balances, setBalances] = useState<any[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    // Pre-seleziona tipo se passato come parametro
    const typeParam = searchParams.get('type')
    if (typeParam && LEAVE_TYPES[typeParam]) {
      setSelectedType(typeParam)
    }
    
    // Carica saldi utente
    if (session.user?.id) {
      const userBalances = getLeaveBalances(session.user.id)
      setBalances(userBalances)
    }
  }, [session, status, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setIsSubmitting(true)
    
    if (!session?.user?.id) {
      setErrors(['Sessione non valida'])
      setIsSubmitting(false)
      return
    }
    
    // Validazione form
    const formErrors: string[] = []
    
    if (!selectedType) formErrors.push('Seleziona un tipo di richiesta')
    if (!startDate) formErrors.push('Seleziona la data di inizio')
    if (!endDate) formErrors.push('Seleziona la data di fine')
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      formErrors.push('La data di inizio deve essere precedente alla data di fine')
    }
    
    if (formErrors.length > 0) {
      setErrors(formErrors)
      setIsSubmitting(false)
      return
    }
    
    // Validazione business logic
    const start = new Date(startDate)
    const end = new Date(endDate)
    const validation = validateLeaveRequest(session.user.id, selectedType, start, end, isUrgent)
    
    if (!validation.isValid) {
      setErrors(validation.errors)
      setIsSubmitting(false)
      return
    }
    
    // Crea richiesta
    const result = createLeaveRequest(
      session.user.id,
      selectedType,
      start,
      end,
      reason || undefined,
      isUrgent,
      attachment || undefined
    )
    
    if (result.success) {
      // Log creazione richiesta
      logCreateAction('leave_request', result.requestId!, {
        type: selectedType,
        startDate: startDate,
        endDate: endDate,
        isUrgent
      })
      
      // Crea notifica per i manager
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const employeeName = session.user?.name || 'Dipendente'
      notifyLeaveRequest(employeeName, days, startDate, endDate)
      
      // Redirect alla pagina ferie
      router.push('/leaves?tab=requests')
    } else {
      setErrors(result.errors || ['Errore nella creazione della richiesta'])
    }
    
    setIsSubmitting(false)
  }

  const getSelectedTypeConfig = (): LeaveTypeConfig | null => {
    return selectedType ? LEAVE_TYPES[selectedType] : null
  }

  const getBalanceForType = (type: string) => {
    return balances.find(b => b.type === type)
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
    <PermissionGuard permission="ferie_request">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/leaves')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← Torna alle Ferie
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  ➕ Nuova Richiesta Ferie/Permesso
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Form */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Dettagli Richiesta</h2>
                <p className="text-sm text-gray-600">Compila tutti i campi per inviare la tua richiesta</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* Errori */}
                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-red-400">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Errori di validazione:
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <ul className="list-disc list-inside space-y-1">
                            {errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tipo Richiesta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo di Richiesta *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(LEAVE_TYPES).map(([key, config]) => {
                      const balance = getBalanceForType(key)
                      const isDisabled = !balance || balance.remaining <= 0
                      
                      return (
                        <label
                          key={key}
                          className={`relative flex items-center p-4 border rounded-lg cursor-pointer ${
                            selectedType === key
                              ? 'border-blue-500 bg-blue-50'
                              : isDisabled
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="type"
                            value={key}
                            checked={selectedType === key}
                            onChange={(e) => setSelectedType(e.target.value)}
                            disabled={isDisabled}
                            className="sr-only"
                          />
                          <div className="flex items-center w-full">
                            <span className="text-2xl mr-3">{config.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{config.name}</div>
                              <div className="text-sm text-gray-500">{config.description}</div>
                              {balance && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Disponibili: {balance.remaining} / {balance.total}
                                </div>
                              )}
                            </div>
                            {isDisabled && (
                              <span className="text-xs text-red-500 font-medium">
                                Non disponibile
                              </span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Inizio *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Fine *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Info Tipo Selezionato */}
                {getSelectedTypeConfig() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-start">
                      <span className="text-blue-400 text-xl mr-3">ℹ️</span>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">
                          Informazioni {getSelectedTypeConfig()!.name}
                        </h4>
                        <div className="mt-2 text-sm text-blue-700">
                          <ul className="space-y-1">
                            <li>• Preavviso minimo: {getSelectedTypeConfig()!.noticeDays} giorni</li>
                            <li>• Massimo: {getSelectedTypeConfig()!.maxDays} giorni</li>
                            {getSelectedTypeConfig()!.requiresAttachment && (
                              <li>• Richiede allegato (certificato medico, documenti)</li>
                            )}
                            {getSelectedTypeConfig()!.autoApprove && (
                              <li>• Auto-approvazione con allegato</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo (opzionale)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Descrivi il motivo della richiesta..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Urgente */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="urgent"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="urgent" className="ml-2 block text-sm text-gray-900">
                    🚨 Richiesta urgente (bypassa preavviso minimo)
                  </label>
                </div>

                {/* Allegato */}
                {getSelectedTypeConfig()?.requiresAttachment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allegato Richiesto *
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <span className="text-4xl">📎</span>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Carica file</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setAttachment(file.name)
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">o trascina qui</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PDF, JPG, PNG fino a 10MB
                        </p>
                      </div>
                    </div>
                    {attachment && (
                      <p className="mt-2 text-sm text-green-600">
                        ✅ File selezionato: {attachment}
                      </p>
                    )}
                  </div>
                )}

                {/* Pulsanti */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push('/leaves')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Invio in corso...' : 'Invia Richiesta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
