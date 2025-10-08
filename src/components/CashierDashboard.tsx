'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { formatCurrency, safeSum } from '@/lib/formatNumber'

interface CashierDashboardProps {
  userId: string
  userName: string
}

interface DailyTip {
  id: string
  date: string
  cashTips: number
  cardTips: number
  foreignCurrencyTips: number
  total: number
  status: string
}

interface Shift {
  id: string
  date: string
  employee: string
  startTime: string
  endTime: string
  department: string
  status: string
}

export default function CashierDashboard({ userId, userName }: CashierDashboardProps) {
  const router = useRouter()
  const [dailyTips, setDailyTips] = useState<DailyTip[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [showTipModal, setShowTipModal] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showEditTipModal, setShowEditTipModal] = useState(false)
  const [selectedTip, setSelectedTip] = useState<DailyTip | null>(null)

  // Form data per inserimento mance
  const [tipForm, setTipForm] = useState({
    date: '',
    cashTips: '',
    cardTips: '',
    foreignCurrencyTips: ''
  })

  // Form data per inserimento turni
  const [shiftForm, setShiftForm] = useState({
    date: '',
    employee: '',
    startTime: '',
    endTime: '',
    department: ''
  })

  // Carica dati del cassiere
  useEffect(() => {
    loadCashierData()
  }, [userId])

  const loadCashierData = () => {
    // Dati mock per demo - in produzione verranno caricati dal database
    setDailyTips([
      {
        id: '1',
        date: '2024-01-15',
        cashTips: 45.50,
        cardTips: 32.80,
        foreignCurrencyTips: 12.30,
        total: 90.60,
        status: 'completed'
      },
      {
        id: '2',
        date: '2024-01-14',
        cashTips: 38.20,
        cardTips: 28.90,
        foreignCurrencyTips: 8.50,
        total: 75.60,
        status: 'completed'
      },
      {
        id: '3',
        date: '2024-01-13',
        cashTips: 52.10,
        cardTips: 41.20,
        foreignCurrencyTips: 15.80,
        total: 109.10,
        status: 'completed'
      }
    ])

    setShifts([
      {
        id: '1',
        date: '2024-01-15',
        employee: 'Maria Cameriera',
        startTime: '09:00',
        endTime: '17:00',
        department: 'Sala',
        status: 'scheduled'
      },
      {
        id: '2',
        date: '2024-01-15',
        employee: 'Luca Barista',
        startTime: '14:00',
        endTime: '22:00',
        department: 'Bar',
        status: 'scheduled'
      }
    ])
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('it-IT', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short' 
      })
    } catch {
      return dateString
    }
  }

  // ✅ HELPER: Calcola totale sicuro da tre valori
  const calculateTipTotal = (cash: string, card: string, foreign: string): number => {
    const cashValue = parseFloat(cash) || 0
    const cardValue = parseFloat(card) || 0
    const foreignValue = parseFloat(foreign) || 0
    
    return safeSum(cashValue, cardValue, foreignValue)
  }

  const handleTipSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ CALCOLO SICURO del totale
    const total = calculateTipTotal(
      tipForm.cashTips, 
      tipForm.cardTips, 
      tipForm.foreignCurrencyTips
    )
    
    const newTip: DailyTip = {
      id: Date.now().toString(),
      date: tipForm.date,
      cashTips: parseFloat(tipForm.cashTips) || 0,
      cardTips: parseFloat(tipForm.cardTips) || 0,
      foreignCurrencyTips: parseFloat(tipForm.foreignCurrencyTips) || 0,
      total: total,
      status: 'completed'
    }
    
    setDailyTips([newTip, ...dailyTips])
    setTipForm({ date: '', cashTips: '', cardTips: '', foreignCurrencyTips: '' })
    setShowTipModal(false)
  }

  const handleShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newShift: Shift = {
      id: Date.now().toString(),
      date: shiftForm.date,
      employee: shiftForm.employee,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      department: shiftForm.department,
      status: 'scheduled'
    }
    
    setShifts([newShift, ...shifts])
    setShiftForm({ date: '', employee: '', startTime: '', endTime: '', department: '' })
    setShowShiftModal(false)
  }

  const handleEditTip = (tip: DailyTip) => {
    setSelectedTip(tip)
    setTipForm({
      date: tip.date,
      cashTips: tip.cashTips.toString(),
      cardTips: tip.cardTips.toString(),
      foreignCurrencyTips: tip.foreignCurrencyTips.toString()
    })
    setShowEditTipModal(true)
  }

  const handleUpdateTip = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTip) return

    // ✅ CALCOLO SICURO del totale
    const total = calculateTipTotal(
      tipForm.cashTips, 
      tipForm.cardTips, 
      tipForm.foreignCurrencyTips
    )

    const updatedTip: DailyTip = {
      ...selectedTip,
      cashTips: parseFloat(tipForm.cashTips) || 0,
      cardTips: parseFloat(tipForm.cardTips) || 0,
      foreignCurrencyTips: parseFloat(tipForm.foreignCurrencyTips) || 0,
      total: total
    }

    setDailyTips(dailyTips.map(tip => tip.id === selectedTip.id ? updatedTip : tip))
    setShowEditTipModal(false)
    setSelectedTip(null)
    setTipForm({ date: '', cashTips: '', cardTips: '', foreignCurrencyTips: '' })
  }

  // ✅ CALCOLI SICURI
  const getTotalTips = () => {
    if (dailyTips.length === 0) return 0
    return safeSum(...dailyTips.map(tip => tip.total))
  }

  const getTodayTips = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayTip = dailyTips.find(tip => tip.date === today)
    return todayTip ? todayTip.total : 0
  }

  return (
    <div className="space-y-6">
      {/* Statistiche Cassiere */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-lg font-semibold mb-2">Mance di Oggi</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(getTodayTips())}</p>
          <p className="text-sm text-gray-500">Totale giornaliero</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">Totale Settimana</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalTips())}</p>
          <p className="text-sm text-gray-500">Ultimi 7 giorni</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl mb-4">📅</div>
          <h3 className="text-lg font-semibold mb-2">Turni Oggi</h3>
          <p className="text-2xl font-bold text-orange-600">{shifts.length}</p>
          <p className="text-sm text-gray-500">Dipendenti in servizio</p>
        </div>
      </div>

      {/* Sezioni Principali */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gestione Mance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💰 Gestione Mance</h3>
            <button 
              onClick={() => setShowTipModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm"
            >
              ➕ Inserisci
            </button>
          </div>
          <div className="space-y-3">
            {dailyTips.slice(0, 5).map((tip) => (
              <div key={tip.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                <div className="flex-1">
                  <p className="font-medium">{formatDate(tip.date)}</p>
                  <p className="text-sm text-gray-600">
                    Contanti: {formatCurrency(tip.cashTips)} | 
                    Carta: {formatCurrency(tip.cardTips)} | 
                    Estere: {formatCurrency(tip.foreignCurrencyTips)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-green-600">{formatCurrency(tip.total)}</span>
                  <button 
                    onClick={() => handleEditTip(tip)}
                    className="text-blue-600 hover:text-blue-800 text-sm p-1"
                    title="Modifica"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))}
            {dailyTips.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nessuna mance registrata</p>
            )}
          </div>
        </div>

        {/* Gestione Turni */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📅 Gestione Turni</h3>
            <button 
              onClick={() => setShowShiftModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
            >
              ➕ Aggiungi
            </button>
          </div>
          <div className="space-y-3">
            {shifts.slice(0, 5).map((shift) => (
              <div key={shift.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                <div>
                  <p className="font-medium">{shift.employee}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(shift.date)} - {shift.startTime} / {shift.endTime}
                  </p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {shift.department}
                </span>
              </div>
            ))}
            {shifts.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nessun turno registrato</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Inserimento Mance */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">💰 Inserisci Mance Giornaliere</h3>
            <form onSubmit={handleTipSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={tipForm.date}
                    onChange={(e) => setTipForm({...tipForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mance Contanti (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipForm.cashTips}
                    onChange={(e) => setTipForm({...tipForm, cashTips: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mance Carta di Credito (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipForm.cardTips}
                    onChange={(e) => setTipForm({...tipForm, cardTips: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monete Estere (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipForm.foreignCurrencyTips}
                    onChange={(e) => setTipForm({...tipForm, foreignCurrencyTips: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTipModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifica Mance */}
      {showEditTipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">✏️ Modifica Mance</h3>
            <form onSubmit={handleUpdateTip}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={tipForm.date}
                    onChange={(e) => setTipForm({...tipForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mance Contanti (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipForm.cashTips}
                    onChange={(e) => setTipForm({...tipForm, cashTips: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mance Carta di Credito (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipForm.cardTips}
                    onChange={(e) => setTipForm({...tipForm, cardTips: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monete Estere (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipForm.foreignCurrencyTips}
                    onChange={(e) => setTipForm({...tipForm, foreignCurrencyTips: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTipModal(false)
                    setSelectedTip(null)
                    setTipForm({ date: '', cashTips: '', cardTips: '', foreignCurrencyTips: '' })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Aggiorna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inserimento Turni */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📅 Aggiungi Turno</h3>
            <form onSubmit={handleShiftSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm({...shiftForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dipendente
                  </label>
                  <select
                    value={shiftForm.employee}
                    onChange={(e) => setShiftForm({...shiftForm, employee: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleziona dipendente</option>
                    <option value="Maria Cameriera">Maria Cameriera</option>
                    <option value="Luca Barista">Luca Barista</option>
                    <option value="Giuseppe Chef">Giuseppe Chef</option>
                    <option value="Anna Sous Chef">Anna Sous Chef</option>
                    <option value="Marco Cameriere">Marco Cameriere</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Inizio
                    </label>
                    <input
                      type="time"
                      value={shiftForm.startTime}
                      onChange={(e) => setShiftForm({...shiftForm, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Fine
                    </label>
                    <input
                      type="time"
                      value={shiftForm.endTime}
                      onChange={(e) => setShiftForm({...shiftForm, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reparto
                  </label>
                  <select
                    value={shiftForm.department}
                    onChange={(e) => setShiftForm({...shiftForm, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleziona reparto</option>
                    <option value="Sala">Sala</option>
                    <option value="Cucina">Cucina</option>
                    <option value="Bar">Bar</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftModal(false)
                    setShiftForm({ date: '', employee: '', startTime: '', endTime: '', department: '' })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}