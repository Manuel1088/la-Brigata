'use client'
import { useState } from 'react'
import {
  CCNLLevel,
  CCNL_LEVEL_OPTIONS,
  CCNL_LEVELS,
  getCcnlMonthlyBase,
} from '@/lib/ccnl'

export default function CCNLManagement() {
  const [selectedLevel, setSelectedLevel] = useState<CCNLLevel>(CCNLLevel.LIVELLO_3)
  const info = CCNL_LEVELS[selectedLevel]

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Gestione CCNL</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Livello CCNL
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as CCNLLevel)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {CCNL_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — €{opt.monthlyBase.toFixed(2)}/mese
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{info.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{info.description}</p>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Categoria</dt>
              <dd className="font-medium">{info.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Retribuzione minima 2026</dt>
              <dd className="font-medium">
                €{getCcnlMonthlyBase(selectedLevel).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Gerarchia</dt>
              <dd className="font-medium">{info.hierarchy}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500 mt-3">
            Mansioni: {info.typicalRoles.join(', ')}
          </p>
        </div>
      </div>
    </div>
  )
}
