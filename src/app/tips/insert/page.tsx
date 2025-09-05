'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Reparti disponibili (per ora hardcoded, poi si può rendere dinamico)
const departments = [
  { id: 'cucina', name: '🔥 Cucina', color: 'red' },
  { id: 'sala', name: '🍽️ Sala', color: 'blue' },
  { id: 'bar', name: '🍹 Bar', color: 'green' }
]

// Tipi di pagamento
const paymentTypes = [
  { id: 'cash', name: '💵 Contanti', color: 'green' },
  { id: 'card', name: '💳 Carta di Credito', color: 'blue' },
  { id: 'foreign', name: '🌍 Monete Estere', color: 'purple' }
]

export default function InsertTipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Stati del form
  const [amount, setAmount] = useState('')
  const [selectedPaymentType, setSelectedPaymentType] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Redirect se non autenticato o non autorizzato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    // Solo manager, cassiere e responsabili possono inserire mance
    const canInsert = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'CASSIERE', 'RESPONSABILE_SALA'].includes(session.user?.role || '')
    if (!canInsert) {
      router.push('/tips')
      return
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || !selectedPaymentType || !selectedDepartment) {
      setMessage('❌ Compila tutti i campi obbligatori')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage('❌ Inserisci un importo valido')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    
    try {
      // Qui andrà la chiamata API per salvare nel database
      // Per ora simuliamo il salvataggio
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('✅ Mancia inserita con successo!')
      setTimeout(() => {
        setMessage('')
        // Reset form
        setAmount('')
        setSelectedPaymentType('')
        setSelectedDepartment('')
      }, 2000)
      
    } catch (error) {
      setMessage('❌ Errore durante il salvataggio')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null // Redirect in corso
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/tips')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Torna al Riepilogo Mance</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                💰 Inserisci Mance
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Ciao, {session.user?.name}!
              </span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                {(session.user as any)?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Messaggio di stato */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                📝 Nuova Mancia
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Inserisci i dettagli della mancia ricevuta
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Importo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Importo (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Tipo di Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  💳 Tipo di Pagamento
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {paymentTypes.map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedPaymentType === type.id
                          ? `border-${type.color}-500 bg-${type.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentType"
                        value={type.id}
                        checked={selectedPaymentType === type.id}
                        onChange={(e) => setSelectedPaymentType(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedPaymentType === type.id
                            ? `border-${type.color}-500 bg-${type.color}-500`
                            : 'border-gray-300'
                        }`}>
                          {selectedPaymentType === type.id && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <span className="text-lg">{type.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reparto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  🏢 Reparto di Provenienza
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {departments.map((dept) => (
                    <label
                      key={dept.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedDepartment === dept.id
                          ? `border-${dept.color}-500 bg-${dept.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="department"
                        value={dept.id}
                        checked={selectedDepartment === dept.id}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedDepartment === dept.id
                            ? `border-${dept.color}-500 bg-${dept.color}-500`
                            : 'border-gray-300'
                        }`}>
                          {selectedDepartment === dept.id && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <span className="text-lg">{dept.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pulsanti */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/tips')}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {isLoading ? 'Salvataggio...' : '💾 Salva Mancia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
