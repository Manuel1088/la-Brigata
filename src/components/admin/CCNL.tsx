'use client'
import { useMemo, useState } from 'react'
import {
  CCNL_LEVEL_ORDER,
  CCNL_LEVELS,
  formatCcnlLevelLabel,
  type CCNLLevel,
} from '@/lib/ccnl'

export default function AdminCCNL() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const rows = useMemo(() => {
    return CCNL_LEVEL_ORDER.map((level) => CCNL_LEVELS[level])
  }, [])

  const filtered = rows.filter((row) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !q ||
      row.title.toLowerCase().includes(q) ||
      row.code.toLowerCase().includes(q) ||
      row.description.toLowerCase().includes(q) ||
      row.typicalRoles.some((r) => r.toLowerCase().includes(q))
    const matchesCategory =
      categoryFilter === 'all' || row.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const stats = {
    total: rows.length,
    quadri: rows.filter((r) => r.category === 'QUADRI').length,
    impiegati: rows.filter((r) => r.category === 'IMPIEGATI').length,
    operai: rows.filter((r) => r.category === 'OPERAI').length,
  }

  const categories = ['all', 'QUADRI', 'IMPIEGATI', 'OPERAI'] as const

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 CCNL Turismo — Livelli 2026</h2>
        <p className="text-gray-600">
          Tabella retributiva di riferimento (Pubblici Esercizi). I valori sono le minime
          tabellari mensili lorde indicative per il 2026.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-700">Livelli</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.quadri}</div>
          <div className="text-sm text-purple-700">Quadri</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.impiegati}</div>
          <div className="text-sm text-green-700">Impiegati</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.operai}</div>
          <div className="text-sm text-orange-700">Operai</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca livello, mansione..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'Tutte le categorie' : c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Livello
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descrizione
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mansioni tipiche
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Minimo 2026
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Gerarchia
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((row) => (
                <tr key={row.level} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {formatCcnlLevelLabel(row.level as CCNLLevel)}
                    </div>
                    <div className="text-xs text-gray-500">{row.level}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        row.category === 'QUADRI'
                          ? 'bg-purple-100 text-purple-800'
                          : row.category === 'IMPIEGATI'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                    {row.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <ul className="list-disc list-inside space-y-0.5">
                      {row.typicalRoles.map((role) => (
                        <li key={role}>{role}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    €{row.monthlyBase2026.toLocaleString('it-IT', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {row.hierarchy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nessun livello trovato.</p>
        )}
      </div>
    </div>
  )
}
