'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import {
  CATEGORY_LABELS,
  GROUP_LABELS,
  PERMISSION_CATEGORIES,
  type CategoryGrants,
  type EmployeePermissionGroup,
  type PermissionCategory,
} from '@/lib/category-permissions'

type EmployeeRow = {
  userId: string
  name: string
  email: string
  role: string
  ccnlLevel: string | null
  department: string | null
  restaurantName: string | null
  group: EmployeePermissionGroup | null
  groupLabel: string | null
  grants: CategoryGrants
}

const GROUP_ORDER: EmployeePermissionGroup[] = ['qa_qb', 'l2_l3', 'l4']

export default function CategoryPermissionsManager() {
  const { data: session, update: updateSession } = useSession()
  const { notifyCustom } = useNotifications()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [canGrantDelega, setCanGrantDelega] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/permissions/categories', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Caricamento fallito')
      }
      setEmployees((data as { employees: EmployeeRow[] }).employees ?? [])
      setCanGrantDelega(Boolean((data as { actor?: { canGrantDelega?: boolean } }).actor?.canGrantDelega))
    } catch (error) {
      notifyCustom(
        'ERROR',
        'SYSTEM',
        'Permessi',
        error instanceof Error ? error.message : 'Errore caricamento'
      )
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [notifyCustom])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q)
    )
  }, [employees, search])

  const grouped = useMemo(() => {
    const map: Record<EmployeePermissionGroup, EmployeeRow[]> = {
      qa_qb: [],
      l2_l3: [],
      l4: [],
    }
    for (const row of filtered) {
      if (row.group && map[row.group]) {
        map[row.group].push(row)
      }
    }
    return map
  }, [filtered])

  const handleToggle = async (
    employee: EmployeeRow,
    category: PermissionCategory
  ) => {
    const next = !employee.grants[category]
    const key = `${employee.userId}:${category}`
    setSavingKey(key)
    try {
      const res = await fetch('/api/permissions/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: employee.userId,
          category,
          granted: next,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Aggiornamento fallito')
      }
      const grants = (data as { grants: CategoryGrants }).grants
      setEmployees((prev) =>
        prev.map((e) =>
          e.userId === employee.userId ? { ...e, grants: { ...e.grants, ...grants } } : e
        )
      )
      if (employee.userId === session?.user?.id) {
        await updateSession()
      }
      notifyCustom(
        'SUCCESS',
        'SYSTEM',
        'Permessi',
        `${CATEGORY_LABELS[category]} ${next ? 'attivato' : 'disattivato'} per ${employee.name}`
      )
    } catch (error) {
      notifyCustom(
        'ERROR',
        'SYSTEM',
        'Permessi',
        error instanceof Error ? error.message : 'Errore aggiornamento'
      )
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Caricamento permessi per categoria...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-950">
        <p className="font-medium mb-1">Permessi centralizzati (database)</p>
        <p>
          Ogni categoria attiva permessi aggiuntivi oltre al livello CCNL. I toggle salvano su{' '}
          <code className="text-xs">user_permissions</code> e si applicano alla sessione al
          prossimo refresh. Le mance operative (inserimento/modifica record) restano nella sezione
          sotto, senza modifiche.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Cerca dipendente</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, email, reparto..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {GROUP_ORDER.map((groupKey) => {
        const rows = grouped[groupKey]
        if (rows.length === 0) return null
        return (
          <div key={groupKey} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-100 border-b">
              <h3 className="font-semibold text-gray-900">{GROUP_LABELS[groupKey]}</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {rows.length} {rows.length === 1 ? 'dipendente' : 'dipendenti'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dipendente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reparto
                    </th>
                    {PERMISSION_CATEGORIES.map((cat) => {
                      if (cat === 'delega' && !canGrantDelega) return null
                      return (
                        <th
                          key={cat}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                        >
                          {CATEGORY_LABELS[cat]}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((emp) => (
                    <tr key={emp.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500">
                          {emp.ccnlLevel} · {emp.role}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {emp.department ?? '—'}
                      </td>
                      {PERMISSION_CATEGORIES.map((cat) => {
                        if (cat === 'delega' && !canGrantDelega) return null
                        const cellKey = `${emp.userId}:${cat}`
                        return (
                          <td key={cat} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={emp.grants[cat]}
                              disabled={savingKey === cellKey}
                              onChange={() => void handleToggle(emp, cat)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                              title={CATEGORY_LABELS[cat]}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          Nessun dipendente gestibile nel tuo ambito.
        </p>
      )}
    </div>
  )
}
