'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getRestRules, updateRestRule, type RestRule } from '@/lib/restRules'

export default function RestRulesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<RestRule[]>([])

  useEffect(() => {
    setRules(getRestRules())
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
              {rules.map(rule => (
                <div key={rule.employeeName} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-900 font-medium">{rule.employeeName}</div>
                      <div className="text-sm text-gray-500">Riposi settimanali: {rule.weeklyRestDays}</div>
                      <div className="text-sm text-gray-500">
                        Giorno fisso: {rule.fixedDayIndex !== undefined ? dayNames[rule.fixedDayIndex] : 'Nessuno'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <select
                        defaultValue={rule.weeklyRestDays}
                        onChange={(e) => {
                          const updated = updateRestRule(rule.employeeName, { weeklyRestDays: Number(e.target.value) as 1 | 2 })
                          setRules(prev => prev.map(r => r.employeeName === rule.employeeName ? updated : r))
                        }}
                        className="px-3 py-2 border rounded"
                      >
                        <option value={1}>1 riposo</option>
                        <option value={2}>2 riposi</option>
                      </select>
                      <select
                        defaultValue={rule.fixedDayIndex !== undefined ? rule.fixedDayIndex : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : (Number(e.target.value) as any)
                          const updated = updateRestRule(rule.employeeName, { fixedDayIndex: val })
                          setRules(prev => prev.map(r => r.employeeName === rule.employeeName ? updated : r))
                        }}
                        className="px-3 py-2 border rounded"
                      >
                        <option value="">Nessun giorno fisso</option>
                        {dayNames.map((d, idx) => (
                          <option key={d} value={idx}>{d}</option>
                        ))}
                      </select>
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


