'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useEmployeeContext } from '@/contexts/EmployeeContext'

type DashboardSection = 'bookings' | 'sale' | 'customers' | 'leaves' | 'shifts' | 'rest' | 'tips' | 'admin'
type ShiftViewScope = 'own' | 'department' | 'all'

interface AccessConfig {
  dashboard?: Partial<Record<DashboardSection, boolean>>
  shifts?: {
    viewScope?: ShiftViewScope
    canEdit?: boolean
  }
}

type AccessStore = Record<string, AccessConfig>

export default function TeamAccess() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { canAccessAdmin } = usePermissions()

  const [employees, setEmployees] = useState<any[]>([])
  const { employees: employeesData, mutate: mutateEmployees, isLoading } = useEmployeeContext()
  const [accessMap, setAccessMap] = useState<AccessStore>({})
  const [permMap, setPermMap] = useState<Record<string, { permissions: string[] }>>({})
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<AccessStore>({})
  
  const waitingForCompany = !!session && !(session.user as any)?.companyId

  useEffect(() => {
    if (!employeesData) return
    try {
      const list = employeesData.map((e: any, idx: number) => ({
        id: e.id || String(idx + 1),
        name: e.name,
        avatar: e.avatar || '👤',
        department: (e as any).department || 'sala',
        level: (e as any).level || 2,
      }))
      setEmployees(list)
    } catch {
      setEmployees([])
    }
  }, [employeesData])

  useEffect(() => {
    const onEmp = () => { try { mutateEmployees() } catch {} }
    const onAccess = () => {
      try {
        const stored = localStorage.getItem('user_access_controls')
        if (stored) {
          const parsed = JSON.parse(stored)
          setAccessMap(parsed)
          setPendingChanges(parsed)
        }
      } catch {}
    }
    
    onAccess()
    window.addEventListener('employees_updated', onEmp)
    window.addEventListener('access_controls_updated', onAccess)
    
    return () => {
      window.removeEventListener('employees_updated', onEmp)
      window.removeEventListener('access_controls_updated', onAccess)
    }
  }, [mutateEmployees])

  const saveAccessControls = () => {
    try {
      localStorage.setItem('user_access_controls', JSON.stringify(pendingChanges))
      setAccessMap(pendingChanges)
      window.dispatchEvent(new CustomEvent('access_controls_updated'))
      setIsEditing(false)
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
    }
  }

  const updateAccessConfig = (employeeId: string, section: string, key: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [section]: {
          ...prev[employeeId]?.[section as keyof AccessConfig],
          [key]: value
        }
      }
    }))
  }

  const getAccessConfig = (employeeId: string): AccessConfig => {
    return pendingChanges[employeeId] || accessMap[employeeId] || {}
  }

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'cucina': return 'bg-red-50 text-red-700 border-red-200'
      case 'sala': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'bar': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'cucina': return '🔥'
      case 'sala': return '🍽️'
      case 'bar': return '🍹'
      default: return '🏢'
    }
  }

  const dashboardSections = [
    { key: 'bookings', label: 'Prenotazioni', icon: '📅' },
    { key: 'sale', label: 'Sale', icon: '🏢' },
    { key: 'customers', label: 'Clienti', icon: '👥' },
    { key: 'leaves', label: 'Ferie', icon: '🏖️' },
    { key: 'shifts', label: 'Turni', icon: '⏰' },
    { key: 'rest', label: 'Riposi', icon: '😴' },
    { key: 'tips', label: 'Mance', icon: '💰' },
    { key: 'admin', label: 'Admin', icon: '⚙️' }
  ]

  const shiftScopes = [
    { key: 'own', label: 'Solo propri' },
    { key: 'department', label: 'Reparto' },
    { key: 'all', label: 'Tutti' }
  ]

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!canAccessAdmin()) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <div className="text-xl text-gray-700">Accesso non autorizzato</div>
          <p className="text-gray-500 mt-2">Non hai i permessi per accedere a questa sezione</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="admin_access">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🔐 Controllo Accessi</h2>
              <p className="text-gray-600 mt-1">Gestisci i permessi e gli accessi del team</p>
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setPendingChanges(accessMap)
                      setIsEditing(false)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    ❌ Annulla
                  </button>
                  <button
                    onClick={saveAccessControls}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    💾 Salva
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  ✏️ Modifica
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista Dipendenti */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Dipendenti ({employees.length})
            </h3>
          </div>
          
          <div className="p-6">
            {employees.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-500">Nessun dipendente trovato</p>
                <p className="text-sm text-gray-400 mt-1">Aggiungi dipendenti per gestire i loro accessi</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(employee => {
                  const config = getAccessConfig(employee.id)
                  const hasChanges = JSON.stringify(config) !== JSON.stringify(accessMap[employee.id])
                  
                  return (
                    <div
                      key={employee.id}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedEmployee === employee.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      } ${hasChanges ? 'border-orange-300 bg-orange-50' : ''}`}
                      onClick={() => setSelectedEmployee(employee.id)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-2xl">{employee.avatar}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{employee.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(employee.department)}`}>
                              {getDepartmentIcon(employee.department)} {employee.department}
                            </span>
                            {hasChanges && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                ⚠️ Modifiche
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>Livello: {employee.level}</div>
                        <div>ID: {employee.id}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Configurazione Accessi */}
        {selectedEmployee && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{employees.find(e => e.id === selectedEmployee)?.avatar}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {employees.find(e => e.id === selectedEmployee)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configurazione accessi e permessi
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Dashboard Sections */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">📊 Sezioni Dashboard</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dashboardSections.map(section => {
                    const isEnabled = getAccessConfig(selectedEmployee).dashboard?.[section.key as DashboardSection] || false
                    
                    return (
                      <label key={section.key} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => updateAccessConfig(selectedEmployee, 'dashboard', section.key, e.target.checked)}
                          disabled={!isEditing}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <span>{section.icon}</span>
                          <span className="text-sm font-medium">{section.label}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Shift Configuration */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">⏰ Configurazione Turni</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ambito di visualizzazione
                    </label>
                    <select
                      value={getAccessConfig(selectedEmployee).shifts?.viewScope || 'own'}
                      onChange={(e) => updateAccessConfig(selectedEmployee, 'shifts', 'viewScope', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {shiftScopes.map(scope => (
                        <option key={scope.key} value={scope.key}>
                          {scope.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getAccessConfig(selectedEmployee).shifts?.canEdit || false}
                        onChange={(e) => updateAccessConfig(selectedEmployee, 'shifts', 'canEdit', e.target.checked)}
                        disabled={!isEditing}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium">Modifica turni</div>
                        <div className="text-xs text-gray-600">Può modificare i turni degli altri</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Anteprima Configurazione */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">👁️ Anteprima Configurazione</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(getAccessConfig(selectedEmployee), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messaggi di Stato */}
        {waitingForCompany && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-yellow-800">
                In attesa dell'assegnazione dell'azienda. Alcune funzionalità potrebbero non essere disponibili.
              </span>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
