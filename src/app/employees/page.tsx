'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'

import { getEmployeesFullClient } from '@/lib/employees'

// Database dipendenti realistico (derivato da storage condiviso)
const employeesDefault = [
  {
    id: '1',
    name: 'Giuseppe Rossi',
    email: 'giuseppe.rossi@brigata.it',
    phone: '+39 333 123 4567',
    role: 'EXECUTIVE_CHEF',
    department: 'cucina',
    level: 5,
    hourlyRate: 25.00,
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
    hourlyRate: 20.00,
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
    notes: 'Sous chef talentuosa, esperta in pasticceria e formazione del personale.'
  },
  {
    id: '3',
    name: 'Marco Verdi',
    email: 'marco.verdi@brigata.it',
    phone: '+39 333 345 6789',
    role: 'CHEF_DE_PARTIE',
    department: 'cucina',
    level: 3,
    hourlyRate: 16.00,
    contractType: 'full-time',
    startDate: '2022-01-10',
    isActive: true,
    avatar: '👨‍🍳',
    skills: ['Grill', 'Pasta', 'Quality Control', 'Inventory'],
    personalInfo: {
      fiscalCode: 'VRDMRC90C03H501W',
      address: 'Piazza Duomo 789, 20100 Milano',
      emergencyContact: 'Sofia Verdi - +39 333 765 4321'
    },
    notes: 'Chef de partie affidabile, specializzato in griglia e pasta fresca.'
  },
  {
    id: '4',
    name: 'Sofia Neri',
    email: 'sofia.neri@brigata.it',
    phone: '+39 333 456 7890',
    role: 'DIPENDENTE_SALA',
    department: 'sala',
    level: 2,
    hourlyRate: 12.00,
    contractType: 'part-time',
    startDate: '2022-09-15',
    isActive: true,
    avatar: '👩‍💼',
    skills: ['Customer Service', 'Wine Knowledge', 'Table Service', 'Upselling'],
    personalInfo: {
      fiscalCode: 'NRISFI95D04H501X',
      address: 'Via Brera 321, 20100 Milano',
      emergencyContact: 'Luca Neri - +39 333 654 3210'
    },
    notes: 'Cameriera professionale con ottime competenze nel servizio e conoscenza dei vini.'
  },
  {
    id: '5',
    name: 'Luca Blu',
    email: 'luca.blu@brigata.it',
    phone: '+39 333 567 8901',
    role: 'DIPENDENTE_BAR',
    department: 'bar',
    level: 2,
    hourlyRate: 13.00,
    contractType: 'full-time',
    startDate: '2023-02-20',
    isActive: true,
    avatar: '👨‍💼',
    skills: ['Cocktails', 'Coffee Art', 'Bar Management', 'Inventory'],
    personalInfo: {
      fiscalCode: 'BLULCA88E05H501Y',
      address: 'Via Navigli 654, 20100 Milano',
      emergencyContact: 'Giulia Blu - +39 333 543 2109'
    },
    notes: 'Barista esperto, specializzato in cocktail classici e caffè artigianale.'
  }
]

// Configurazione livelli e range paghe
const levelConfig = {
  1: { name: 'Junior', minRate: 10, maxRate: 12, color: 'blue' },
  2: { name: 'Operativo', minRate: 12, maxRate: 15, color: 'green' },
  3: { name: 'Specialista', minRate: 15, maxRate: 18, color: 'yellow' },
  4: { name: 'Senior', minRate: 18, maxRate: 22, color: 'orange' },
  5: { name: 'Executive', minRate: 22, maxRate: 30, color: 'red' }
}

// Configurazione reparti
const departments = {
  cucina: { name: 'Cucina', icon: '🔥', color: 'red' },
  sala: { name: 'Sala', icon: '🍽️', color: 'blue' },
  bar: { name: 'Bar', icon: '🍹', color: 'green' }
}

export default function EmployeesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canCreateEmployee, canEditEmployee, canDeleteEmployee, canExportEmployees } = usePermissions()
  
  // Stati
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [employees, setEmployees] = useState<any[]>(employeesDefault)
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>(employeesDefault)

  useEffect(() => {
    const reload = () => {
      const full = getEmployeesFullClient()
      setEmployees(full)
      // riapplica i filtri
      setSearchTerm('')
      setSelectedDepartment('all')
      setSelectedLevel('all')
      setShowActiveOnly(true)
      setFilteredEmployees(full)
    }
    window.addEventListener('employees_updated', reload)
    // iniziale
    reload()
    return () => window.removeEventListener('employees_updated', reload)
  }, [])

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  // Filtri in tempo reale
  useEffect(() => {
    let filtered = employees

    // Filtro ricerca
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm)
      )
    }

    // Filtro dipartimento
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment)
    }

    // Filtro livello
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(emp => emp.level === parseInt(selectedLevel))
    }

    // Filtro attivi
    if (showActiveOnly) {
      filtered = filtered.filter(emp => emp.isActive)
    }

    setFilteredEmployees(filtered)
  }, [searchTerm, selectedDepartment, selectedLevel, showActiveOnly])

  // Calcoli statistiche
  const stats = {
    total: employees.length,
    active: employees.filter(emp => emp.isActive).length,
    byDepartment: Object.keys(departments).reduce((acc, dept) => {
      acc[dept] = employees.filter(emp => emp.department === dept && emp.isActive).length
      return acc
    }, {} as Record<string, number>),
    monthlyCost: employees.filter(emp => emp.isActive).reduce((total, emp) => {
      const hours = emp.contractType === 'full-time' ? 160 : 80
      return total + (emp.hourlyRate * hours)
    }, 0)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <PermissionGuard permission="personale_view">
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                👥 Gestione Dipendenti
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {canCreateEmployee() && (
                <button
                  onClick={() => router.push('/employees/new')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  ➕ Nuovo Dipendente
                </button>
              )}
              {canExportEmployees() && (
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(employees, null, 2)
                    const dataBlob = new Blob([dataStr], {type: 'application/json'})
                    const url = URL.createObjectURL(dataBlob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'dipendenti.json'
                    link.click()
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  📤 Esporta
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Dashboard Statistiche */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">👥</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Totale Dipendenti</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">✅</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Attivi</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🏢</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Reparti</p>
                  <p className="text-2xl font-bold text-blue-600">{Object.keys(departments).length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">💰</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Costo Mensile</p>
                  <p className="text-2xl font-bold text-orange-600">€{stats.monthlyCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Distribuzione per Reparto */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">📊 Distribuzione per Reparto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(departments).map(([key, dept]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{dept.icon}</span>
                    <span className="font-medium text-gray-900">{dept.name}</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.byDepartment[key] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtri e Controlli */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              
              {/* Ricerca */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Ricerca
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome, email, telefono..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Filtro Dipartimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Reparto
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Tutti</option>
                  {Object.entries(departments).map(([key, dept]) => (
                    <option key={key} value={key}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Livello */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📈 Livello
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Tutti</option>
                  {Object.entries(levelConfig).map(([level, config]) => (
                    <option key={level} value={level}>Livello {level} - {config.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Attivi */}
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-orange-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Solo attivi</span>
                </label>
              </div>

              {/* Vista */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded ${viewMode === 'cards' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  📋 Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  📊 Tabella
                </button>
              </div>
            </div>
          </div>

          {/* Risultati */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                Dipendenti ({filteredEmployees.length})
              </h3>
            </div>
            
            {viewMode === 'cards' ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="border rounded-lg p-6 hover:shadow-lg transition">
                      <div className="flex items-center mb-4">
                        <div className="text-4xl mr-4">{employee.avatar}</div>
                        <div>
                          <h4 className="font-semibold text-lg">{employee.name}</h4>
                          <p className="text-gray-600">{employee.role.replace('_', ' ')}</p>
                          <div className="flex items-center mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              departments[employee.department as keyof typeof departments].color === 'red' ? 'bg-red-100 text-red-800' :
                              departments[employee.department as keyof typeof departments].color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {departments[employee.department as keyof typeof departments].icon} {departments[employee.department as keyof typeof departments].name}
                            </span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              levelConfig[employee.level as keyof typeof levelConfig].color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              levelConfig[employee.level as keyof typeof levelConfig].color === 'green' ? 'bg-green-100 text-green-800' :
                              levelConfig[employee.level as keyof typeof levelConfig].color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              levelConfig[employee.level as keyof typeof levelConfig].color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              L{employee.level} - {levelConfig[employee.level as keyof typeof levelConfig].name}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">📧</span> {employee.email}</p>
                        <p><span className="font-medium">📱</span> {employee.phone}</p>
                        <p><span className="font-medium">💰</span> €{employee.hourlyRate}/h ({employee.contractType})</p>
                        <p><span className="font-medium">📅</span> Dal {new Date(employee.startDate).toLocaleDateString('it-IT')}</p>
                      </div>
                      
                      <div className="mt-4 flex justify-end space-x-2">
                        <button 
                          onClick={() => router.push(`/employees/${employee.id}`)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          👁️ Vedi
                        </button>
                        {canEditEmployee() && (
                          <button 
                            onClick={() => router.push(`/employees/${employee.id}`)}
                            className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                          >
                            ✏️ Modifica
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dipendente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reparto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livello</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paga</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">{employee.avatar}</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            departments[employee.department as keyof typeof departments].color === 'red' ? 'bg-red-100 text-red-800' :
                            departments[employee.department as keyof typeof departments].color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {departments[employee.department as keyof typeof departments].icon} {departments[employee.department as keyof typeof departments].name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            levelConfig[employee.level as keyof typeof levelConfig].color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            levelConfig[employee.level as keyof typeof levelConfig].color === 'green' ? 'bg-green-100 text-green-800' :
                            levelConfig[employee.level as keyof typeof levelConfig].color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            levelConfig[employee.level as keyof typeof levelConfig].color === 'orange' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            L{employee.level} - {levelConfig[employee.level as keyof typeof levelConfig].name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          €{employee.hourlyRate}/h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.contractType === 'full-time' ? 'Full-time' : 'Part-time'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.isActive ? 'Attivo' : 'Inattivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button 
                            onClick={() => router.push(`/employees/${employee.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            👁️
                          </button>
                          {canEditEmployee() && (
                            <button 
                              onClick={() => router.push(`/employees/${employee.id}`)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              ✏️
                            </button>
                          )}
                          {canDeleteEmployee() && (
                            <button 
                              onClick={() => {
                                if (confirm('Sei sicuro di voler eliminare questo dipendente?')) {
                                  // Qui andrà la logica di eliminazione
                                  console.log('Elimina dipendente:', employee.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </PermissionGuard>
  )
}
