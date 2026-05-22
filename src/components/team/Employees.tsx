'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import type { EmployeeFull } from '@/lib/employees'
import { CCNL_LEVEL_ORDER, isCcnlLevel, type CCNLLevel } from '@/lib/ccnl'
import {
  departmentFromStorage,
  RESTAURANT_DEPARTMENTS,
  RESTAURANT_ROLES,
} from '@/lib/restaurant-roles'

type TeamEmployee = EmployeeFull & {
  position?: string
  ccnlLevel?: string
}

const DEPARTMENT_ORDER = ['cucina', 'sala', 'beverage', 'accoglienza', 'dirigenti'] as const

const DEPARTMENT_LABELS: Record<string, string> = Object.fromEntries(
  RESTAURANT_DEPARTMENTS.map((d) => [d.value, d.label])
)

const DEPARTMENT_SECTION_TITLE: Record<string, string> = {
  cucina: '🔥 Cucina',
  sala: '🍽️ Sala',
  beverage: '🍷 Beverage',
  accoglienza: '🛎️ Accoglienza',
  dirigenti: '👔 Dirigenti',
  altro: '📁 Altro',
}

const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Amministratore',
  PROPRIETARIO: 'Proprietario',
  PROPRIETARIO_OPERATIVO: 'Proprietario operativo',
  DIRETTORE: 'Direttore',
  DIRETTORE_GENERALE: 'Direttore generale',
  VICE_DIRETTORE: 'Vice Direttore',
  MANAGER: 'Manager',
  RESTAURANT_MANAGER: 'Restaurant Manager',
  ASSISTANT_MANAGER: 'Assistant Manager',
  RESPONSABILE_SALA: 'Responsabile sala',
  MAITRE: 'Maitre',
  CASSIERE: 'Cassiere',
  EXECUTIVE_CHEF: 'Executive Chef',
  HEAD_CHEF: 'Head Chef',
  SOUS_CHEF: 'Sous Chef',
  EXEC_SOUS_CHEF: 'Executive Sous Chef',
  CHEF_DE_CUISINE: 'Chef de Cuisine',
  CHEF_DE_PARTIE: 'Chef de Partie',
  DEMI_CHEF_DE_PARTIE: 'Demi Chef de Partie',
  CHEF: 'Cuoco',
  CAPO_PARTITA: 'Capo partita',
  PIZZAIOLO_SPECIALIZZATO: 'Pizzaiolo',
  CUOCO_QUALIFICATO: 'Cuoco qualificato',
  COMMIS_DE_CUISINE: 'Commis di cucina',
  COMMIS_DE_CUISINE_SENIOR: 'Commis di cucina senior',
  AIUTO_CUOCO: 'Aiuto cuoco',
  HEAD_SOMMELIER: 'Head Sommelier',
  SOMMELIER: 'Sommelier',
  HEAD_BARMAN: 'Head Barman',
  BARMAN_SENIOR: 'Barman senior',
  BARMAN: 'Barman',
  CAMERIERE_SENIOR: 'Cameriere senior',
  CAMERIERE_QUALIFICATO: 'Chef de Rang',
  CAMERIERE: 'Cameriere',
  COMMIS_DI_SALA: 'Commis di sala',
  RUNNER: 'Runner',
  DIPENDENTE_SALA: 'Dipendente sala',
  DIPENDENTE_BAR: 'Bartender',
  LAVAPIATTI: 'Lavapiatti',
}

const EMPLOYEES_DEFAULT: TeamEmployee[] = [
  {
    id: '1',
    name: 'Giuseppe Rossi',
    email: 'giuseppe.rossi@brigata.it',
    phone: '+39 333 123 4567',
    role: 'EXECUTIVE_CHEF',
    department: 'cucina',
    level: 5,
    hourlyRate: 25.0,
    contractType: 'full-time',
    startDate: '2020-03-15',
    isActive: true,
    avatar: '👨‍🍳',
    skills: [],
    personalInfo: {},
  },
  {
    id: '2',
    name: 'Anna Bianchi',
    email: 'anna.bianchi@brigata.it',
    phone: '+39 333 234 5678',
    role: 'SOUS_CHEF',
    department: 'cucina',
    level: 4,
    hourlyRate: 20.0,
    contractType: 'full-time',
    startDate: '2021-06-01',
    isActive: true,
    avatar: '👩‍🍳',
    skills: [],
    personalInfo: {},
  },
  {
    id: '3',
    name: 'Marco Verdi',
    email: 'marco.verdi@brigata.it',
    phone: '+39 333 345 6789',
    role: 'RESPONSABILE_SALA',
    department: 'sala',
    level: 4,
    hourlyRate: 18.0,
    contractType: 'full-time',
    startDate: '2019-09-15',
    isActive: true,
    avatar: '👨‍💼',
    skills: [],
    personalInfo: {},
  },
]

function normalizeDept(d?: string): string {
  if (!d) return ''
  const x = d.toLowerCase()
  if (x === 'bar' || x === 'sommellerie') return 'beverage'
  if (x === 'gestione') return 'dirigenti'
  return x
}

function titleCaseRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function userRoleDisplayLabel(role: string, department?: string): string {
  const key = (role || '').toUpperCase().trim()
  if (!key) return '—'

  if (USER_ROLE_LABELS[key]) return USER_ROLE_LABELS[key]

  const dept = department ? departmentFromStorage(department) : undefined
  if (dept) {
    const inDept = RESTAURANT_ROLES.find((r) => r.department === dept && r.value === key)
    if (inDept) return inDept.label
  }

  if (key === 'DIPENDENTE') {
    const deptLabel = dept ? (DEPARTMENT_LABELS[dept] ?? dept) : 'Staff'
    return `${deptLabel} Dipendente`
  }

  return titleCaseRole(key)
}

/** Livello CCNL assegnato nel DB (solo payload API — non il suggested del ruolo). */
function getEmployeeCcnlLevel(employee: TeamEmployee): string | null {
  const raw = employee.ccnlLevel?.trim()
  if (!raw) return null
  const key = raw.toUpperCase()
  return isCcnlLevel(key) ? key : null
}

function ccnlSortRank(level: string | null): number {
  if (!level || !isCcnlLevel(level)) return 999
  const idx = CCNL_LEVEL_ORDER.indexOf(level as CCNLLevel)
  return idx === -1 ? 999 : idx
}

function ccnlBadgeLabel(level: string): string {
  if (level === 'QA' || level === 'QB') return level
  const match = level.match(/LIVELLO_(\d+)/)
  return match ? `L${match[1]}` : level
}

function getCardBadge(employee: TeamEmployee): { label: string; className: string } | null {
  const ccnl = getEmployeeCcnlLevel(employee)
  if (ccnl) {
    return {
      label: ccnlBadgeLabel(ccnl),
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  }
  if (employee.contractTypeEnum === 'INDETERMINATO') {
    return {
      label: 'Indeterminato',
      className: 'bg-green-50 text-green-700 border-green-200',
    }
  }
  if (employee.contractTypeEnum === 'DETERMINATO') {
    return {
      label: 'Determinato',
      className: 'bg-orange-50 text-orange-700 border-orange-200',
    }
  }
  return null
}

function getRoleDisplay(employee: TeamEmployee): string {
  const roleLabel = userRoleDisplayLabel(employee.role, employee.department)
  const position = employee.position?.trim()
  if (!position) return roleLabel

  const roleKey = (employee.role || '').toUpperCase()
  if (
    roleKey &&
    roleKey !== 'DIPENDENTE' &&
    roleKey !== 'DIPENDENTE_BAR' &&
    roleKey !== 'DIPENDENTE_SALA'
  ) {
    return roleLabel
  }

  return position
}

function getDepartmentLabel(dept: string) {
  return DEPARTMENT_LABELS[normalizeDept(dept)] ?? dept
}

function sortByCcnlDesc(a: TeamEmployee, b: TeamEmployee): number {
  return ccnlSortRank(getEmployeeCcnlLevel(a)) - ccnlSortRank(getEmployeeCcnlLevel(b))
}

export default function TeamEmployees() {
  const router = useRouter()
  const { canManageEmployees } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { employees: employeesData, mutate } = useEmployeeContext()

  useEffect(() => {
    const refresh = () => {
      void mutate()
    }
    window.addEventListener('employees_updated', refresh)
    return () => window.removeEventListener('employees_updated', refresh)
  }, [mutate])

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  const actualEmployees = useMemo(() => {
    const base = (employeesData?.length ? employeesData : EMPLOYEES_DEFAULT) as TeamEmployee[]
    return base.filter((emp) => {
      const role = emp.role || ''
      return role !== 'PROPRIETARIO' && role !== 'ADMIN'
    })
  }, [employeesData])

  const employees = useMemo(
    () =>
      actualEmployees.map((emp) => ({
        ...emp,
        department: normalizeDept(emp.department) as TeamEmployee['department'],
      })),
    [actualEmployees]
  )

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return employees.filter((emp) => {
      if (!q) return true
      return (
        emp.name.toLowerCase().includes(q) ||
        getRoleDisplay(emp).toLowerCase().includes(q)
      )
    })
  }, [employees, searchTerm])

  const groupedByDepartment = useMemo(() => {
    const groups: { key: string; label: string; employees: TeamEmployee[] }[] = []
    for (const dept of DEPARTMENT_ORDER) {
      const list = filteredEmployees
        .filter((e) => normalizeDept(e.department) === dept)
        .sort(sortByCcnlDesc)
      if (list.length > 0) {
        groups.push({
          key: dept,
          label: DEPARTMENT_SECTION_TITLE[dept] ?? getDepartmentLabel(dept),
          employees: list,
        })
      }
    }
    const known = new Set(DEPARTMENT_ORDER)
    const other = filteredEmployees
      .filter((e) => !known.has(normalizeDept(e.department) as (typeof DEPARTMENT_ORDER)[number]))
      .sort(sortByCcnlDesc)
    if (other.length > 0) {
      groups.push({ key: 'altro', label: DEPARTMENT_SECTION_TITLE.altro, employees: other })
    }
    return groups
  }, [filteredEmployees])

  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter((emp) => emp.isActive).length
    const byDepartment = employees.reduce(
      (acc, emp) => {
        const d = normalizeDept(emp.department)
        acc[d] = (acc[d] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const byRole = employees.reduce(
      (acc, emp) => {
        acc[emp.role] = (acc[emp.role] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return { total, active, byDepartment, byRole }
  }, [employees])

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchTerm('')
  }

  const renderEmployeeCard = (employee: TeamEmployee) => {
    const badge = getCardBadge(employee)

    return (
      <div
        key={employee.id}
        className="relative border border-gray-200 rounded-md px-2.5 py-2 pr-8 hover:shadow-sm hover:border-gray-300 transition bg-white"
      >
        {canManageEmployees() && (
          <button
            type="button"
            onClick={() => router.push(`/employees/${employee.id}`)}
            title="Modifica dipendente"
            aria-label="Modifica dipendente"
            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition text-xs"
          >
            ✏️
          </button>
        )}

        <h4 className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {employee.name}
        </h4>
        <p className="text-xs text-gray-600 truncate mt-0.5 leading-tight">
          {getRoleDisplay(employee)}
        </p>
        {badge && (
          <span
            className={`inline-flex mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium border leading-none ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>
    )
  }

  return (
    <PermissionGuard permission="personale_view">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">👥 Team</h2>
              <p className="text-gray-600 mt-1">Gestisci il tuo team e i profili dipendenti</p>
            </div>

            {canManageEmployees() && (
              <Link
                href="/employees/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                ➕ Aggiungi Dipendente
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-700">Dipendenti Totali</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-green-700">Attivi</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(stats.byDepartment).length}
            </div>
            <div className="text-sm text-purple-700">Reparti</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(stats.byRole).length}
            </div>
            <div className="text-sm text-orange-700">Ruoli</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 mr-auto">
              Dipendenti ({filteredEmployees.length})
            </h3>

            <div className="flex items-center gap-2">
              {searchOpen ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') closeSearch()
                    }}
                    placeholder="Nome, ruolo..."
                    className="w-44 sm:w-56 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    aria-label="Chiudi ricerca"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-base hover:bg-gray-100 hover:border-gray-300 transition"
                  aria-label="Cerca dipendenti"
                  title="Cerca"
                >
                  🔍
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-500">Nessun dipendente trovato</p>
                <p className="text-sm text-gray-400 mt-1">Prova a modificare la ricerca</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedByDepartment.map((group) => (
                  <section key={group.key}>
                    <h4 className="text-base font-bold text-gray-900 mb-3 pb-1.5 border-b border-gray-200">
                      {group.label}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({group.employees.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                      {group.employees.map((employee) => renderEmployeeCard(employee))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
