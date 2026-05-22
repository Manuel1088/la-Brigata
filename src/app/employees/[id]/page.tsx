'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { canManageRestaurantStaff } from '@/lib/employee-create'
import { CCNL_LEVEL_OPTIONS } from '@/lib/ccnl'
import {
  departmentFromStorage,
  departmentToStorage,
  findRoleOption,
  getRolesForDepartment,
  roleOptionKey,
  suggestedCcnlForRole,
  type RestaurantDepartment,
  RESTAURANT_DEPARTMENTS,
} from '@/lib/restaurant-roles'

type EmployeeDto = {
  id: string
  name: string
  email: string
  role: string
  department: string
  ccnlLevel: string | null
}

export default function EditEmployeePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    department: 'sala' as RestaurantDepartment,
    roleKey: '',
    ccnlLevel: 'LIVELLO_3',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canManageRestaurantStaff(session.user?.role)) {
      router.push('/team?tab=employees')
    }
  }, [session, status, router])

  useEffect(() => {
    if (!employeeId) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/employees/${employeeId}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || 'Caricamento fallito')
        }
        const data = await res.json()
        const emp = data.employee as EmployeeDto
        const dept = departmentFromStorage(emp.department || 'sala')
        const match =
          findRoleOption(dept, emp.role) ?? getRolesForDepartment(dept)[0]
        setForm({
          name: emp.name,
          department: dept,
          roleKey: roleOptionKey(match),
          ccnlLevel: emp.ccnlLevel || match.suggestedCcnl,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore di caricamento')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [employeeId])

  const rolesForDepartment = useMemo(
    () => getRolesForDepartment(form.department),
    [form.department]
  )

  const handleDepartmentChange = (department: RestaurantDepartment) => {
    const roles = getRolesForDepartment(department)
    const first = roles[0]
    setForm((prev) => ({
      ...prev,
      department,
      roleKey: roleOptionKey(first),
      ccnlLevel: first.suggestedCcnl,
    }))
  }

  const handleRoleChange = (roleKey: string) => {
    const opt = rolesForDepartment.find((r) => roleOptionKey(r) === roleKey)
    if (!opt) return
    setForm((prev) => ({
      ...prev,
      roleKey,
      ccnlLevel: suggestedCcnlForRole(form.department, roleKey),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selected = rolesForDepartment.find((r) => roleOptionKey(r) === form.roleKey)
    if (!selected) {
      setError('Seleziona un ruolo valido')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          role: selected.value,
          department: departmentToStorage(form.department),
          ccnlLevel: form.ccnlLevel,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Salvataggio fallito')
      }
      window.dispatchEvent(new CustomEvent('employees_updated'))
      router.push('/team?tab=employees')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/team?tab=employees')}
            className="text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifica dipendente</h1>
            <p className="text-gray-600 text-sm">Nome, ruolo, reparto e livello CCNL</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reparto
              </label>
              <select
                value={form.department}
                onChange={(e) =>
                  handleDepartmentChange(e.target.value as RestaurantDepartment)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RESTAURANT_DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.icon} {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ruolo
              </label>
              <select
                value={form.roleKey}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {rolesForDepartment.map((r) => (
                  <option key={roleOptionKey(r)} value={roleOptionKey(r)}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Livello CCNL
              </label>
              <select
                value={form.ccnlLevel}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ccnlLevel: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CCNL_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/team?tab=employees')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                disabled={submitting}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
