// src/app/tips/manage/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Dipendenti (stesso array di prima)
const employees = [
  { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
  { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
  { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
  { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
]

export default function ManageTipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Stato punti per ogni dipendente
  const defaultPoints = employees.reduce((acc, emp) => ({ ...acc, [emp.name]: 5 }), {})
  const [points, setPoints] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employeePoints')
      return saved ? JSON.parse(saved) : defaultPoints
    }
    return defaultPoints
  })
  const [savedMessage, setSavedMessage] = useState('')
  const [departmentChecks, setDepartmentChecks] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('departmentChecks')
      return saved ? JSON.parse(saved) : {
        cucina: false,
        sala: false,
        bar: false
      }
    }
    return {
      cucina: false,
      sala: false,
      bar: false
    }
  })
  const [departmentPoints, setDepartmentPoints] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('departmentPoints')
      return saved ? JSON.parse(saved) : {
        cucina: 5,
        sala: 5,
        bar: 5
      }
    }
    return {
      cucina: 5,
      sala: 5,
      bar: 5
    }
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

  // Definizione dei tipi
  type PointsType = {
    [key: string]: number
  }

  type DepartmentPointsType = {
    cucina: number;
    sala: number;
    bar: number;
  }

  type DepartmentChecksType = {
    cucina: boolean;
    sala: boolean;
    bar: boolean;
  }

  // Funzioni di gestione
  const updateIndividualScore = (name: string, score: number) => {
    setPoints((prev: PointsType) => ({
      ...prev,
      [name]: Math.max(1, Math.min(10, score))
    }))
  }

  const resetPoints = () => {
    setPoints(defaultPoints)
    setDepartmentPoints({ cucina: 5, sala: 5, bar: 5 })
    setDepartmentChecks({ cucina: false, sala: false, bar: false })
    localStorage.removeItem('employeePoints')
    localStorage.removeItem('departmentPoints')
    setSavedMessage('🔄 Punti resettati ai valori default!')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  const savePoints = () => {
    localStorage.setItem('employeePoints', JSON.stringify(points))
    localStorage.setItem('departmentPoints', JSON.stringify(departmentPoints))
    localStorage.setItem('departmentChecks', JSON.stringify(departmentChecks))
    setSavedMessage('💾 Punti salvati con successo!')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  const calculateDepartmentTotal = (department: string) => {
    const departmentEmployees = employees.filter(emp => emp.department === department)
    const totalPoints = departmentEmployees.reduce((sum, emp) => sum + points[emp.name], 0)
    return totalPoints > 0 ? totalPoints : 1 // evita divisione per zero
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
                ⚙️ Gestione Divisione Mance
              </h1>
              <button
                onClick={() => router.push('/tips/daily')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                💰 Gestione Mance Giornaliere
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Messaggio di salvataggio/reset */}
          {savedMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {savedMessage}
            </div>
          )}

          {/* Gestione Punti Distribuzione */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                ⚖️ Gestione punti mance
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Assegna un punteggio da 1 a 10 per ogni dipendente
              </p>
            </div>

            {/* Cucina */}
            <div className="p-6 border-b">
              <div className="flex items-center mb-4 space-x-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold">🔥 Cucina</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={departmentChecks.cucina}
                      onChange={(e) => setDepartmentChecks((prev: DepartmentChecksType) => ({ ...prev, cucina: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-red-500"
                    />
                    <span className="text-sm text-gray-600">Punteggio Reparto</span>
                  </label>
                  {departmentChecks.cucina && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={departmentPoints.cucina}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(20, Number(e.target.value)))
                          if (e.target.value !== String(value)) {
                            e.target.value = String(value)
                          }
                          setDepartmentPoints((prev: DepartmentPointsType) => ({ ...prev, cucina: value }))
                        }}
                        onBlur={(e) => {
                          const value = Math.max(1, Math.min(20, Number(e.target.value)))
                          setDepartmentPoints((prev: DepartmentPointsType) => ({ ...prev, cucina: value }))
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-500">Punti totali dipendenti: {calculateDepartmentTotal('cucina')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {employees.filter(emp => emp.department === 'cucina').map(emp => (
                  <div key={emp.name} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-600">{emp.role.replace('DIPENDENTE_', '').replace('_', ' ')}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Punti:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={points[emp.name]}
                        onChange={e => updateIndividualScore(emp.name, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sala */}
            <div className="p-6 border-b">
              <div className="flex items-center mb-4 space-x-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold">🍽️ Sala</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={departmentChecks.sala}
                      onChange={(e) => setDepartmentChecks((prev: DepartmentChecksType) => ({ ...prev, sala: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-blue-500"
                    />
                    <span className="text-sm text-gray-600">Punteggio Reparto</span>
                  </label>
                  {departmentChecks.sala && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={departmentPoints.sala}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(20, Number(e.target.value)))
                          if (e.target.value !== String(value)) {
                            e.target.value = String(value)
                          }
                          setDepartmentPoints((prev: DepartmentPointsType) => ({ ...prev, sala: value }))
                        }}
                        onBlur={(e) => {
                          const value = Math.max(1, Math.min(20, Number(e.target.value)))
                          setDepartmentPoints((prev: DepartmentPointsType) => ({ ...prev, sala: value }))
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">Punti totali dipendenti: {calculateDepartmentTotal('sala')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {employees.filter(emp => emp.department === 'sala').map(emp => (
                  <div key={emp.name} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-600">{emp.role.replace('DIPENDENTE_', '').replace('_', ' ')}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Punti:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={points[emp.name]}
                        onChange={e => updateIndividualScore(emp.name, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar */}
            <div className="p-6">
              <div className="flex items-center mb-4 space-x-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold">🍹 Bar</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={departmentChecks.bar}
                      onChange={(e) => setDepartmentChecks((prev: DepartmentChecksType) => ({ ...prev, bar: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-green-500"
                    />
                    <span className="text-sm text-gray-600">Punteggio Reparto</span>
                  </label>
                  {departmentChecks.bar && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={departmentPoints.bar}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(20, Number(e.target.value)))
                          if (e.target.value !== String(value)) {
                            e.target.value = String(value)
                          }
                          setDepartmentPoints((prev: DepartmentPointsType) => ({ ...prev, bar: value }))
                        }}
                        onBlur={(e) => {
                          const value = Math.max(1, Math.min(20, Number(e.target.value)))
                          setDepartmentPoints((prev: DepartmentPointsType) => ({ ...prev, bar: value }))
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-500">Punti totali dipendenti: {calculateDepartmentTotal('bar')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {employees.filter(emp => emp.department === 'bar').map(emp => (
                  <div key={emp.name} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-600">{emp.role.replace('DIPENDENTE_', '').replace('_', ' ')}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Punti:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={points[emp.name]}
                        onChange={e => updateIndividualScore(emp.name, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Azioni */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition" onClick={resetPoints}>
                Reset Default
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition" onClick={savePoints}>
                💾 Salva Punti
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}