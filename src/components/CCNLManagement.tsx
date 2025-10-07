'use client'

import { useState } from 'react'
import { CCNLLevel, CCNL_POSITIONS } from '@/lib/ccnl'

export function CCNLManagement() {
  const [selectedLevel, setSelectedLevel] = useState<CCNLLevel>(CCNLLevel.LIVELLO_5)
  const currentPosition = CCNL_POSITIONS[selectedLevel]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📋 CCNL Turismo - Inquadramenti</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Livello CCNL
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as CCNLLevel)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <optgroup label="QUADRI">
              <option value={CCNLLevel.LIVELLO_1Q}>1Q - Direttore Generale</option>
              <option value={CCNLLevel.LIVELLO_2Q}>2Q - Responsabile Area</option>
            </optgroup>
            <optgroup label="IMPIEGATI">
              <option value={CCNLLevel.LIVELLO_3}>3 - Responsabile Sala/Maître</option>
              <option value={CCNLLevel.LIVELLO_4}>4 - Cameriere Specializzato</option>
              <option value={CCNLLevel.LIVELLO_5}>5 - Cameriere/Barista</option>
            </optgroup>
            <optgroup label="OPERAI">
              <option value={CCNLLevel.LIVELLO_6}>6 - Cuoco Specializzato</option>
              <option value={CCNLLevel.LIVELLO_7}>7 - Cuoco/Aiuto Cuoco</option>
              <option value={CCNLLevel.LIVELLO_8}>8 - Operaio Generico</option>
            </optgroup>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Dettagli Posizione</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Livello:</span> {currentPosition.level}</div>
              <div><span className="font-medium">Categoria:</span> {currentPosition.category}</div>
              <div><span className="font-medium">Titolo:</span> {currentPosition.title}</div>
              <div><span className="font-medium">Descrizione:</span> {currentPosition.description}</div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Retribuzione</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Min:</span> €{currentPosition.minSalary.toLocaleString()}/mese</div>
              <div><span className="font-medium">Max:</span> €{currentPosition.maxSalary.toLocaleString()}/mese</div>
              <div><span className="font-medium">Ore/settimana:</span> {currentPosition.weeklyHours}h</div>
              <div><span className="font-medium">Straordinari:</span> +{isNaN(currentPosition.overtimeRate) ? '0' : ((currentPosition.overtimeRate - 1) * 100).toFixed(0)}%</div>
              <div><span className="font-medium">Notturno:</span> +{isNaN(currentPosition.nightRate) ? '0' : ((currentPosition.nightRate - 1) * 100).toFixed(0)}%</div>
              <div><span className="font-medium">Festivi:</span> +{isNaN(currentPosition.holidayRate) ? '0' : ((currentPosition.holidayRate - 1) * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Riepilogo Livelli CCNL</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Livello</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posizione</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stipendio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Straordinari</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(CCNL_POSITIONS).map((position) => (
                <tr key={position.level} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {position.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {position.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    €{position.minSalary.toLocaleString()} - €{position.maxSalary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    +{isNaN(position.overtimeRate) ? '0' : ((position.overtimeRate - 1) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


