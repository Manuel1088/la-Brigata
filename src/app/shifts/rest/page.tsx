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
  const [deptConfigs, setDeptConfigs] = useState<Record<'cucina'|'sala'|'bar', { mode: 'fixed'|'rotating'; weeklyRestDays: 1|2; baseStartDate?: string; rotateDirection?: 'forward'|'backward' }>>({
    cucina: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    sala: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' },
    bar: { mode: 'fixed', weeklyRestDays: 1, baseStartDate: '2025-01-06', rotateDirection: 'forward' }
  })

  useEffect(() => {
    setRules(getRestRules())
    try {
      setEmployees(getEmployeesFullClient())
    } catch {}
    // carica config reparto
    try {
      const raw = localStorage.getItem('rest_rules_department_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        setDeptConfigs(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  const saveDeptConfigs = (next: Record<'cucina'|'sala'|'bar', { mode: 'fixed'|'rotating'; weeklyRestDays: 1|2; baseStartDate?: string; rotateDirection?: 'forward'|'backward' }>) => {
    setDeptConfigs(next)
    try {
      localStorage.setItem('rest_rules_department_v1', JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('rest_rules_updated'))
    } catch {}
  }

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

              {/* Regole del Reparto */}
              {selectedDepartment !== 'all' && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-sm font-medium text-gray-900">Reparto: {selectedDepartment === 'cucina' ? '🔥 Cucina' : selectedDepartment === 'sala' ? '🍽️ Sala' : '🍹 Bar'}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">Giorni di riposo settimanali:</span>
                      <button
                        className={`px-3 py-1 rounded border text-sm ${deptConfigs[selectedDepartment].weeklyRestDays === 1 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        onClick={() => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], weeklyRestDays: 1 }})}
                      >1</button>
                      <button
                        className={`px-3 py-1 rounded border text-sm ${deptConfigs[selectedDepartment].weeklyRestDays === 2 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        onClick={() => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], weeklyRestDays: 2 }})}
                      >2</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">Modalità:</span>
                      <label className="flex items-center gap-1 text-sm text-gray-900">
                        <input
                          type="radio"
                          name="mode"
                          checked={deptConfigs[selectedDepartment].mode === 'fixed'}
                          onChange={() => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], mode: 'fixed' }})}
                        /> Riposo fisso
                      </label>
                      <label className="flex items-center gap-1 text-sm text-gray-900">
                        <input
                          type="radio"
                          name="mode"
                          checked={deptConfigs[selectedDepartment].mode === 'rotating'}
                          onChange={() => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], mode: 'rotating' }})}
                        /> Riposo a scalare
                      </label>
                    </div>
                    {deptConfigs[selectedDepartment].mode === 'rotating' && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700">Data inizio rotazione:</span>
                        <input
                          type="date"
                          value={deptConfigs[selectedDepartment].baseStartDate || ''}
                          onChange={(e) => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], baseStartDate: e.target.value || undefined } })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                  {deptConfigs[selectedDepartment].mode === 'rotating' && (
                    <>
                      <div className="mt-3 text-sm text-gray-600">Con riposo a scalare non è necessario impostare giorni fissi per dipendente.</div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm text-gray-700">Direzione rotazione:</span>
                        <label className="flex items-center gap-1 text-sm text-gray-900">
                          <input
                            type="radio"
                            name="rotateDirection"
                            checked={(deptConfigs[selectedDepartment].rotateDirection || 'forward') === 'forward'}
                            onChange={() => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], rotateDirection: 'forward' }})}
                          /> In avanti (es. Mar → Mer)
                        </label>
                        <label className="flex items-center gap-1 text-sm text-gray-900">
                          <input
                            type="radio"
                            name="rotateDirection"
                            checked={deptConfigs[selectedDepartment].rotateDirection === 'backward'}
                            onChange={() => saveDeptConfigs({ ...deptConfigs, [selectedDepartment]: { ...deptConfigs[selectedDepartment], rotateDirection: 'backward' }})}
                          /> All'indietro (es. Mar → Lun)
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {rules
                .filter(rule => {
                  if (selectedDepartment === 'all') return true
                  const emp = employees.find(e => e.name === rule.employeeName)
                  return (emp?.department || 'sala') === selectedDepartment
                })
                .filter(() => {
                  // Se modalità è riposo a scalare, non mostrare la lista per quel reparto
                  if (selectedDepartment === 'all') return true
                  return deptConfigs[selectedDepartment].mode === 'fixed'
                })
                .map(rule => (
                <div key={rule.employeeName} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-900 font-medium">{rule.employeeName}</div>
                      <div className="text-sm text-gray-500">Riposi settimanali: {deptConfigs[(employees.find(e => e.name === rule.employeeName)?.department || 'sala') as 'cucina'|'sala'|'bar']?.weeklyRestDays || rule.weeklyRestDays}</div>
                      <div className="text-sm text-gray-500">
                        Giorni fissi: {rule.fixedDayIndices && rule.fixedDayIndices.length ? rule.fixedDayIndices.map(i => dayNames[i]).join(', ') : 'Nessuno'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-900">Seleziona fino a {selectedDepartment !== 'all' ? deptConfigs[selectedDepartment].weeklyRestDays : 2} giorni fissi:</div>
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
                                    const target = selectedDepartment !== 'all' ? deptConfigs[selectedDepartment].weeklyRestDays : 2
                                    if (current.size < target) current.add(idx as any)
                                  } else {
                                    current.delete(idx as any)
                                  }
                                  const arr = Array.from(current) as any
                                  const targetDays: 1|2 = (selectedDepartment !== 'all' ? deptConfigs[selectedDepartment].weeklyRestDays : (arr.length > 1 ? 2 : 1)) as 1|2
                                  const updated = updateRestRule(rule.employeeName, {
                                    fixedDayIndices: arr,
                                    weeklyRestDays: targetDays
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


