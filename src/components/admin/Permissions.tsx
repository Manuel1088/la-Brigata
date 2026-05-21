'use client'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

type EmployeeTipsPermissions = {
  id: string
  name: string
  score: number
  canInsertTips: boolean
  canEditTips: boolean
  canDeleteTips: boolean
}

type TipPermKey = 'canInsertTips' | 'canEditTips' | 'canDeleteTips'

const TIP_PERMISSIONS: Array<{
  key: TipPermKey
  label: string
  description: string
}> = [
  {
    key: 'canInsertTips',
    label: 'Inserisci mance',
    description: 'Può registrare nuovi inserimenti (POST /api/tips)',
  },
  {
    key: 'canEditTips',
    label: 'Modifica mance',
    description: 'Può modificare importi esistenti (PATCH /api/tips/[id])',
  },
  {
    key: 'canDeleteTips',
    label: 'Elimina mance',
    description: 'Può cancellare inserimenti (DELETE /api/tips/[id])',
  },
]

async function patchEmployeeTipPermission(
  employeeId: string,
  field: TipPermKey,
  value: boolean
): Promise<EmployeeTipsPermissions> {
  const res = await fetch(`/api/employees/${employeeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ [field]: value }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Aggiornamento fallito')
  }
  return (data as { employee: EmployeeTipsPermissions }).employee
}

export default function AdminPermissions() {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const restaurantId = session?.user?.restaurantId as string | undefined

  const [employees, setEmployees] = useState<EmployeeTipsPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadEmployees = useCallback(async () => {
    if (!restaurantId) {
      setEmployees([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/scores?restaurantId=${restaurantId}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Caricamento fallito')
      }
      const data = (await res.json()) as { employees: EmployeeTipsPermissions[] }
      setEmployees(data.employees ?? [])
      logReadAction('employee_tip_permissions')
    } catch (error) {
      console.error('Errore caricamento permessi mance:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Permessi', 'Errore nel caricamento dipendenti')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [restaurantId, notifyCustom, logReadAction])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  const handleToggle = async (employee: EmployeeTipsPermissions, field: TipPermKey) => {
    const next = !employee[field]
    setSavingId(employee.id)
    try {
      const updated = await patchEmployeeTipPermission(employee.id, field, next)
      setEmployees((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
      )
      const permLabel = TIP_PERMISSIONS.find((p) => p.key === field)?.label ?? field
      notifyCustom(
        'SUCCESS',
        'SYSTEM',
        'Permessi',
        `${permLabel} ${next ? 'attivato' : 'disattivato'} per ${employee.name}`
      )
    } catch (error) {
      notifyCustom(
        'ERROR',
        'SYSTEM',
        'Permessi',
        error instanceof Error ? error.message : 'Errore aggiornamento'
      )
    } finally {
      setSavingId(null)
    }
  }

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const stats = {
    total: employees.length,
    insert: employees.filter((e) => e.canInsertTips).length,
    edit: employees.filter((e) => e.canEditTips).length,
    delete: employees.filter((e) => e.canDeleteTips).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <div className="text-xl text-gray-700">Caricamento permessi mance...</div>
        </div>
      </div>
    )
  }

  if (!restaurantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
        Ristorante non configurato per la sessione. Impossibile gestire i permessi mance.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">Permessi per dipendente (database)</p>
        <p>
          I ruoli <strong>ADMIN</strong> e <strong>MANAGER</strong> possono sempre modificare ed
          eliminare mance. Per gli altri utenti valgono i flag su <code>Employee</code> configurati
          qui sotto.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Dipendenti attivi</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.insert}</div>
          <div className="text-sm text-green-800">Con inserimento</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.edit}</div>
          <div className="text-sm text-blue-800">Con modifica</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.delete}</div>
          <div className="text-sm text-red-800">Con eliminazione</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Cerca dipendente</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dipendente
                </th>
                {TIP_PERMISSIONS.map((p) => (
                  <th
                    key={p.key}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Nessun dipendente trovato
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">Punteggio: {emp.score}</div>
                    </td>
                    {TIP_PERMISSIONS.map((perm) => (
                      <td key={perm.key} className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emp[perm.key]}
                            disabled={savingId === emp.id}
                            onChange={() => void handleToggle(emp, perm.key)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            title={perm.description}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        {TIP_PERMISSIONS.map((p) => (
          <p key={p.key}>
            <strong>{p.label}:</strong> {p.description}
          </p>
        ))}
      </div>
    </div>
  )
}
