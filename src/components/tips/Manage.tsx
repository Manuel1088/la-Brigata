'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import { usePermissions } from '@/hooks/usePermissions'
import type { OfficeExportData } from '@/lib/pdf-tips'

type PointsType = { [key: string]: number }
type RestDaysType = { [key: string]: [string, string?] }
type CcnlLevelsType = { [key: string]: string }
type DepartmentPointsType = { cucina: number; sala: number; beverage: number }
type DepartmentChecksType = { cucina: boolean; sala: boolean; beverage: boolean }
type DepartmentKey = 'cucina' | 'sala' | 'beverage'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'] as const
const CCNL_LEVELS = ['QA', '1', '2', '3', '4', '5', '6'] as const

interface Employee {
  name: string
  role: string
  department: DepartmentKey
}

async function patchEmployeeScore(employeeId: string, score: number): Promise<void> {
  const res = await fetch(`/api/employees/${employeeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ score }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || 'Errore salvataggio punteggio')
  }
}

export default function TipsManage() {
  const { data: session } = useSession()
  const restaurantId = session?.user?.restaurantId
  const { canManageTips } = usePermissions()

  const { employees: employeesData, isLoading } = useEmployeeContext()
  const employees: Employee[] = useMemo(
    () =>
      (employeesData || [])
        .filter((e) => {
          const role = (e as { role?: string }).role || ''
          return role !== 'PROPRIETARIO' && role !== 'ADMIN'
        })
        .map((e) => ({
          name: (e as { name: string }).name,
          role: (e as { role: string }).role,
          department: ((e as { department?: string }).department as DepartmentKey) || 'sala',
        })),
    [employeesData]
  )

  const [isHydrated, setIsHydrated] = useState(false)
  const [scoresLoading, setScoresLoading] = useState(true)
  const [points, setPoints] = useState<PointsType>({})
  const [employeeIds, setEmployeeIds] = useState<Record<string, string>>({})
  const [restDays, setRestDays] = useState<RestDaysType>({})
  const [ccnlLevels, setCcnlLevels] = useState<CcnlLevelsType>({})
  const [departmentPoints, setDepartmentPoints] = useState<DepartmentPointsType>({
    cucina: 5,
    sala: 5,
    beverage: 5,
  })
  const [departmentChecks, setDepartmentChecks] = useState<DepartmentChecksType>({
    cucina: false,
    sala: false,
    beverage: false,
  })
  const [savedMessage, setSavedMessage] = useState('')
  const [savingScores, setSavingScores] = useState(false)
  const pendingPatches = useRef<Map<string, number>>(new Map())
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Office PDF export ──────────────────────────────────────────────────────
  const now = new Date()
  const [officePdfMonth, setOfficePdfMonth] = useState(now.getMonth())
  const [officePdfYear, setOfficePdfYear] = useState(now.getFullYear())
  const [officePdfLoading, setOfficePdfLoading] = useState(false)
  const [officePdfError, setOfficePdfError] = useState<string | null>(null)

  const handleDownloadOfficePdf = async () => {
    setOfficePdfLoading(true)
    setOfficePdfError(null)
    try {
      const params = new URLSearchParams({
        month: String(officePdfMonth),
        year: String(officePdfYear),
        ...(restaurantId ? { restaurantId } : {}),
      })
      const res = await fetch(`/api/tips/summary/export?${params}`, { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Errore export')
      }
      const data = (await res.json()) as OfficeExportData
      const { downloadOfficePdf } = await import('@/lib/pdf-tips')
      await downloadOfficePdf(data)
    } catch (e) {
      setOfficePdfError(e instanceof Error ? e.message : 'Errore generazione PDF')
    } finally {
      setOfficePdfLoading(false)
    }
  }

  const defaultPoints = useMemo(
    () => employees.reduce((acc, emp) => ({ ...acc, [emp.name]: 5 }), {} as PointsType),
    [employees]
  )

  // Riposi / CCNL / reparto da localStorage (non ancora su DB)
  useEffect(() => {
    try {
      const savedRestDays = localStorage.getItem('employeeRestDays')
      const savedCcnl = localStorage.getItem('employeeCCNL')
      const savedDeptPoints = localStorage.getItem('departmentPoints')
      const savedDeptChecks = localStorage.getItem('departmentChecks')

      setRestDays(savedRestDays ? JSON.parse(savedRestDays) : {})
      setCcnlLevels(savedCcnl ? JSON.parse(savedCcnl) : {})
      setDepartmentPoints(
        savedDeptPoints ? JSON.parse(savedDeptPoints) : { cucina: 5, sala: 5, beverage: 5 }
      )
      setDepartmentChecks(
        savedDeptChecks ? JSON.parse(savedDeptChecks) : { cucina: false, sala: false, beverage: false }
      )
    } catch (error) {
      console.error('Error loading from localStorage:', error)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Punteggi da Employee.score (Supabase)
  useEffect(() => {
    if (!restaurantId) {
      setScoresLoading(false)
      return
    }

    let cancelled = false

    const loadScores = async () => {
      setScoresLoading(true)
      try {
        const res = await fetch(`/api/employees/scores?restaurantId=${restaurantId}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Caricamento punteggi fallito')
        const data = (await res.json()) as {
          employees: Array<{ id: string; name: string; score: number }>
        }
        if (cancelled) return

        const nextPoints: PointsType = {}
        const nextIds: Record<string, string> = {}
        for (const emp of data.employees) {
          nextPoints[emp.name] = emp.score
          nextIds[emp.name] = emp.id
        }
        setPoints(nextPoints)
        setEmployeeIds(nextIds)
      } catch (error) {
        console.error('Error loading scores:', error)
        if (!cancelled) setPoints({})
      } finally {
        if (!cancelled) setScoresLoading(false)
      }
    }

    loadScores()
    return () => {
      cancelled = true
    }
  }, [restaurantId])

  useEffect(() => {
    if (employees.length > 0 && Object.keys(points).length === 0 && isHydrated && !scoresLoading) {
      setPoints(defaultPoints)
    }
  }, [employees, defaultPoints, isHydrated, points, scoresLoading])

  useEffect(() => {
    if (!isHydrated) return

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('employeeRestDays', JSON.stringify(restDays))
        localStorage.setItem('employeeCCNL', JSON.stringify(ccnlLevels))
        localStorage.setItem('departmentPoints', JSON.stringify(departmentPoints))
        localStorage.setItem('departmentChecks', JSON.stringify(departmentChecks))
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [restDays, ccnlLevels, departmentPoints, departmentChecks, isHydrated])

  const flushPendingPatches = useCallback(async () => {
    const pending = new Map(pendingPatches.current)
    pendingPatches.current.clear()
    if (pending.size === 0) return

    setSavingScores(true)
    try {
      await Promise.all(
        [...pending.entries()].map(([employeeId, score]) =>
          patchEmployeeScore(employeeId, score)
        )
      )
    } catch (error) {
      console.error('Error saving scores:', error)
      setSavedMessage('❌ Errore salvataggio punteggio su database')
      setTimeout(() => setSavedMessage(''), 3000)
    } finally {
      setSavingScores(false)
    }
  }, [])

  const schedulePatch = useCallback(
    (name: string, score: number) => {
      const employeeId = employeeIds[name]
      if (!employeeId) return
      pendingPatches.current.set(employeeId, score)
      if (patchTimer.current) clearTimeout(patchTimer.current)
      patchTimer.current = setTimeout(() => {
        patchTimer.current = null
        void flushPendingPatches()
      }, 800)
    },
    [employeeIds, flushPendingPatches]
  )

  const validatePointsInput = useCallback((value: string, min: number, max: number): number => {
    const num = Number(value)
    if (isNaN(num)) return min
    return Math.max(min, Math.min(max, Math.floor(num)))
  }, [])

  const updateIndividualScore = useCallback(
    (name: string, score: number) => {
      const validScore = validatePointsInput(String(score), 1, 10)
      setPoints((prev) => ({ ...prev, [name]: validScore }))
      schedulePatch(name, validScore)
    },
    [validatePointsInput, schedulePatch]
  )

  const updateRestDay = useCallback((name: string, index: 0 | 1, value: string) => {
    setRestDays((prev) => {
      const current = prev[name] || ['', '']
      const updated: [string, string?] = [...current] as [string, string?]
      updated[index] = value
      return { ...prev, [name]: updated }
    })
  }, [])

  const updateCcnlLevel = useCallback((name: string, level: string) => {
    setCcnlLevels((prev) => ({ ...prev, [name]: level }))
  }, [])

  const saveAllScores = useCallback(async () => {
    const entries = Object.entries(points).filter(([name]) => employeeIds[name])
    if (entries.length === 0) {
      setSavedMessage('⚠️ Nessun profilo Employee collegato ai dipendenti')
      setTimeout(() => setSavedMessage(''), 3000)
      return
    }

    setSavingScores(true)
    try {
      await Promise.all(
        entries.map(([name, score]) =>
          patchEmployeeScore(employeeIds[name], validatePointsInput(String(score), 1, 10))
        )
      )
      setSavedMessage('💾 Punti salvati su database!')
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (error) {
      console.error('Error saving:', error)
      setSavedMessage('❌ Errore durante il salvataggio')
      setTimeout(() => setSavedMessage(''), 3000)
    } finally {
      setSavingScores(false)
    }
  }, [points, employeeIds, validatePointsInput])

  const resetPoints = useCallback(async () => {
    if (
      !confirm('Sei sicuro di voler resettare tutti i punti? Questa azione non può essere annullata.')
    ) {
      return
    }

    setPoints(defaultPoints)
    setRestDays({})
    setCcnlLevels({})
    setDepartmentPoints({ cucina: 5, sala: 5, beverage: 5 })
    setDepartmentChecks({ cucina: false, sala: false, beverage: false })

    localStorage.removeItem('employeeRestDays')
    localStorage.removeItem('employeeCCNL')
    localStorage.removeItem('departmentPoints')
    localStorage.removeItem('departmentChecks')

    const ids = Object.values(employeeIds)
    if (ids.length > 0) {
      setSavingScores(true)
      try {
        await Promise.all(ids.map((id) => patchEmployeeScore(id, 5)))
        setSavedMessage('🔄 Punti resettati (5) e salvati su database!')
      } catch {
        setSavedMessage('⚠️ Reset locale ok, errore salvataggio su database')
      } finally {
        setSavingScores(false)
      }
    } else {
      setSavedMessage('🔄 Punti resettati ai valori default!')
    }
    setTimeout(() => setSavedMessage(''), 3000)
  }, [defaultPoints, employeeIds])

  const savePoints = useCallback(async () => {
    try {
      localStorage.setItem('employeeRestDays', JSON.stringify(restDays))
      localStorage.setItem('employeeCCNL', JSON.stringify(ccnlLevels))
      localStorage.setItem('departmentPoints', JSON.stringify(departmentPoints))
      localStorage.setItem('departmentChecks', JSON.stringify(departmentChecks))
      await saveAllScores()
    } catch (error) {
      console.error('Error saving:', error)
      setSavedMessage('❌ Errore durante il salvataggio')
      setTimeout(() => setSavedMessage(''), 3000)
    }
  }, [restDays, ccnlLevels, departmentPoints, departmentChecks, saveAllScores])

  const departmentTotals = useMemo(
    () => ({
      cucina: Math.max(
        1,
        employees
          .filter((e) => e.department === 'cucina')
          .reduce((sum, emp) => sum + (points[emp.name] || 0), 0)
      ),
      sala: Math.max(
        1,
        employees
          .filter((e) => e.department === 'sala')
          .reduce((sum, emp) => sum + (points[emp.name] || 0), 0)
      ),
      beverage: Math.max(
        1,
        employees
          .filter((e) => e.department === 'beverage')
          .reduce((sum, emp) => sum + (points[emp.name] || 0), 0)
      ),
    }),
    [employees, points]
  )

  const DepartmentSection = ({
    department,
    color,
    icon,
    label,
  }: {
    department: DepartmentKey
    color: string
    icon: string
    label: string
  }) => {
    const deptEmployees = employees.filter((emp) => emp.department === department)

    return (
      <div className="p-6 border-b">
        <div className="flex items-center mb-4 space-x-4">
          <div className="flex items-center">
            <div className={`w-4 h-4 bg-${color}-500 rounded-full mr-3`}></div>
            <h3 className="text-lg font-semibold">
              {icon} {label}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={departmentChecks[department]}
                onChange={(e) =>
                  setDepartmentChecks((prev) => ({
                    ...prev,
                    [department]: e.target.checked,
                  }))
                }
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
                    setDepartmentPoints((prev) => ({ ...prev, [department]: validValue }))
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
          {deptEmployees.map((emp) => (
            <div key={emp.name} className={`p-3 bg-${color}-50 rounded-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-sm text-gray-600">
                    {emp.role.replace('DIPENDENTE_', '').replace('_', ' ')}
                  </div>
                  {!employeeIds[emp.name] && (
                    <div className="text-xs text-amber-600 mt-1">Profilo Employee non trovato</div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Punti:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={points[emp.name] ?? 5}
                    onChange={(e) => updateIndividualScore(emp.name, Number(e.target.value))}
                    disabled={!employeeIds[emp.name] || savingScores}
                    className={`w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-${color}-500 disabled:opacity-50`}
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
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
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
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
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
                    {CCNL_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
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

  if (!isHydrated || isLoading || scoresLoading) {
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
      {savedMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {savedMessage}
        </div>
      )}

      {savingScores && (
        <div className="text-sm text-gray-500 text-center">Salvataggio punteggi...</div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">⚖️ Gestione punti mance</h2>
          <p className="text-sm text-gray-600 mt-1">
            Punteggio 1–10 salvato su database (Employee.score). Riposi e CCNL restano in locale fino
            a migrazione.
          </p>
        </div>

        <DepartmentSection department="cucina" color="red" icon="🔥" label="Cucina" />
        <DepartmentSection department="sala" color="blue" icon="🍽️" label="Sala" />
        <DepartmentSection department="beverage" color="green" icon="🍹" label="Bar" />

        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            onClick={resetPoints}
            disabled={savingScores}
          >
            🔄 Reset Default
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            onClick={savePoints}
            disabled={savingScores}
          >
            💾 Salva Punti
          </button>
        </div>
      </div>

      {canManageTips() && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Riepilogo mance ufficio personale</h2>
          <p className="text-sm text-gray-500 mb-5">
            Genera il PDF riepilogativo mensile con i totali per ogni dipendente.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mese</label>
              <select
                value={officePdfMonth}
                onChange={(e) => { setOfficePdfMonth(Number(e.target.value)); setOfficePdfError(null) }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anno</label>
              <select
                value={officePdfYear}
                onChange={(e) => { setOfficePdfYear(Number(e.target.value)); setOfficePdfError(null) }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleDownloadOfficePdf()}
              disabled={officePdfLoading}
              className="px-5 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {officePdfLoading ? 'Generazione…' : 'Scarica riepilogo PDF'}
            </button>
          </div>
          {officePdfError && (
            <p className="mt-3 text-sm text-red-600">{officePdfError}</p>
          )}
        </div>
      )}
    </div>
  )
}
