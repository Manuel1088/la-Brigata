'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useEmployeeContext } from '@/contexts/EmployeeContext'

interface ShiftHistoryEntry {
  id: string
  employeeName: string
  date: string
  time: string
  department: string
  action: 'created' | 'modified' | 'deleted'
  changedBy: string
  changedAt: string
  previousValue?: string
  newValue?: string
}

export default function ShiftsHistory() {
  const { data: session } = useSession()
  const { employees: employeesData, isLoading } = useEmployeeContext()
  const [history, setHistory] = useState<ShiftHistoryEntry[]>([])
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  // Carica storico turni
  useEffect(() => {
    loadShiftHistory()
  }, [])

  const loadShiftHistory = () => {
    try {
      const raw = localStorage.getItem('shift_history_v1')
      if (raw) {
        setHistory(JSON.parse(raw))
      } else {
        // Genera dati mock per demo
        generateMockHistory()
      }
    } catch (error) {
      console.error('Errore nel caricamento storico turni:', error)
    }
  }

  const generateMockHistory = () => {
    const mockHistory: ShiftHistoryEntry[] = [
      {
        id: '1',
        employeeName: 'Giuseppe Chef',
        date: '2025-01-20',
        time: '08:00-16:00',
        department: 'cucina',
        action: 'created',
        changedBy: 'Manager',
        changedAt: '2025-01-20T08:00:00Z',
        newValue: '08:00-16:00'
      },
      {
        id: '2',
        employeeName: 'Maria Cameriera',
        date: '2025-01-20',
        time: '11:00-19:00',
        department: 'sala',
        action: 'modified',
        changedBy: 'Manager',
        changedAt: '2025-01-20T09:30:00Z',
        previousValue: '10:00-18:00',
        newValue: '11:00-19:00'
      },
      {
        id: '3',
        employeeName: 'Luca Barista',
        date: '2025-01-21',
        time: '17:00-01:00',
        department: 'bar',
        action: 'created',
        changedBy: 'Manager',
        changedAt: '2025-01-21T10:00:00Z',
        newValue: '17:00-01:00'
      },
      {
        id: '4',
        employeeName: 'Anna Sous Chef',
        date: '2025-01-21',
        time: 'RIPOSO',
        department: 'cucina',
        action: 'created',
        changedBy: 'Manager',
        changedAt: '2025-01-21T10:15:00Z',
        newValue: 'RIPOSO'
      },
      {
        id: '5',
        employeeName: 'Marco Cameriere',
        date: '2025-01-22',
        time: '12:00-20:00',
        department: 'sala',
        action: 'deleted',
        changedBy: 'Manager',
        changedAt: '2025-01-22T14:00:00Z',
        previousValue: '12:00-20:00'
      }
    ]

    setHistory(mockHistory)
    try {
      localStorage.setItem('shift_history_v1', JSON.stringify(mockHistory))
    } catch (error) {
      console.error('Errore nel salvataggio storico mock:', error)
    }
  }

  // Filtra storico
  const filteredHistory = history.filter(entry => {
    if (filterEmployee !== 'all' && entry.employeeName !== filterEmployee) return false
    if (filterDepartment !== 'all' && entry.department !== filterDepartment) return false
    if (filterAction !== 'all' && entry.action !== filterAction) return false
    if (filterDateFrom && entry.date < filterDateFrom) return false
    if (filterDateTo && entry.date > filterDateTo) return false
    return true
  })

  // Statistiche
  const stats = {
    total: history.length,
    created: history.filter(h => h.action === 'created').length,
    modified: history.filter(h => h.action === 'modified').length,
    deleted: history.filter(h => h.action === 'deleted').length
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800'
      case 'modified': return 'bg-yellow-100 text-yellow-800'
      case 'deleted': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Creato'
      case 'modified': return 'Modificato'
      case 'deleted': return 'Eliminato'
      default: return action
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return '➕'
      case 'modified': return '✏️'
      case 'deleted': return '❌'
      default: return '📝'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'cucina': return 'bg-red-50 text-red-700'
      case 'sala': return 'bg-blue-50 text-blue-700'
      case 'bar': return 'bg-green-50 text-green-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'cucina': return '🔥'
      case 'sala': return '🍽️'
      case 'bar': return '🍹'
      default: return '🏢'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900">📜 Storico Turni</h2>
        <p className="text-gray-600 mt-1">Cronologia di tutte le modifiche ai turni</p>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🔍 Filtri</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dipendente</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              {employeesData?.map((emp: any) => (
                <option key={emp.name} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reparto</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="cucina">Cucina</option>
              <option value="sala">Sala</option>
              <option value="bar">Bar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Azione</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutte</option>
              <option value="created">Creato</option>
              <option value="modified">Modificato</option>
              <option value="deleted">Eliminato</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Da Data</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">A Data</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Statistiche</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Totale</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.created}</div>
            <div className="text-sm text-green-700">Creati</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.modified}</div>
            <div className="text-sm text-yellow-700">Modificati</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.deleted}</div>
            <div className="text-sm text-red-700">Eliminati</div>
          </div>
        </div>
      </div>

      {/* Lista storico */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Cronologia Modifiche ({filteredHistory.length})
          </h3>
        </div>
        
        <div className="p-6">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📜</div>
              <p className="text-gray-500">Nessuna modifica trovata</p>
              <p className="text-sm text-gray-400 mt-1">
                Non ci sono modifiche con i filtri selezionati
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map(entry => (
                <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{getActionIcon(entry.action)}</span>
                        <span className="font-medium text-gray-900">{entry.employeeName}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                          {getActionLabel(entry.action)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(entry.department)}`}>
                          {getDepartmentIcon(entry.department)} {entry.department}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Data turno:</span>
                          <span className="ml-2 font-medium">{formatDate(entry.date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Orario:</span>
                          <span className="ml-2 font-medium">{entry.time}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Modificato da:</span>
                          <span className="ml-2 font-medium">{entry.changedBy}</span>
                        </div>
                      </div>
                      
                      {entry.previousValue && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-red-50 rounded-lg p-3">
                            <div className="text-sm text-red-700 font-medium">Valore precedente</div>
                            <div className="text-red-900">{entry.previousValue}</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-sm text-green-700 font-medium">Nuovo valore</div>
                            <div className="text-green-900">{entry.newValue}</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500">
                        {formatDateTime(entry.changedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
