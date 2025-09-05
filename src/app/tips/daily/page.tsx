'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Definizione dei tipi
type Employee = {
  name: string
  role: string
  department: string
}

type DailyTip = {
  date: string
  amount: number
  distributions?: {
    [department: string]: number
  }
}

type Distributions = {
  [department: string]: number
}

// Array dei dipendenti
const employees: Employee[] = [
  { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
  { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
  { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
  { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
]

export default function DailyTipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [tipHistory, setTipHistory] = useState<DailyTip[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tipHistory')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    const canManage = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'CASSIERE', 'RESPONSABILE_SALA'].includes(session.user?.role || '')
    if (!canManage) router.push('/tips')
  }, [session, status, router])

  const calculateDistribution = () => {
    // Carica i punti dei reparti e dei dipendenti
    const departmentPoints = localStorage.getItem('departmentPoints')
    const employeePoints = localStorage.getItem('employeePoints')
    const departmentChecks = localStorage.getItem('departmentChecks')

    if (!departmentPoints || !employeePoints || !departmentChecks) {
      setSavedMessage('⚠️ Configura prima i punti nella sezione Gestione!')
      setTimeout(() => setSavedMessage(''), 3000)
      return
    }

    const departments = JSON.parse(departmentPoints)
    const employees = JSON.parse(employeePoints)
    const checks = JSON.parse(departmentChecks)
    const totalAmount = Number(amount)

    // Calcola il totale dei punti considerando i reparti selezionati
    let totalPoints = 0
    for (const dept of ['cucina', 'sala', 'bar']) {
      if (checks[dept]) {
        // Se il reparto è selezionato, usa il suo punteggio
        totalPoints += departments[dept]
      } else {
        // Altrimenti somma i punti dei singoli dipendenti
        const deptEmployees = employees.filter((emp: Employee) => emp.department === dept)
        totalPoints += deptEmployees.reduce((sum: number, emp: Employee) => sum + (employees[emp.name] || 0), 0)
      }
    }

    // Calcola la distribuzione per reparto
    const distributions: Distributions = {}
    for (const dept of ['cucina', 'sala', 'bar']) {
      if (checks[dept]) {
        // Se il reparto è selezionato, calcola in base al punteggio reparto
        distributions[dept] = (departments[dept] / totalPoints) * totalAmount
      } else {
        // Altrimenti somma i punti individuali
        const deptEmployees = employees.filter((emp: Employee) => emp.department === dept)
        const deptPoints = deptEmployees.reduce((sum: number, emp: Employee) => sum + (employees[emp.name] || 0), 0)
        distributions[dept] = (deptPoints / totalPoints) * totalAmount
      }
    }

    // Salva la mancia giornaliera
    const newTip: DailyTip = {
      date: new Date().toISOString().split('T')[0],
      amount: totalAmount,
      distributions
    }

    setTipHistory(prev => {
      const updated = [...prev, newTip]
      localStorage.setItem('tipHistory', JSON.stringify(updated))
      return updated
    })

    setAmount('')
    setSavedMessage('✅ Mancia salvata e distribuita!')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/tips')}
                className="text-orange-600 hover:text-orange-700"
              >
                ← Riepilogo Mance
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                💰 Gestione Mance Giornaliere
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {savedMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {savedMessage}
            </div>
          )}

          {/* Inserimento mancia giornaliera */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                📝 Inserisci Mancia Giornaliera
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-xs">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Importo Totale (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={calculateDistribution}
                  disabled={!amount || Number(amount) <= 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  Salva e Distribuisci
                </button>
              </div>
            </div>
          </div>

          {/* Storico mance */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                📊 Storico Mance
              </h2>
            </div>
            <div className="p-6">
              {tipHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nessuna mancia registrata</p>
              ) : (
                <div className="space-y-4">
                  {tipHistory.map((tip, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{new Date(tip.date).toLocaleDateString('it-IT')}</div>
                        <div className="text-lg font-semibold">€{tip.amount.toFixed(2)}</div>
                      </div>
                      {tip.distributions && (
                        <div className="grid grid-cols-3 gap-4 mt-2">
                          {Object.entries(tip.distributions).map(([dept, amount]) => (
                            <div key={dept} className="text-sm">
                              <span className="font-medium capitalize">{dept}:</span>{' '}
                              €{amount.toFixed(2)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
