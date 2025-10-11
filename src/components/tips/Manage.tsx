'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useEmployeeContext } from '@/contexts/EmployeeContext'

type PointsType = { [key: string]: number }
type RestDaysType = { [key: string]: [string, string?] }
type CcnlLevelsType = { [key: string]: string }
type DepartmentPointsType = { cucina: number; sala: number; bar: number }
type DepartmentChecksType = { cucina: boolean; sala: boolean; bar: boolean }
type DepartmentKey = 'cucina' | 'sala' | 'bar'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'] as const
const CCNL_LEVELS = ['QA', '1', '2', '3', '4', '5', '6'] as const

interface Employee {
  name: string
  role: string
  department: DepartmentKey
}

export default function TipsManage() {
  const { data: session } = useSession()
  
  // Dipendenti via SWR - FILTRA dipendenti REALI
  const { employees: employeesData, isLoading } = useEmployeeContext()
  const employees = useMemo(() => 
    (employeesData || [])
      .filter((e: any) => {
        const role = e.role || ''
        // Escludi PROPRIETARIO (non lavoratore) e ADMIN (non dipendenti)
        return role !== 'PROPRIETARIO' && role !== 'ADMIN'
      })
      .map((e: any) => ({
        name: e.name,
        role: e.role,
        department: (e.department || 'sala') as DepartmentKey
      })),
    [employeesData]
  )

  // Stati con hydration sicura
  const [isHydrated, setIsHydrated] = useState(false)
  const [points, setPoints] = useState<PointsType>({})
  const [restDays, setRestDays] = useState<RestDaysType>({})
  const [ccnlLevels, setCcnlLevels] = useState<CcnlLevelsType>({})
  const [departmentPoints, setDepartmentPoints] = useState<DepartmentPointsType>({
    cucina: 5,
    sala: 5,
    bar: 5
  })
  const [departmentChecks, setDepartmentChecks] = useState<DepartmentChecksType>({
    cucina: false,
    sala: false,
    bar: false
  })
  const [savedMessage, setSavedMessage] = useState('')

  // Default points basato su employees
  const defaultPoints = useMemo(() => 
    employees.reduce((acc, emp) => ({ ...acc, [emp.name]: 5 }), {} as PointsType),
    [employees]
  )

  // Hydration da localStorage - SOLO al mount client-side
  useEffect(() => {
    try {
      const savedPoints = localStorage.getItem('employeePoints')
      const savedRestDays = localStorage.getItem('employeeRestDays')
      const savedCcnl = localStorage.getItem('employeeCCNL')
      const savedDeptPoints = localStorage.getItem('departmentPoints')
      const savedDeptChecks = localStorage.getItem('departmentChecks')

      setPoints(savedPoints ? JSON.parse(savedPoints) : {})
      setRestDays(savedRestDays ? JSON.parse(savedRestDays) : {})
      setCcnlLevels(savedCcnl ? JSON.parse(savedCcnl) : {})
      setDepartmentPoints(savedDeptPoints ? JSON.parse(savedDeptPoints) : { cucina: 5, sala: 5, bar: 5 })
      setDepartmentChecks(savedDeptChecks ? JSON.parse(savedDeptChecks) : { cucina: false, sala: false, bar: false })
    } catch (error) {
      console.error('Error loading from localStorage:', error)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Inizializza punti default quando employees sono disponibili
  useEffect(() => {
    if (employees.length > 0 && Object.keys(points).length === 0 && isHydrated) {
      setPoints(defaultPoints)
    }
  }, [employees, defaultPoints, isHydrated, points])

  // Auto-save con debounce
  useEffect(() => {
    if (!isHydrated) return
    
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('employeePoints', JSON.stringify(points))
        localStorage.setItem('employeeRestDays', JSON.stringify(restDays))
        localStorage.setItem('employeeCCNL', JSON.stringify(ccnlLevels))
        localStorage.setItem('departmentPoints', JSON.stringify(departmentPoints))
        localStorage.setItem('departmentChecks', JSON.stringify(departmentChecks))
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [points, restDays, ccnlLevels, departmentPoints, departmentChecks, isHydrated])

  // Validazione input numerico
  const validatePointsInput = useCallback((value: string, min: number, max: number): number => {
    const num = Number(value)
    if (isNaN(num)) return min
    return Math.max(min, Math.min(max, Math.floor(num)))
  }, [])

  // Funzioni di gestione
  const updateIndividualScore = useCallback((name: string, score: number) => {
    const validScore = validatePointsInput(String(score), 1, 10)
    setPoints(prev => ({ ...prev, [name]: validScore }))
  }, [validatePointsInput])

  const updateRestDay = useCallback((name: string, index: 0 | 1, value: string) => {
    setRestDays(prev => {
      const current = prev[name] || ['', '']
      const updated: [string, string?] = [...current] as [string, string?]
      updated[index] = value
      return { ...prev, [name]: updated }
    })
  }, [])

  const updateCcnlLevel = useCallback((name: string, level: string) => {
    setCcnlLevels(prev => ({ ...prev, [name]: level }))
  }, [])

  const resetPoints = useCallback(() => {
    if (!confirm('Sei sicuro di voler resettare tutti i punti? Questa azione non può essere annullata.')) {
      return
    }
    
    setPoints(defaultPoints)
    setRestDays({})
    setCcnlLevels({})
    setDepartmentPoints({ cucina: 5, sala: 5, bar: 5 })
    setDepartmentChecks({ cucina: false, sala: false, bar: false })
    
    localStorage.removeItem('employeePoints')
    localStorage.removeItem('employeeRestDays')
    localStorage.removeItem('employeeCCNL')
    localStorage.removeItem('departmentPoints')
    localStorage.removeItem('departmentChecks')
    
    setSavedMessage('🔄 Punti resettati ai valori default!')
    setTimeout(() => setSavedMessage(''), 3000)
  }, [defaultPoints])

  const savePoints = useCallback(() => {
    try {
      localStorage.setItem('employeePoints', JSON.stringify(points))
      localStorage.setItem('employeeRestDays', JSON.stringify(restDays))
      localStorage.setItem('employeeCCNL', JSON.stringify(ccnlLevels))
      localStorage.setItem('departmentPoints', JSON.stringify(departmentPoints))
      localStorage.setItem('departmentChecks', JSON.stringify(departmentChecks))
      
      setSavedMessage('💾 Punti salvati con successo!')
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (error) {
      console.error('Error saving:', error)
      setSavedMessage('❌ Errore durante il salvataggio')
      setTimeout(() => setSavedMessage(''), 3000)
    }
  }, [points, restDays, ccnlLevels, departmentPoints, departmentChecks])

  // Calcoli memoizzati per totali reparto
  const departmentTotals = useMemo(() => ({
    cucina: Math.max(1, employees
      .filter(e => e.department === 'cucina')
      .reduce((sum, emp) => sum + (points[emp.name] || 0), 0)),
    sala: Math.max(1, employees
      .filter(e => e.department === 'sala')
      .reduce((sum, emp) => sum + (points[emp.name] || 0), 0)),
    bar: Math.max(1, employees
      .filter(e => e.department === 'bar')
      .reduce((sum, emp) => sum + (points[emp.name] || 0), 0))
  }), [employees, points])

  // Componente riutilizzabile per sezione reparto
  const DepartmentSection = ({ 
    department, 
    color, 
    icon, 
    label 
  }: { 
    department: DepartmentKey
    color: string
    icon: string
    label: string 
  }) => {
    const deptEmployees = employees.filter(emp => emp.department === department)
    
    return (
      <div className="p-6 border-b">
        <div className="flex items-center mb-4 space-x-4">
          <div className="flex items-center">
            <div className={`w-4 h-4 bg-${color}-500 rounded-full mr-3`}></div>
            <h3 className="text-lg font-semibold">{icon} {label}</h3>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={departmentChecks[department]}
                onChange={(e) => setDepartmentChecks(prev => ({ 
                  ...prev, 
                  [department]: e.target.checked 
                }))}
                className={`form-checkbox h-4 w-4 text-${color}-500`}
              />
              <span className="text-sm text-gray-600">Punteggio Reparto</span>
            </label>
            {departmentChecks[department] && (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={departmentPoints[department]}
                  onChange={(e) => {
                    const validValue = validatePointsInput(e.target.value, 1, 20)
                    setDepartmentPoints(prev => ({ ...prev, [department]: validValue }))
                  }}
                  className={`w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-${color}-500`}
                />
                <span className="text-sm text-gray-500">
                  Punti totali dipendenti: {departmentTotals[department]}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {deptEmployees.map(emp => (
            <div key={emp.name} className={`p-3 bg-${color}-50 rounded-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-sm text-gray-600">
                    {emp.role.replace('DIPENDENTE_', '').replace('_', ' ')}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Punti:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={points[emp.name] || 5}
                    onChange={e => updateIndividualScore(emp.name, Number(e.target.value))}
                    className={`w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-${color}-500`}
                  />
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Riposo 1</label>
                  <select
                    value={restDays[emp.name]?.[0] || ''}
                    onChange={(e) => updateRestDay(emp.name, 0, e.target.value)}
                    className={`w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-${color}-300 text-sm`}
                  >
                    <option value="">-</option>
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Riposo 2</label>
                  <select
                    value={restDays[emp.name]?.[1] || ''}
                    onChange={(e) => updateRestDay(emp.name, 1, e.target.value)}
                    className={`w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-${color}-300 text-sm`}
                  >
                    <option value="">-</option>
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">CCNL</label>
                  <select
                    value={ccnlLevels[emp.name] || ''}
                    onChange={(e) => updateCcnlLevel(emp.name, e.target.value)}
                    className={`w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-${color}-300 text-sm`}
                  >
                    <option value="">-</option>
                    {CCNL_LEVELS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⚖️</div>
          <div className="text-xl text-gray-700">Caricamento...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messaggio di salvataggio/reset */}
      {savedMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {savedMessage}
        </div>
      )}

      {/* Gestione Punti Distribuzione */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            ⚖️ Gestione punti mance
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Assegna un punteggio da 1 a 10 per ogni dipendente
          </p>
        </div>

        {/* Reparti */}
        <DepartmentSection 
          department="cucina" 
          color="red" 
          icon="🔥" 
          label="Cucina" 
        />
        
        <DepartmentSection 
          department="sala" 
          color="blue" 
          icon="🍽️" 
          label="Sala" 
        />
        
        <DepartmentSection 
          department="bar" 
          color="green" 
          icon="🍹" 
          label="Bar" 
        />

        {/* Azioni */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button 
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition" 
            onClick={resetPoints}
          >
            🔄 Reset Default
          </button>
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition" 
            onClick={savePoints}
          >
            💾 Salva Punti
          </button>
        </div>
      </div>
    </div>
  )
}