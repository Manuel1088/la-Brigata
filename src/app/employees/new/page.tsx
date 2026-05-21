'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { canManageRestaurantStaff } from '@/lib/employee-create'
import { CCNLLevel, CCNL_LEVEL_OPTIONS, getCcnlMonthlyBase } from '@/lib/ccnl'
import {
  CONTRACT_DURATION_OPTIONS,
  WORK_SCHEDULE_OPTIONS,
  contractEndDateLabel,
  isCcnlLocked,
  lockedCcnlLevel,
  requiresContractEndDate,
  showsContractDuration,
  showsExpenseAllowance,
  showsHourlyRate,
  type ContractDuration,
  type WorkSchedule,
} from '@/lib/employee-contract'
import {
  getDefaultRoleForDepartment,
  getRolesForDepartment,
  roleOptionKey,
  suggestedCcnlForRole,
  type RestaurantDepartment,
  RESTAURANT_DEPARTMENTS,
} from '@/lib/restaurant-roles'

function hourlyFromCcnl(level: string): number {
  return Math.round((getCcnlMonthlyBase(level) / 160) * 100) / 100
}

export default function NewEmployeePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const initialDept: RestaurantDepartment = 'sala'
  const initialRole = getDefaultRoleForDepartment(initialDept)

  const [formData, setFormData] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    department: RestaurantDepartment
    roleKey: string
    ccnlLevel: string
    hourlyRate: number
    expenseAllowance: number
    workSchedule: WorkSchedule
    contractDuration: ContractDuration
    startDate: string
    contractEndDate: string
    skills: string[]
    notes: string
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: initialDept,
    roleKey: roleOptionKey(initialRole),
    ccnlLevel: initialRole.suggestedCcnl,
    hourlyRate: hourlyFromCcnl(initialRole.suggestedCcnl),
    expenseAllowance: 500,
    workSchedule: 'full-time',
    contractDuration: 'indeterminato',
    startDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    skills: [],
    notes: '',
  })

  const [newSkill, setNewSkill] = useState('')
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

  const showDuration = showsContractDuration(formData.workSchedule)
  const showEndDate = requiresContractEndDate(
    formData.workSchedule,
    formData.contractDuration
  )
  const showExpense = showsExpenseAllowance(formData.workSchedule)
  const showHourly = showsHourlyRate(formData.workSchedule)
  const ccnlLocked = isCcnlLocked(formData.workSchedule)

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
    const ccnl = ccnlLocked ? lockedCcnlLevel() : defaultRole.suggestedCcnl
    setFormData((prev) => ({
      ...prev,
      department,
      roleKey: roleOptionKey(defaultRole),
      ccnlLevel: ccnl,
      hourlyRate: hourlyFromCcnl(ccnl),
    }))
  }

  const handleRoleChange = (roleKey: string) => {
    if (ccnlLocked) return
    const ccnl = suggestedCcnlForRole(formData.department, roleKey)
    setFormData((prev) => ({
      ...prev,
      roleKey,
      ccnlLevel: ccnl,
      hourlyRate: hourlyFromCcnl(ccnl),
    }))
  }

  const handleWorkScheduleChange = (workSchedule: WorkSchedule) => {
    setFormData((prev) => {
      const isEmployeeSchedule =
        workSchedule === 'full-time' || workSchedule === 'part-time'
      const duration: ContractDuration = isEmployeeSchedule
        ? prev.contractDuration
        : 'indeterminato'
      const endDate =
        isEmployeeSchedule && duration === 'indeterminato'
          ? ''
          : prev.contractEndDate

      return {
        ...prev,
        workSchedule,
        contractDuration: duration,
        contractEndDate: endDate,
        ...(workSchedule === 'apprendistato'
          ? {
              ccnlLevel: lockedCcnlLevel(),
              hourlyRate: hourlyFromCcnl(lockedCcnlLevel()),
            }
          : {}),
      }
    })
  }

  const handleContractDurationChange = (contractDuration: ContractDuration) => {
    setFormData((prev) => ({
      ...prev,
      contractDuration,
      contractEndDate: contractDuration === 'indeterminato' ? '' : prev.contractEndDate,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (
      requiresContractEndDate(formData.workSchedule, formData.contractDuration) &&
      !formData.contractEndDate
    ) {
      setError('Inserisci la data fine contratto')
      return
    }
    if (showExpense && formData.expenseAllowance <= 0) {
      setError('Inserisci il rimborso spese per lo stage')
      return
    }
    if (
      formData.contractEndDate &&
      formData.startDate &&
      formData.contractEndDate < formData.startDate
    ) {
      setError('La data fine deve essere successiva alla data inizio')
      return
    }

    setSubmitting(true)

    const role = selectedRole?.value
    if (!role) {
      setError('Seleziona un ruolo valido')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/employees/new', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          role,
          position: selectedRole.label,
          department: formData.department,
          ccnlLevel: formData.ccnlLevel,
          hourlyRate: showHourly ? formData.hourlyRate : undefined,
          expenseAllowance: showExpense ? formData.expenseAllowance : undefined,
          workSchedule: formData.workSchedule,
          contractDuration: showDuration ? formData.contractDuration : undefined,
          startDate: formData.startDate,
          contractEndDate: showEndDate ? formData.contractEndDate : undefined,
          skills: formData.skills,
          notes: formData.notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Errore durante la creazione')
        return
      }

      const name = encodeURIComponent(
        `${formData.firstName} ${formData.lastName}`.trim()
      )
      const emailSent = data.emailSent ? '1' : '0'
      router.push(
        `/team?tab=employees&created=1&name=${name}&emailSent=${emailSent}`
      )
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/team')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition text-lg"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">👥 Nuovo Dipendente</h1>
              {restaurantName && (
                <p className="text-sm text-gray-500 mt-1">
                  Ristorante: <span className="font-medium text-gray-700">{restaurantName}</span>
                  {' '}(assegnato automaticamente dal tuo account)
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600 mb-6">
            Verrà creato un account con password temporanea{' '}
            <strong>Brigata2026!</strong> (da cambiare al primo accesso). Il dipendente
            verrà associato al tuo ristorante senza bisogno di codici fiscali o ID manuali.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                  onChange={(e) => handleRoleChange(e.target.value)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Livello CCNL *
                  {ccnlLocked ? (
                    <span className="ml-1 text-xs font-normal text-amber-600">
                      (bloccato per apprendistato)
                    </span>
                  ) : selectedRole ? (
                    <span className="ml-1 text-xs font-normal text-blue-600">
                      (suggerito per {selectedRole.label})
                    </span>
                  ) : null}
                </label>
                <select
                  value={formData.ccnlLevel}
                  disabled={ccnlLocked}
                  onChange={(e) => {
                    const level = e.target.value
                    setFormData((prev) => ({
                      ...prev,
                      ccnlLevel: level,
                      hourlyRate: hourlyFromCcnl(level),
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                  required
                >
                  {CCNL_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — min. €{opt.monthlyBase.toFixed(2)}/mese
                    </option>
                  ))}
                </select>
              </div>
              {showHourly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tariffa oraria (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hourlyRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {showExpense && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rimborso spese (€/mese) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.expenseAllowance}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expenseAllowance: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 space-y-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Contratto</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo impiego *
                  </label>
                  <select
                    value={formData.workSchedule}
                    onChange={(e) =>
                      handleWorkScheduleChange(e.target.value as WorkSchedule)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {WORK_SCHEDULE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {showDuration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durata contratto *
                    </label>
                    <select
                      value={formData.contractDuration}
                      onChange={(e) =>
                        handleContractDurationChange(
                          e.target.value as ContractDuration
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {CONTRACT_DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data inizio *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>

                {showEndDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {contractEndDateLabel(
                        formData.workSchedule,
                        formData.contractDuration
                      )}
                    </label>
                    <input
                      type="date"
                      value={formData.contractEndDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contractEndDate: e.target.value,
                        }))
                      }
                      min={formData.startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competenze
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addSkill())
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Aggiungi competenza..."
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Aggiungi
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Note aggiuntive..."
              />
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
                {submitting ? 'Creazione...' : 'Crea Dipendente'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
