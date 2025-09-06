// src/app/tips/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface TipDistribution {
  employeeName: string
  amount: number
  role: string
  department: string
  hoursWorked: number
}

interface DailyTip {
  id: string
  date: string
  totalTips: number
  distributions: TipDistribution[]
}

export default function TipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null)
  const [isAddTipOpen, setIsAddTipOpen] = useState(false)
  const [addTipDate, setAddTipDate] = useState(new Date())
  const [tipMeal, setTipMeal] = useState<'colazione' | 'pranzo' | 'cena' | null>(null)
  const [tipMethod, setTipMethod] = useState<'contanti' | 'carta' | 'estere'>('contanti')
  const [tipAmount, setTipAmount] = useState('')

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Dipendenti
  const employees = [
    { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
    { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
    { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
    { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
    { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
    { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
  ]

  // Demo data mance mensili
  const [monthlyTips, setMonthlyTips] = useState<{[date: string]: DailyTip}>({
    '2025-01-15': {
      id: '1', date: '2025-01-15', totalTips: 297.80,
      distributions: [
        { employeeName: 'Giuseppe Chef', amount: 59.56, role: 'CHEF', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Maria Cameriera', amount: 44.67, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Luca Barista', amount: 44.67, role: 'DIPENDENTE_BAR', department: 'bar', hoursWorked: 8 },
        { employeeName: 'Anna Sous Chef', amount: 52.61, role: 'CAPO_PARTITA', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Marco Cameriere', amount: 35.73, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Sofia Cassiera', amount: 60.56, role: 'CASSIERE', department: 'sala', hoursWorked: 8 }
      ]
    },
    '2025-01-16': {
      id: '2', date: '2025-01-16', totalTips: 234.50,
      distributions: [
        { employeeName: 'Giuseppe Chef', amount: 46.90, role: 'CHEF', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Maria Cameriera', amount: 35.18, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Luca Barista', amount: 35.18, role: 'DIPENDENTE_BAR', department: 'bar', hoursWorked: 8 },
        { employeeName: 'Anna Sous Chef', amount: 41.41, role: 'CAPO_PARTITA', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Marco Cameriere', amount: 28.14, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Sofia Cassiera', amount: 47.69, role: 'CASSIERE', department: 'sala', hoursWorked: 8 }
      ]
    },
    '2025-01-17': {
      id: '3', date: '2025-01-17', totalTips: 189.20,
      distributions: [
        { employeeName: 'Giuseppe Chef', amount: 37.84, role: 'CHEF', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Maria Cameriera', amount: 28.38, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Luca Barista', amount: 28.38, role: 'DIPENDENTE_BAR', department: 'bar', hoursWorked: 8 },
        { employeeName: 'Anna Sous Chef', amount: 33.41, role: 'CAPO_PARTITA', department: 'cucina', hoursWorked: 8 },
        { employeeName: 'Marco Cameriere', amount: 22.69, role: 'DIPENDENTE_SALA', department: 'sala', hoursWorked: 8 },
        { employeeName: 'Sofia Cassiera', amount: 38.50, role: 'CASSIERE', department: 'sala', hoursWorked: 8 }
      ]
    }
  })

  // Funzioni per navigazione mese
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth)
    prevMonth.setMonth(currentMonth.getMonth() - 1)
    setCurrentMonth(prevMonth)
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(currentMonth.getMonth() + 1)
    setCurrentMonth(nextMonth)
  }

  const getMonthlyTotal = (employeeName: string) => {
    return Object.values(monthlyTips).reduce((total, day) => {
      const empTip = day.distributions.find(d => d.employeeName === employeeName)
      return total + (empTip?.amount || 0)
    }, 0)
  }

  const getDayTip = (date: string, employeeName: string) => {
    const dayData = monthlyTips[date]
    if (!dayData) return 0
    const empTip = dayData.distributions.find(d => d.employeeName === employeeName)
    return empTip?.amount || 0
  }

  const departments = [
    { key: 'cucina', label: 'Cucina', color: 'red' },
    { key: 'sala', label: 'Sala', color: 'blue' },
    { key: 'bar', label: 'Bar', color: 'green' }
  ]

  // Funzione per calcolare totale mance per reparto
  const getDepartmentTotal = (department: string) => {
    return Object.values(monthlyTips).reduce((total, day) => {
      const deptTips = day.distributions.filter(d => d.department === department)
      return total + deptTips.reduce((sum, d) => sum + d.amount, 0)
    }, 0)
  }

  // Funzioni per cambiare data nel form
  const goToPrevAddTipDate = () => {
    setAddTipDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }
  const goToNextAddTipDate = () => {
    setAddTipDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  const canManageTips = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'CASSIERE', 'RESPONSABILE_SALA'].includes(session.user?.role || '')
  const monthDays = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                💰 Riepilogo Mance
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {canManageTips && (
                <>
                  <button
                    onClick={() => router.push('/tips/manage')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    ⚙️ Gestisci Mance
                  </button>
                  <button
                    onClick={() => setIsAddTipOpen(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                  >
                    💰 Inserisci Mance
                  </button>
                </>
              )}
              <span className="text-gray-700">{session.user?.name}</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                {session.user?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Month Navigator */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center">
              <button
                onClick={goToPreviousMonth}
                className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              >
                <span className="text-xl mr-2">←</span>
                Mese Precedente
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-semibold capitalize mb-1">
                  {monthName}
                </h2>
                <div className="flex justify-center space-x-4 text-sm text-gray-600">
                  <span>💰 Totale mese: €{Object.values(monthlyTips).reduce((sum, day) => sum + day.totalTips, 0).toFixed(2)}</span>
                  <span>📅 {Object.keys(monthlyTips).length} giorni con mance</span>
                </div>
              </div>
              <button
                onClick={goToNextMonth}
                className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              >
                Mese Successivo
                <span className="text-xl ml-2">→</span>
              </button>
            </div>
          </div>
          {/* Filtro reparto */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">🏢 Visualizza Mance per Reparto</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDepartment('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedDepartment === 'all' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏢 Tutti i Reparti
              </button>
              {departments.map((dept) => (
                <button
                  key={dept.key}
                  onClick={() => setSelectedDepartment(dept.key)}
                  className={`px-4 py-2 rounded-lg transition ${
                    selectedDepartment === dept.key 
                      ? `bg-${dept.color}-600 text-white` 
                      : `bg-${dept.color}-100 text-${dept.color}-700 hover:bg-${dept.color}-200`
                  }`}
                >
                  {dept.label}
                </button>
              ))}
            </div>
          </div>
          {/* Riepilogo mance per reparto */}
          {selectedDepartment === 'all' ? (
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {departments.map((dept) => (
                <div key={dept.key} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-3 bg-${dept.color}-500`}></div>
                      <h4 className="font-semibold">{dept.label}</h4>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold text-${dept.color}-600`}>
                      €{getDepartmentTotal(dept.key).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Totale {monthName.toLowerCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Dettaglio reparto: tabella totali per dipendente
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    💰 Mance reparto {departments.find(d => d.key === selectedDepartment)?.label} - {monthName}
                  </h3>
                  <div className="text-right">
                    <div className={`text-2xl font-bold text-${departments.find(d => d.key === selectedDepartment)?.color}-600`}>
                      €{getDepartmentTotal(selectedDepartment).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Totale mensile</div>
                  </div>
                </div>
              </div>
              {/* Tabella totali per dipendente */}
              <div className="p-6 overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1 bg-gray-100">Dipendente</th>
                      <th className="border px-2 py-1 bg-gray-50">Totale Mese</th>
                      <th className="border px-2 py-1 bg-gray-50">Media Giornaliera</th>
                      <th className="border px-2 py-1 bg-gray-50">Massimo Giornaliero</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(e => e.department === selectedDepartment).map(emp => {
                      // Calcolo totali
                      const tips = monthDays.map(day => {
                        const dateStr = day.toISOString().split('T')[0]
                        return monthlyTips[dateStr]?.distributions.find(d => d.employeeName === emp.name)?.amount || 0
                      })
                      const total = tips.reduce((sum, v) => sum + v, 0)
                      const daysWithTips = tips.filter(v => v > 0).length
                      const avg = daysWithTips > 0 ? total / daysWithTips : 0
                      const max = tips.length > 0 ? Math.max(...tips) : 0
                      return (
                        <tr key={emp.name}>
                          <td className="border px-2 py-1 font-medium bg-gray-50">{emp.name}</td>
                          <td className="border px-2 py-1 text-center">€{total.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-center">€{avg.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-center">€{max.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-green-600">
                €{Object.values(monthlyTips).reduce((sum, day) => sum + day.totalTips, 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Mance Totali Mese</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(monthlyTips).length}
              </div>
              <div className="text-sm text-gray-600">Giorni con Mance</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-purple-600">
                €{Object.keys(monthlyTips).length > 0 ? (Object.values(monthlyTips).reduce((sum, day) => sum + day.totalTips, 0) / Object.keys(monthlyTips).length).toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-gray-600">Media Giornaliera</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-orange-600">
                €{employees.length > 0 ? (Object.values(monthlyTips).reduce((sum, day) => sum + day.totalTips, 0) / employees.length).toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-gray-600">Media per Dipendente</div>
            </div>
          </div>
          {/* Day Detail Modal */}
          {selectedDayDetail && monthlyTips[selectedDayDetail] && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    📅 Mance del {new Date(selectedDayDetail).toLocaleDateString('it-IT')}
                  </h2>
                  <button
                    onClick={() => setSelectedDayDetail(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      €{monthlyTips[selectedDayDetail].totalTips.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Totale giornaliero</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {monthlyTips[selectedDayDetail].distributions.map((dist) => (
                    <div key={dist.employeeName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          dist.department === 'cucina' ? 'bg-red-500' :
                          dist.department === 'sala' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{dist.employeeName}</div>
                          <div className="text-sm text-gray-600">{dist.role.replace('DIPENDENTE_', '').replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">€{dist.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {((dist.amount / monthlyTips[selectedDayDetail].totalTips) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Modal inserimento mance */}
          {isAddTipOpen && (
            <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border border-black">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={goToPrevAddTipDate}
                    className="text-gray-500 hover:text-gray-700 text-xl px-2"
                  >←</button>
                  <div className="font-semibold text-lg">
                    {addTipDate.toLocaleDateString('it-IT')}
                  </div>
                  <button
                    onClick={goToNextAddTipDate}
                    className="text-gray-500 hover:text-gray-700 text-xl px-2"
                  >→</button>
                </div>
                <div className="mb-4 flex justify-center gap-2">
                  <button
                    onClick={() => setTipMeal('colazione')}
                    className={`px-4 py-2 rounded-lg transition ${tipMeal === 'colazione' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >Colazione</button>
                  <button
                    onClick={() => setTipMeal('pranzo')}
                    className={`px-4 py-2 rounded-lg transition ${tipMeal === 'pranzo' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >Pranzo</button>
                  <button
                    onClick={() => setTipMeal('cena')}
                    className={`px-4 py-2 rounded-lg transition ${tipMeal === 'cena' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >Cena</button>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Importo</label>
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={e => setTipAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:border-green-400"
                    placeholder="€0.00"
                  />
                </div>
                <div className="mb-6 flex justify-center gap-2">
                  <button
                    onClick={() => setTipMethod('contanti')}
                    className={`px-4 py-2 rounded-lg transition ${tipMethod === 'contanti' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >Contanti</button>
                  <button
                    onClick={() => setTipMethod('carta')}
                    className={`px-4 py-2 rounded-lg transition ${tipMethod === 'carta' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >Carta</button>
                  <button
                    onClick={() => setTipMethod('estere')}
                    className={`px-4 py-2 rounded-lg transition ${tipMethod === 'estere' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-200'}`}
                  >Monete Estere</button>
                </div>
                <button
                  onClick={() => {/* logica di registrazione qui */ setIsAddTipOpen(false)}}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  Registra Mancia
                </button>
                <button
                  onClick={() => setIsAddTipOpen(false)}
                  className="w-full mt-2 text-gray-500 hover:text-gray-700"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
