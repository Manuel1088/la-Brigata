'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getRestRules, updateRestRule, type RestRule } from '@/lib/restRules'
import { useEmployeeContext } from '@/contexts/EmployeeContext'

export default function ShiftsRules() {
  const router = useRouter()
  const { data: session } = useSession()
  const [rules, setRules] = useState<RestRule[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<'cucina' | 'sala' | 'beverage'>('sala')
  
  // Usa l'hook useEmployees per caricare solo i dipendenti dell'azienda
  const { employees: employeesData, isLoading } = useEmployeeContext()
  const employees = useMemo(() => {
    if (!employeesData) return []
    return employeesData.map((e: any) => ({ 
      name: e.name, 
      department: e.department || 'sala' 
    }))
  }, [employeesData])
  
  const [deptConfigs, setDeptConfigs] = useState<Record<'cucina'|'sala'|'beverage', { mode: 'fixed'|'rotating'; weeklyRestDays: 1|2; baseStartDate?: string; rotateDirection?: 'forward'|'backward' }>>({
    cucina: { mode: 'fixed', weeklyRestDays: 1 },
    sala: { mode: 'fixed', weeklyRestDays: 1 },
    beverage: { mode: 'fixed', weeklyRestDays: 1 }
  })

  useEffect(() => {
    setRules(getRestRules())
    // carica config reparto
    try {
      const raw = localStorage.getItem('rest_rules_department_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        setDeptConfigs(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  // Permessi base: limita i reparti visibili/modificabili in base al ruolo
  const { allowedDepartments, manageAll } = useMemo(() => {
    const role = ((session?.user as any)?.role || '').toString().toUpperCase()
    if (['PROPRIETARIO','DIRETTORE','MANAGER','ADMIN'].includes(role)) {
      return { allowedDepartments: ['cucina','sala','beverage'] as Array<'cucina'|'sala'|'beverage'>, manageAll: true }
    }
    if (role === 'HEAD_CHEF') return { allowedDepartments: ['cucina'] as Array<'cucina'|'sala'|'bar'>, manageAll: false }
    if (role === 'RESPONSABILE_SALA' || role === 'CASSIERE') return { allowedDepartments: ['sala'] as Array<'cucina'|'sala'|'bar'>, manageAll: false }
    // Fallback: bar
    return { allowedDepartments: ['beverage'] as Array<'cucina'|'sala'|'beverage'>, manageAll: false }
  }, [session])

  const updateRule = (employeeName: string, dayOfWeek: number, isRestDay: boolean) => {
    const newRules = updateRestRule(employeeName, dayOfWeek, isRestDay)
    setRules(newRules)
  }

  const saveDeptConfig = (dept: 'cucina'|'sala'|'beverage', config: any) => {
    const newConfigs = { ...deptConfigs, [dept]: config }
    setDeptConfigs(newConfigs)
    try {
      localStorage.setItem('rest_rules_department_v1', JSON.stringify(newConfigs))
    } catch {}
  }

  const getDayName = (dayIndex: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    return days[dayIndex]
  }

  const getEmployeeRules = (employeeName: string) => {
    if (!rules || !Array.isArray(rules)) return []
    return rules.filter(rule => rule.employeeName === employeeName)
  }

  const getDepartmentEmployees = (department: string) => {
    if (!employees || !Array.isArray(employees)) return []
    return employees.filter(emp => emp.department === department)
  }

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'cucina': return 'bg-red-50 border-red-200'
      case 'sala': return 'bg-blue-50 border-blue-200'
      case 'beverage': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'cucina': return '🔥'
      case 'sala': return '🍽️'
      case 'beverage': return '🍷'
      default: return '🏢'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900">😴 Regole Riposi</h2>
        <p className="text-gray-600 mt-1">Imposta riposi settimanali e giorni fissi per ogni dipendente</p>
      </div>

      {/* Selezione reparto */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Seleziona Reparto</h3>
        <div className="flex gap-2">
          {allowedDepartments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedDepartment === dept
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getDepartmentIcon(dept)} {dept.charAt(0).toUpperCase() + dept.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Configurazione reparto */}
      {manageAll && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            ⚙️ Configurazione {selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modalità</label>
              <select
                value={deptConfigs[selectedDepartment].mode}
                onChange={(e) => saveDeptConfig(selectedDepartment, { ...deptConfigs[selectedDepartment], mode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fisso</option>
                <option value="rotating">Rotante</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giorni riposo settimanali</label>
              <select
                value={deptConfigs[selectedDepartment].weeklyRestDays}
                onChange={(e) => saveDeptConfig(selectedDepartment, { ...deptConfigs[selectedDepartment], weeklyRestDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 giorno</option>
                <option value={2}>2 giorni</option>
              </select>
            </div>
            
            {deptConfigs[selectedDepartment].mode === 'rotating' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Direzione rotazione</label>
                <select
                  value={deptConfigs[selectedDepartment].rotateDirection || 'forward'}
                  onChange={(e) => saveDeptConfig(selectedDepartment, { ...deptConfigs[selectedDepartment], rotateDirection: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="forward">Avanti</option>
                  <option value="backward">Indietro</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Imposta riposi settimanali e giorni fissi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {getDepartmentIcon(selectedDepartment)} {selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
        </h3>
        
        <div className="space-y-4">
          {getDepartmentEmployees(selectedDepartment).map(employee => {
            const employeeRules = getEmployeeRules(employee.name)
            const restDays = Array.from({ length: 7 }, (_, i) => 
              employeeRules.some(rule => rule.dayOfWeek === i && rule.isRestDay)
            )
            
            return (
              <div key={employee.name} className={`border rounded-lg p-4 ${getDepartmentColor(selectedDepartment)}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{employee.name}</h4>
                  <span className="text-sm text-gray-600">
                    {restDays.filter(Boolean).length} giorni di riposo
                  </span>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {restDays.map((isRestDay, dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => updateRule(employee.name, dayIndex, !isRestDay)}
                      className={`p-2 rounded-lg text-sm font-medium transition ${
                        isRestDay
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {getDayName(dayIndex)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Riepilogo regole */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Riepilogo Regole</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['cucina', 'sala', 'beverage'].map(dept => {
            const deptEmployees = getDepartmentEmployees(dept)
            const totalRestDays = deptEmployees.reduce((sum, emp) => {
              const empRules = getEmployeeRules(emp.name)
              return sum + empRules.filter(rule => rule.isRestDay).length
            }, 0)
            
            return (
              <div key={dept} className={`rounded-lg p-4 ${getDepartmentColor(dept)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getDepartmentIcon(dept)}</span>
                  <span className="font-medium capitalize">{dept}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{deptEmployees.length}</div>
                <div className="text-sm text-gray-600">Dipendenti</div>
                <div className="text-lg font-semibold text-gray-700 mt-1">{totalRestDays}</div>
                <div className="text-xs text-gray-500">Giorni riposo totali</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
