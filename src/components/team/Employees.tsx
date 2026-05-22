'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useEmployeeContext } from '@/contexts/EmployeeContext'

// Default employees fallback (top-level to avoid useMemo dependencies)
const EMPLOYEES_DEFAULT = [
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
    skills: ['Cucina Italiana', 'Menu Design', 'Team Management', 'Cost Control'],
    personalInfo: {
      fiscalCode: 'RSSGPP80A01H501U',
      address: 'Via Roma 123, 20100 Milano',
      emergencyContact: 'Maria Rossi - +39 333 987 6543'
    },
    notes: 'Chef esperto con 15 anni di esperienza. Specializzato in cucina tradizionale italiana.'
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
    skills: ['Pastry', 'Sauces', 'Kitchen Organization', 'Training'],
    personalInfo: {
      fiscalCode: 'BNCNNA85B02H501V',
      address: 'Corso Italia 456, 20100 Milano',
      emergencyContact: 'Marco Bianchi - +39 333 876 5432'
    },
    notes: 'Sous chef esperta in pasticceria. Ottima gestione del team.'
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
    skills: ['Customer Service', 'Wine Knowledge', 'Team Leadership', 'Sales'],
    personalInfo: {
      fiscalCode: 'VRDMRC83C03H501W',
      address: 'Piazza Duomo 789, 20100 Milano',
      emergencyContact: 'Laura Verdi - +39 333 765 4321'
    },
    notes: 'Responsabile sala con ottime competenze nel servizio clienti.'
  }
]

export default function TeamEmployees() {
  const router = useRouter()
  const { canManageEmployees } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'department' | 'startDate'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { employees: employeesData, mutate } = useEmployeeContext()

  useEffect(() => {
    const refresh = () => {
      void mutate()
    }
    window.addEventListener('employees_updated', refresh)
    return () => window.removeEventListener('employees_updated', refresh)
  }, [mutate])

  // Filtra dipendenti REALI (escludi PROPRIETARIO non lavoratore e ADMIN)
  const actualEmployees = useMemo(() => {
    const base = employeesData && employeesData.length > 0 ? employeesData : EMPLOYEES_DEFAULT
    return base.filter(emp => {
      const role = emp.role || ''
      // Escludi PROPRIETARIO (non lavoratore) e ADMIN (non sono dipendenti)
      return role !== 'PROPRIETARIO' && role !== 'ADMIN'
    })
  }, [employeesData])

  const normalizeDept = (d?: string) => (d === 'bar' ? 'beverage' : d || '')
  const employees = actualEmployees.map(emp => ({ ...emp, department: normalizeDept(emp.department) }))

  // Filtra e ordina dipendenti
  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment
      const matchesRole = selectedRole === 'all' || emp.role === selectedRole
      
      return matchesSearch && matchesDepartment && matchesRole
    })

    // Ordina
    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'department':
          aValue = a.department
          bValue = b.department
          break
        case 'startDate':
          aValue = new Date(a.startDate)
          bValue = new Date(b.startDate)
          break
        default:
          aValue = a.name
          bValue = b.name
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [employees, searchTerm, selectedDepartment, selectedRole, sortBy, sortOrder])

  // Statistiche
  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter(emp => emp.isActive).length
    const byDepartment = employees.reduce((acc, emp) => {
      const d = normalizeDept(emp.department)
      acc[d] = (acc[d] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const byRole = employees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, active, byDepartment, byRole }
  }, [employees])

  const departments = ['all', 'cucina', 'sala', 'beverage', 'accoglienza']
  const roles = ['all', ...Array.from(new Set(employees.map(emp => emp.role)))]

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'cucina': return 'bg-red-50 text-red-700 border-red-200'
      case 'sala': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'beverage': return 'bg-green-50 text-green-700 border-green-200'
      case 'accoglienza': return 'bg-purple-50 text-purple-700 border-purple-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'cucina': return '🔥'
      case 'sala': return '🍽️'
      case 'beverage': return '🍷'
      case 'accoglienza': return '🛎️'
      default: return '🏢'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <PermissionGuard permission="personale_view">
      <div className="space-y-6">
        {/* Header */}
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

        {/* Statistiche */}
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

        {/* Filtri e ricerca */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reparto</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'Tutti' : dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ruolo</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role === 'all' ? 'Tutti' : role.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordina per</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name'|'role'|'department'|'startDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Nome</option>
                <option value="role">Ruolo</option>
                <option value="department">Reparto</option>
                <option value="startDate">Data assunzione</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordine</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc'|'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista dipendenti */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Dipendenti ({filteredEmployees.length})
            </h3>
          </div>
          
          <div className="p-6">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-500">Nessun dipendente trovato</p>
                <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEmployees.map(employee => (
                  <div key={employee.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{employee.avatar}</div>
                        <div>
                          <h4 className="font-medium text-gray-900">{employee.name}</h4>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(employee.department)}`}>
                        {getDepartmentIcon(employee.department)} {employee.department}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ruolo:</span>
                        <span className="font-medium">{employee.role.replace(/_/g, ' ')}</span>
                      </div>
                      {/* Tariffa rimossa: retribuzione ora è mensile CCNL */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assunzione:</span>
                        <span className="font-medium">{formatDate(employee.startDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contratto:</span>
                        <span className="font-medium">{employee.contractType}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      {canManageEmployees() && (
                        <button
                          type="button"
                          onClick={() => router.push(`/employees/${employee.id}`)}
                          className="flex-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
                        >
                          ✏️ Modifica
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
