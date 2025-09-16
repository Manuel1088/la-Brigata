'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getRestRules, updateRestRule, type RestRule } from '@/lib/restRules'
import { usePermissions } from '@/hooks/usePermissions'
import { getEmployeesFullClient } from '@/lib/employees'

export default function RestRulesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<RestRule[]>([])
  const { userRole } = usePermissions()
  const employees = useMemo(() => getEmployeesFullClient(), [])
  const employeeDept = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach(e => map.set(e.name, (e.department as string) || 'sala'))
    return map
  }, [employees])

  useEffect(() => {
    setRules(getRestRules())
  }, [])

  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  const deptLabels: Record<string, string> = { cucina: '🔥 Cucina', sala: '🍽️ Sala', bar: '🍹 Bar' }

  const allowedDepartments = useMemo(() => {
    const upper = (userRole || '').toString().toUpperCase()
    if (['ADMIN','PROPRIETARIO','DIRETTORE','MANAGER'].includes(upper)) return ['cucina','sala','bar']
    if (upper === 'HEAD_CHEF') return ['cucina']
    if (upper === 'RESPONSABILE_SALA' || upper === 'CASSIERE') return ['sala']
    return ['sala']
  }, [userRole])

  const groupedByDept = useMemo(() => {
    const groups: Record<string, RestRule[]> = { cucina: [], sala: [], bar: [] }
    rules.forEach(r => {
      const dept = employeeDept.get(r.employeeName) || 'sala'
      if (groups[dept]) groups[dept].push(r)
    })
    return groups
  }, [rules, employeeDept])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">😴 Regole Riposi</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Imposta riposi settimanali e giorni fissi</h2>
              <p className="text-sm text-gray-600">Divisione per reparti. Puoi modificare solo i tuoi sottoposti.</p>
            </div>
            <div className="p-6 space-y-8">
              {(['cucina','sala','bar'] as const).filter(d => allowedDepartments.includes(d)).map(dept => (
                <div key={dept}>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">{deptLabels[dept]}</h3>
                  {groupedByDept[dept].length === 0 ? (
                    <div className="text-sm text-gray-500">Nessun dipendente in questo reparto.</div>
                  ) : (
                  <div className="space-y-4">
                  {groupedByDept[dept].map(rule => (
                    <div key={rule.employeeName} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-gray-900 font-medium">{rule.employeeName}</div>
                          <div className="text-sm text-gray-500">Riposi settimanali: {rule.weeklyRestDays}</div>
                          <div className="text-sm text-gray-500">
                            Giorni fissi: {rule.fixedDayIndices && rule.fixedDayIndices.length ? rule.fixedDayIndices.map(i => dayNames[i]).join(', ') : 'Nessuno'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-900">Seleziona fino a 2 giorni fissi:</div>
                          <div className="flex flex-wrap gap-3">
                            {dayNames.map((d, idx) => {
                              const checked = !!rule.fixedDayIndices?.includes(idx as any)
                              const canEdit = allowedDepartments.includes((employeeDept.get(rule.employeeName) || 'sala'))
                              return (
                                <label key={d} className="flex items-center space-x-1 text-gray-900">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!canEdit}
                                    onChange={(e) => {
                                      if (!canEdit) return
                                      const current = new Set(rule.fixedDayIndices || [])
                                      if (e.target.checked) {
                                        if (current.size < 2) current.add(idx as any)
                                      } else {
                                        current.delete(idx as any)
                                      }
                                      const arr = Array.from(current) as any
                                      const updated = updateRestRule(rule.employeeName, {
                                        fixedDayIndices: arr,
                                        weeklyRestDays: (arr.length === 0 ? (rule.weeklyRestDays || 1) : (Math.min(arr.length, 2) as 1 | 2))
                                      })
                                      setRules(prev => prev.map(r => r.employeeName === rule.employeeName ? updated : r))
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <span className={`${canEdit ? '' : 'text-gray-400'}`}>{d}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


