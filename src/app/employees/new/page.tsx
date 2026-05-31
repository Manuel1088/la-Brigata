'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { canManageRestaurantStaff } from '@/lib/employee-create'
import {
  departmentToStorage,
  getDefaultRoleForDepartment,
  getRolesForDepartment,
  roleOptionKey,
  type RestaurantDepartment,
  RESTAURANT_DEPARTMENTS,
} from '@/lib/restaurant-roles'

export default function NewEmployeePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const initialDept: RestaurantDepartment = 'sala'
  const initialRole = getDefaultRoleForDepartment(initialDept)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: initialDept as RestaurantDepartment,
    roleKey: roleOptionKey(initialRole),
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rolesForDepartment = useMemo(
    () => getRolesForDepartment(formData.department),
    [formData.department]
  )

  const selectedRole = useMemo(
    () =>
      rolesForDepartment.find((r) => roleOptionKey(r) === formData.roleKey) ??
      rolesForDepartment[0],
    [rolesForDepartment, formData.roleKey]
  )

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canManageRestaurantStaff(session.user?.role)) router.push('/team')
  }, [session, status, router])

  const handleDepartmentChange = (department: RestaurantDepartment) => {
    const defaultRole = getDefaultRoleForDepartment(department)
    setFormData((prev) => ({
      ...prev,
      department,
      roleKey: roleOptionKey(defaultRole),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const role = selectedRole?.value
    if (!role) {
      setError('Seleziona un ruolo valido')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role,
          department: departmentToStorage(formData.department),
          position: selectedRole.label,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Errore durante l’invio dell’invito')
        return
      }

      const email = encodeURIComponent(formData.email.trim())
      const emailSent = data.emailSent ? '1' : '0'
      router.push(`/team?tab=employees&invited=1&email=${email}&emailSent=${emailSent}`)
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Caricamento...
      </div>
    )
  }

  const restaurantName =
    (session.user as { restaurantName?: string } | undefined)?.restaurantName ??
    null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👥 Invita Dipendente</h1>
            {restaurantName && (
              <p className="text-sm text-gray-500 mt-1">
                Ristorante:{' '}
                <span className="font-medium text-gray-700">{restaurantName}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600 mb-6">
            Inserisci i dati del dipendente: riceverà via email un link per completare
            la registrazione e scegliere la propria password. L’account verrà creato
            solo quando accetterà l’invito.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cognome *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reparto *
                </label>
                <select
                  value={formData.department}
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
                  Ruolo *
                </label>
                <select
                  value={formData.roleKey}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, roleKey: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {rolesForDepartment.map((r) => (
                    <option key={roleOptionKey(r)} value={roleOptionKey(r)}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/team?tab=employees')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                disabled={submitting}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Invio...' : 'Invia invito'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
