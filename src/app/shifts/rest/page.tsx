'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getRestRules, updateRestRule, type RestRule } from '@/lib/restRules'
import { getEmployeesFullClient } from '@/lib/employees'

export default function RestRulesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<RestRule[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | 'cucina' | 'sala' | 'bar'>('all')

  useEffect(() => {
    setRules(getRestRules())
    try {
      setEmployees(getEmployeesFullClient())
    } catch {}
  }, [])

  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

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
            </div>
            <div className="p-6 space-y-4">
              {/* Filtro Reparti */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  className={`px-3 py-1 rounded border text-sm ${selectedDepartment === 'all' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50'}`}
                  onClick={() => setSelectedDepartment('all')}
                >Tutti</button>
                <button
                  className={`px-3 py-1 rounded border text-sm ${selectedDepartment === 'cucina' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50'}`}
                  onClick={() => setSelectedDepartment('cucina')}
                >🔥 Cucina</button>
                <button
                  className={`px-3 py-1 rounded border text-sm ${selectedDepartment === 'sala' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                  onClick={() => setSelectedDepartment('sala')}
                >🍽️ Sala</button>
                <button
                  className={`px-3 py-1 rounded border text-sm ${selectedDepartment === 'bar' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'}`}
                  onClick={() => setSelectedDepartment('bar')}
                >🍹 Bar</button>
              </div>

              {rules
                .filter(rule => {
                  if (selectedDepartment === 'all') return true
                  const emp = employees.find(e => e.name === rule.employeeName)
                  return (emp?.department || 'sala') === selectedDepartment
                })
                .map(rule => (
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
                          return (
                            <label key={d} className="flex items-center space-x-1 text-gray-900">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
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
                              <span>{d}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


