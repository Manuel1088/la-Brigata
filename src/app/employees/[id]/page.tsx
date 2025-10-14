'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { getLeaveBalances, updateLeaveRemaining } from '@/lib/leaveSystem'
import type { EmployeeFull } from '@/lib/employees'
import { useEmployeeContext } from '@/contexts/EmployeeContext'
import PayrollSection from '@/components/PayrollSection'
import { formatNumber } from '@/lib/formatNumber'

// Configurazione ruoli e livelli (stessa del form nuovo)
const roleConfig = {
  EXECUTIVE_CHEF: { name: 'Executive Chef', level: 5, department: 'cucina', avatar: '👨‍🍳', minRate: 22, maxRate: 30 },
  SOUS_CHEF: { name: 'Sous Chef', level: 4, department: 'cucina', avatar: '👩‍🍳', minRate: 18, maxRate: 22 },
  CHEF_DE_PARTIE: { name: 'Chef de Partie', level: 3, department: 'cucina', avatar: '👨‍🍳', minRate: 15, maxRate: 18 },
  CHEF: { name: 'Chef', level: 3, department: 'cucina', avatar: '👨‍🍳', minRate: 15, maxRate: 18 },
  CAPO_PARTITA: { name: 'Capo Partita', level: 2, department: 'cucina', avatar: '👨‍🍳', minRate: 12, maxRate: 15 },
  RESPONSABILE_SALA: { name: 'Maître', level: 3, department: 'sala', avatar: '👩‍💼', minRate: 18, maxRate: 22 },
  DIPENDENTE_SALA: { name: 'Cameriere', level: 2, department: 'sala', avatar: '👩‍💼', minRate: 12, maxRate: 15 },
  DIPENDENTE_BAR: { name: 'Barista', level: 2, department: 'bar', avatar: '👨‍💼', minRate: 12, maxRate: 15 },
  CASSIERE: { name: 'Cassiere', level: 3, department: 'sala', avatar: '👩‍💼', minRate: 15, maxRate: 18 },
  MANAGER: { name: 'Restaurant Manager', level: 5, department: 'sala', avatar: '👨‍💼', minRate: 22, maxRate: 30 },
  HEAD_SOMMELIER: { name: 'Head Sommelier', level: 3, department: 'bar', avatar: '🍷', minRate: 18, maxRate: 22 },
  SOMMELIER: { name: 'Sommelier', level: 3, department: 'bar', avatar: '🍷', minRate: 16, maxRate: 20 },
  HEAD_BARMAN: { name: 'Head Barman', level: 3, department: 'bar', avatar: '🍸', minRate: 18, maxRate: 22 }
}

// Mansioni definitive (mappate a ruoli esistenti sopra per compatibilità UI)
const mansioniOptions: Array<{ label: string; mapTo: keyof typeof roleConfig; defaultLevel: number }> = [
  { label: 'Direttore', mapTo: 'MANAGER', defaultLevel: 5 },
  { label: 'Restaurant Manager', mapTo: 'MANAGER', defaultLevel: 5 },
  { label: 'Maître', mapTo: 'RESPONSABILE_SALA', defaultLevel: 3 },
  { label: 'Chef de Rang', mapTo: 'DIPENDENTE_SALA', defaultLevel: 4 },
  { label: 'Cameriere', mapTo: 'DIPENDENTE_SALA', defaultLevel: 5 },
  { label: 'Chef', mapTo: 'CHEF', defaultLevel: 2 },
  { label: 'Sous Chef', mapTo: 'SOUS_CHEF', defaultLevel: 3 },
  { label: 'Chef de Partie', mapTo: 'CHEF_DE_PARTIE', defaultLevel: 3 },
  { label: 'Cuoco', mapTo: 'CAPO_PARTITA', defaultLevel: 4 },
  { label: 'Head Barman', mapTo: 'HEAD_BARMAN', defaultLevel: 3 },
  { label: 'Barman', mapTo: 'DIPENDENTE_BAR', defaultLevel: 4 },
  { label: 'Barista', mapTo: 'DIPENDENTE_BAR', defaultLevel: 5 },
  { label: 'Sommelier', mapTo: 'SOMMELIER', defaultLevel: 3 },
  { label: 'Head Sommelier', mapTo: 'HEAD_SOMMELIER', defaultLevel: 3 },
  { label: 'Cassiere/Cassiera', mapTo: 'CASSIERE', defaultLevel: 4 },
  { label: 'Lavapiatti', mapTo: 'DIPENDENTE_SALA', defaultLevel: 6 }
]

const normalizeDepartment = (dep?: string | null): keyof typeof departments | null => {
  if (!dep) return null
  const d = dep.toLowerCase()
  if (d === 'bar') return 'beverage'
  if (d in departments) return d as keyof typeof departments
  return null
}

const departments = {
  cucina: { name: 'Cucina', icon: '🔥', color: 'red' },
  sala: { name: 'Sala', icon: '🍽️', color: 'blue' },
  beverage: { name: 'Beverage', icon: '🍷', color: 'green' },
  accoglienza: { name: 'Accoglienza', icon: '🛎️', color: 'purple' }
}

const contractTypes = [
  { value: 'full-time', label: 'Full-time (160h/mese)' },
  { value: 'part-time', label: 'Part-time (80h/mese)' }
]

const commonSkills = {
  cucina: ['Cucina Italiana', 'Pastry', 'Grill', 'Pasta', 'Sauces', 'Menu Design', 'Cost Control', 'Kitchen Organization', 'Training', 'Quality Control', 'Inventory'],
  sala: ['Customer Service', 'Wine Knowledge', 'Table Service', 'Upselling', 'Reservations', 'Cash Handling', 'Menu Knowledge', 'Allergen Awareness'],
  bar: ['Cocktails', 'Coffee Art', 'Bar Management', 'Inventory', 'Wine Service', 'Customer Relations', 'Cash Handling', 'Menu Knowledge']
}

// Mock data per il dipendente (in produzione verrà dal database)
const mockEmployee = {
  id: '1',
  name: 'Giuseppe Rossi',
  email: 'giuseppe.rossi@brigata.it',
  phone: '+39 333 123 4567',
  role: 'EXECUTIVE_CHEF',
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
}

// CCNL base mensile per livello (colonna 11/2027)
const CCNL_MONTHLY_BASE: Record<string, number> = {
  // Quadri
  QA: 2495.22, // A1
  QB: 2310.11, // B2
  A1: 2495.22,
  B2: 2310.11,
  // Livelli numerici
  '1': 2152.32,
  '2': 1967.20,
  '3': 1855.32,
  '4': 1750.69,
  '5': 1641.85,
  '6S': 1578.72,
  '6': 1556.35,
  '7': 1458.42
}

function getMonthlyBaseForLevel(level: number | string | undefined): number {
  if (!level) return 0
  const key = String(level).toUpperCase()
  return CCNL_MONTHLY_BASE[key] || 0
}

export default function EmployeeDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const paramId = (params?.id as string) || ''
  
  // ✅ USA IL CONTEXT invece degli hook diretti
  const { employees, isLoading: isLoadingEmployees, companyId, mutate } = useEmployeeContext()

  // 🔥 FUNZIONE HELPER per formattare numeri
  const formatNumber = (value: number | undefined | null): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0'
    }
    return value.toString()
  }
  
  // Trova il dipendente dall'API
  const employee = useMemo(() => {
    if (!employees || employees.length === 0) return null
    
    const sessionId = session?.user?.id
    const sessionEmail = session?.user?.email
    
    return employees.find((emp: any) => 
      emp.id === paramId || 
      (paramId === sessionId && emp.email === sessionEmail)
    ) || null
  }, [employees, paramId, session])

  // Stati per l'editing
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [editedEmployee, setEditedEmployee] = useState<EmployeeFull | null>(null)
  const [workingOwner, setWorkingOwner] = useState(false)
  const [editedVacationRemaining, setEditedVacationRemaining] = useState<number>(0)
  const [editedRolRemaining, setEditedRolRemaining] = useState<number>(0)
  const [senioritySteps, setSenioritySteps] = useState<number>(0)
  // Salary increase overrides via localStorage
  const getSalaryIncrease = (userId: string): number => {
    if (typeof window === 'undefined') return 0
    try {
      const raw = localStorage.getItem('salary_increase_overrides_v1')
      if (!raw) return 0
      const map = JSON.parse(raw) as Record<string, number>
      return Number(map[userId] || 0)
    } catch {
      return 0
    }
  }

  const setSalaryIncrease = (userId: string, value: number) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('salary_increase_overrides_v1')
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      map[userId] = Number(value || 0)
      localStorage.setItem('salary_increase_overrides_v1', JSON.stringify(map))
      window.dispatchEvent(new CustomEvent('salary_increase_updated', { detail: { userId } }))
    } catch {}
  }

  // Scatti anzianità (localStorage overrides)
  const getSeniorityStepsOverride = (userId: string): number | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('seniority_steps_overrides_v1')
      if (!raw) return null
      const map = JSON.parse(raw) as Record<string, number>
      return typeof map[userId] === 'number' ? map[userId] : null
    } catch { return null }
  }

  const setSeniorityStepsOverride = (userId: string, value: number) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('seniority_steps_overrides_v1')
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      map[userId] = Number(value || 0)
      localStorage.setItem('seniority_steps_overrides_v1', JSON.stringify(map))
      window.dispatchEvent(new CustomEvent('seniority_steps_updated', { detail: { userId } }))
    } catch {}
  }

  const computeMaxSenioritySteps = (startDate?: string | null): number => {
    if (!startDate) return 0
    const start = new Date(startDate)
    if (Number.isNaN(start.getTime())) return 0
    const now = new Date()
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return Math.max(0, Math.floor(years / 3))
  }
  // Saldi Ferie - calcola solo quando employee cambia
  const { prevVacationCarry, prevRolCarry } = useMemo(() => {
    if (!employee?.id) return { prevVacationCarry: 0, prevRolCarry: 0 }
    
    try {
      const balances = getLeaveBalances(employee.id)
      const vacationBalance = balances.find(b => b.type === 'VACATION')
      const rolBalance = balances.find(b => b.type === 'ROL')
      
      return {
        prevVacationCarry: vacationBalance?.remaining ?? 0, // ✅ Usa ?? invece di ||
        prevRolCarry: rolBalance?.remaining ?? 0
      }
    } catch (error) {
      console.error('Errore nel caricamento saldi ferie:', error)
      return { prevVacationCarry: 0, prevRolCarry: 0 }
    }
  }, [employee?.id])

  // Quando entri in modalità editing, copia i dati
  const handleEditMode = () => {
    const localInc = employee?.id ? getSalaryIncrease(employee.id) : 0
    setEditedEmployee(employee ? ({ ...(employee as any), monthlyIncrease: localInc }) : employee)
    setEditedVacationRemaining(prevVacationCarry)
    setEditedRolRemaining(prevRolCarry)
    const stepsOv = employee?.id ? getSeniorityStepsOverride(employee.id) : null
    const maxSteps = computeMaxSenioritySteps(employee?.startDate as any)
    setSenioritySteps(Math.min(stepsOv ?? 0, maxSteps))
    setIsEditing(true)
  }

  // Quando esci dalla modalità editing
  const handleCancelEdit = () => {
    setEditedEmployee(null)
    setIsEditing(false)
  }


  // Gestione salvataggio
  const handleSave = async () => {
    if (!editedEmployee) return
    
    setIsLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editedEmployee.id,
          name: editedEmployee.name,
          email: editedEmployee.email,
          phone: editedEmployee.phone,
          role: editedEmployee.role,
          department: (editedEmployee as any)?.department,
          monthlyIncrease: (editedEmployee as any)?.monthlyIncrease || 0,
          baseSalary: getMonthlyBaseForLevel((editedEmployee as any)?.level ?? roleInfo?.level),
          level: (editedEmployee as any)?.level ?? roleInfo?.level,
          contractType: editedEmployee.contractType,
          contractTypeEnum: (editedEmployee as any)?.contractTypeEnum,
          startDate: editedEmployee.startDate,
          employmentStartDate: editedEmployee.startDate,
          employmentEndDate: (editedEmployee as any)?.employmentEndDate || undefined,
          notes: editedEmployee.notes,
          skills: editedEmployee.skills || [],
          weeklyHours: (editedEmployee as any)?.weeklyHours || 0
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Errore nel salvataggio')
      }

      // Persisti overrides locali
      if (editedEmployee.id) {
        setSalaryIncrease(editedEmployee.id, Number((editedEmployee as any)?.monthlyIncrease || 0))
        updateLeaveRemaining(editedEmployee.id, 'VACATION', Number(editedVacationRemaining || 0))
        updateLeaveRemaining(editedEmployee.id, 'ROL', Number(editedRolRemaining || 0))
        setSeniorityStepsOverride(editedEmployee.id, Number(senioritySteps || 0))
      }
      
      // Aggiorna il Context
      if (mutate) {
        await mutate()
      }
      
      setMessage('✅ Modifiche salvate con successo!')
      setIsEditing(false)
      setEditedEmployee(null)
      
      // Ricarica la pagina
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      setMessage(`❌ Errore nel salvataggio`)
    } finally {
      setIsLoading(false)
    }
  }

  // Gestione eliminazione
  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo dipendente?')) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employee?.id })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Errore eliminazione')
      }

      // Aggiorna elenco dipendenti
      if (mutate) {
        await mutate()
      }
      // Determina dove tornare dopo l'eliminazione
      const isOwnProfile = session?.user?.id === employee?.id
      router.push(isOwnProfile ? '/dashboard' : '/team')
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error)
      setMessage('Errore nell\'eliminazione')
    } finally {
      setIsLoading(false)
    }
  }

  // Gestione competenze
  const addSkill = () => {
    if (newSkill.trim() && !editedEmployee?.skills?.includes(newSkill.trim())) {
      setEditedEmployee(prev => prev ? ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()]
      }) : null)
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setEditedEmployee(prev => prev ? ({
      ...prev,
      skills: (prev.skills || []).filter(s => s !== skill)
    }) : null)
  }

  const addCommonSkill = (skill: string) => {
    if (!editedEmployee?.skills?.includes(skill)) {
      setEditedEmployee(prev => prev ? ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }) : null)
    }
  }

  const mapRoleToDepartment = (roleKey: keyof typeof roleConfig): keyof typeof departments => {
    if (roleKey === 'SOMMELIER' || roleKey === 'HEAD_SOMMELIER' || roleKey === 'HEAD_BARMAN' || roleKey === 'DIPENDENTE_BAR') return 'beverage'
    if (roleKey === 'CASSIERE') return 'accoglienza'
    const base = roleConfig[roleKey]?.department || 'sala'
    return (base === 'bar' ? 'beverage' : base) as keyof typeof departments
  }

  // Loading states
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento autenticazione...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  // Mostra loading solo mentre carica dall'API
  if (isLoadingEmployees) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento profilo...</div>
          <p className="text-sm text-gray-500 mt-2">Recupero dati dipendente...</p>
        </div>
      </div>
    )
  }

  // Se non trova il dipendente, mostra errore
  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl text-gray-700">Dipendente non trovato</div>
          <button
            onClick={() => router.push('/team')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Torna al Team
          </button>
        </div>
      </div>
    )
  }

  // Usa editedEmployee quando sei in editing, altrimenti employee
  const currentEmployee = isEditing && editedEmployee ? editedEmployee : employee

  // Controlli permessi
  const canEditPersonal = (
    (session?.user as any)?.role === 'MANAGER' || 
    (session?.user as any)?.role === 'PROPRIETARIO'
  )

  // Gestione navigazione indietro intelligente
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back() // Torna alla pagina precedente
    } else {
      router.push('/dashboard') // Fallback sicuro
    }
  }

  // Informazioni dipendente
  const roleInfo = roleConfig[currentEmployee.role as keyof typeof roleConfig]
  const deptKey = normalizeDepartment((currentEmployee as any)?.department) || normalizeDepartment(roleInfo?.department as any)
  const departmentInfo = deptKey ? departments[deptKey] : undefined
  const availableSkills = commonSkills[roleInfo?.department as keyof typeof commonSkills] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-4">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
                title="Torna indietro"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">👤 {currentEmployee.name}</h1>
                <p className="text-gray-600 mt-2">{roleInfo?.name} • {departmentInfo?.name || 'Da assegnare'}</p>
              </div>
            </div>
            
            {canEditPersonal && (
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                    >
                      {isLoading ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditMode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Modifica Profilo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informazioni Principali */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profilo */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">{currentEmployee?.avatar || '👤'}</div>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        defaultValue={(() => {
                          const parts = (editedEmployee?.name || '').split(' ')
                          return parts.slice(0, -1).join(' ')
                        })()}
                        onBlur={(e) => {
                          const first = e.target.value.trim()
                          const last = ((editedEmployee?.name || '').split(' ').slice(-1)[0]) || ''
                          setEditedEmployee(prev => prev ? ({...prev, name: `${first} ${last}`.trim()}) : null)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-semibold"
                        placeholder="Nome"
                      />
                      <input
                        type="text"
                        defaultValue={(() => {
                          const parts = (editedEmployee?.name || '').split(' ')
                          return parts.slice(-1)[0] || ''
                        })()}
                        onBlur={(e) => {
                          const last = e.target.value.trim()
                          const first = ((editedEmployee?.name || '').split(' ').slice(0, -1).join(' ')) || ''
                          setEditedEmployee(prev => prev ? ({...prev, name: `${first} ${last}`.trim()}) : null)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-semibold"
                        placeholder="Cognome"
                      />
                    </div>
                    <input
                      type="email"
                      value={editedEmployee?.email || ''}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, email: e.target.value}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={editedEmployee?.phone || ''}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, phone: e.target.value}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center"
                      placeholder="Telefono"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-gray-900">{currentEmployee?.name || 'Nome non disponibile'}</h2>
                    <p className="text-gray-600">{currentEmployee?.email || 'Email non disponibile'}</p>
                    <p className="text-gray-600">{currentEmployee?.phone || 'Telefono non disponibile'}</p>
                  </>
                )}
                
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    departmentInfo?.color === 'red' ? 'bg-red-100 text-red-800' :
                    departmentInfo?.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {departmentInfo?.icon} {departmentInfo?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Informazioni Lavorative */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Profilo Dipendente</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-600 block mb-2">Mansione:</span>
                    {isEditing ? (
                      <select
                        value={editedEmployee?.role || ''}
                        onChange={(e) => {
                          const mapTo = e.target.value as keyof typeof roleConfig
                          const found = mansioniOptions.find(m => m.mapTo === mapTo)
                          const nextLevel = found?.defaultLevel ?? (editedEmployee as any)?.level
                          const nextDept = mapRoleToDepartment(mapTo)
                          setEditedEmployee(prev => prev ? ({...prev, role: mapTo as any, level: nextLevel as any, department: nextDept as any}) : null)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        {mansioniOptions.map(opt => (
                          <option key={opt.label + opt.mapTo} value={opt.mapTo}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="font-medium">{roleInfo?.name}</div>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-2">Livello:</span>
                    {isEditing ? (
                      <>
                        <select
                          value={(editedEmployee as any)?.level ?? roleInfo?.level ?? ''}
                          onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, level: parseInt(e.target.value)}) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Seleziona livello</option>
                          {[1,2,3,4,5,6,7].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        {(() => {
                          const currentRole = (editedEmployee?.role as keyof typeof roleConfig) || (currentEmployee.role as keyof typeof roleConfig)
                          const suggested = mansioniOptions.find(m => m.mapTo === currentRole)?.defaultLevel
                          const currentLevel = (editedEmployee as any)?.level ?? roleConfig[currentRole]?.level
                          if (!suggested || suggested === currentLevel) return null
                          return (
                            <div className="mt-2 text-xs">
                              <span className="text-gray-600 mr-2">Suggerito:</span>
                              <button type="button" onClick={() => setEditedEmployee(prev => prev ? ({...prev, level: suggested as any}) : null)} className="px-2 py-1 border rounded">{suggested}</button>
                            </div>
                          )
                        })()}
                      </>
                    ) : (
                      <div className="font-medium">{(currentEmployee as any)?.level ?? roleInfo?.level ?? '-'}</div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 block mb-2">Reparto:</span>
                  {isEditing ? (
                    <select
                      value={normalizeDepartment((editedEmployee as any)?.department) || deptKey || ''}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, department: e.target.value as any}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seleziona reparto</option>
                      <option value="cucina">Cucina</option>
                      <option value="sala">Sala</option>
                      <option value="beverage">Beverage</option>
                      <option value="accoglienza">Accoglienza</option>
                    </select>
                  ) : (
                    <div className="font-medium">{departmentInfo?.name || 'Da assegnare'}</div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-600 block mb-2">Paga base</span>
                    {(() => {
                      const levelForCalc = (isEditing ? (editedEmployee as any)?.level : (currentEmployee as any)?.level) || roleInfo?.level
                      const baseFromLevel = getMonthlyBaseForLevel(levelForCalc)
                      const baseUsed = (currentEmployee as any)?.baseSalary || baseFromLevel
                      const currentInc = currentEmployee?.id ? getSalaryIncrease(currentEmployee.id) : ((currentEmployee as any)?.monthlyIncrease || 0)
                      const totalView = Math.max(0, baseUsed + currentInc)
                      if (!isEditing) {
                        return (
                          <div className="font-semibold text-lg">€{totalView}</div>
                        )
                      }
                      const totalEdit = Math.max(0, ((editedEmployee as any)?.monthlyIncrease || 0) + baseFromLevel)
                      return (
                        <input
                          type="number"
                          step="1"
                          value={totalEdit}
                          onChange={(e) => {
                            const newTotal = parseFloat(e.target.value || '0')
                            const newInc = Math.max(0, newTotal - baseFromLevel)
                            setEditedEmployee(prev => prev ? ({ ...prev, monthlyIncrease: newInc }) : null)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="€"
                        />
                      )
                    })()}
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-2">Scatti anzianità</span>
                    {(() => {
                      const start = (isEditing ? editedEmployee?.startDate : currentEmployee?.startDate) || null
                      const maxSteps = computeMaxSenioritySteps(start as any)
                      const viewSteps = (() => {
                        const ov = currentEmployee?.id ? getSeniorityStepsOverride(currentEmployee.id) : null
                        const val = (isEditing ? senioritySteps : (ov ?? 0))
                        return Math.min(val, maxSteps)
                      })()
                      if (!isEditing) {
                        return (
                          <div className="font-medium">{viewSteps}</div>
                        )
                      }
                      return (
                        <input
                          type="number"
                          step="1"
                          min={0}
                          max={maxSteps}
                          value={senioritySteps}
                          onChange={(e) => {
                            const v = parseInt(e.target.value || '0')
                            const clamped = Math.max(0, Math.min(maxSteps, Number.isNaN(v) ? 0 : v))
                            setSenioritySteps(clamped)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder={`0 .. ${maxSteps}`}
                        />
                      )
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-600 block mb-2">Contratto:</span>
                    {isEditing ? (
                      <select
                        value={(editedEmployee as any)?.contractTypeEnum || (currentEmployee as any)?.contractTypeEnum || 'INDETERMINATO'}
                        onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, contractTypeEnum: e.target.value as any}) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="INDETERMINATO">Indeterminato</option>
                        <option value="DETERMINATO">Determinato</option>
                      </select>
                    ) : (
                      <div className="font-medium">
                        {(currentEmployee as any)?.contractTypeEnum === 'DETERMINATO' ? 'Determinato' : 'Indeterminato'}
                      </div>
                    )}
                  </div>
                  <div>
                    {isEditing ? (
                      <select
                        value={editedEmployee?.contractType || 'full-time'}
                        onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, contractType: e.target.value as any}) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                      </select>
                    ) : (
                      <div className="font-medium">{currentEmployee?.contractType === 'part-time' ? 'Part-time' : 'Full-time'}</div>
                    )}
                    <div className="mt-2">
                      {isEditing ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="1"
                            value={(() => {
                              const regime = editedEmployee?.contractType || 'full-time'
                              if (regime === 'full-time') return 40
                              return (editedEmployee as any)?.weeklyHours ?? ''
                            })()}
                            onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, weeklyHours: parseInt(e.target.value || '0')}) : null)}
                            disabled={(editedEmployee?.contractType || 'full-time') === 'full-time'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="es. 40"
                          />
                          <span className="ml-2 text-gray-500 whitespace-nowrap">/ ore settimanali</span>
                        </div>
                      ) : (
                        <div className="flex items-center font-medium">
                          <span>{(() => {
                            const regime = currentEmployee?.contractType || 'full-time'
                            if (regime === 'full-time') return 40
                            return (currentEmployee as any)?.weeklyHours ?? '—'
                          })()}</span>
                          <span className="ml-2 text-gray-500 text-sm">/ ore settimanali</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-600 block mb-2">Data assunzione:</span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedEmployee?.startDate || ''}
                        onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, startDate: e.target.value}) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="font-medium">{currentEmployee?.startDate ? new Date(currentEmployee.startDate).toLocaleDateString('it-IT') : 'Non disponibile'}</div>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-2">Fine contratto:</span>
                    {isEditing ? (
                      ((editedEmployee as any)?.contractTypeEnum === 'DETERMINATO') ? (
                        <input
                          type="date"
                          value={(editedEmployee as any)?.employmentEndDate || ''}
                          onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, employmentEndDate: e.target.value as any}) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value="—"
                          disabled
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
                        />
                      )
                    ) : (
                      <div className="font-medium">{(currentEmployee as any)?.employmentEndDate ? new Date((currentEmployee as any).employmentEndDate).toLocaleDateString('it-IT') : '—'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Saldi Ferie */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏖️ Ferie e ROL</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ferie Residue</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="1"
                      value={editedVacationRemaining}
                      onChange={(e) => setEditedVacationRemaining(parseInt(e.target.value || '0'))}
                      className="w-24 px-2 py-1 border rounded text-right"
                    />
                  ) : (
                    <span className="font-medium text-blue-600">{formatNumber(prevVacationCarry)} giorni</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ROL Residui</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="1"
                      value={editedRolRemaining}
                      onChange={(e) => setEditedRolRemaining(parseInt(e.target.value || '0'))}
                      className="w-24 px-2 py-1 border rounded text-right"
                    />
                  ) : (
                    <span className="font-medium text-purple-600">{formatNumber(prevRolCarry)} ore</span>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <button
                    onClick={() => router.push(`/team?tab=leaves&employeeId=${employee.id}`)}
                    className="w-full text-blue-600 hover:text-blue-800 transition text-sm font-medium"
                  >
                    Visualizza Dettagli Ferie
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contenuto Principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Competenze */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Competenze</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {currentEmployee?.skills?.map(skill => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    {isEditing && canEditPersonal && (
                      <button
                        onClick={() => removeSkill(skill)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Aggiungi Competenze (solo in modalità editing) */}
              {isEditing && canEditPersonal && (
                <div className="space-y-4">
                  {/* Competenze Comuni */}
                  {availableSkills.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Competenze Comuni per {departmentInfo?.name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableSkills.map((skill, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => addCommonSkill(skill)}
                            disabled={editedEmployee?.skills?.includes(skill)}
                            className={`px-3 py-1 rounded-full text-sm transition ${
                              editedEmployee?.skills?.includes(skill)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aggiungi Competenza Personalizzata */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aggiungi Competenza Personalizzata
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Es. Gestione Inventario"
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Note</h3>
              {isEditing ? (
                <textarea
                  value={editedEmployee?.notes || ''}
                  onChange={(e) => setEditedEmployee(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Note aggiuntive, valutazioni, obiettivi..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{currentEmployee?.notes || 'Nessuna nota disponibile'}</p>
              )}
            </div>

            {/* Sezione Payroll */}
            <PayrollSection />

            {/* Azioni di Eliminazione */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Zona Pericolosa</h3>
              <p className="text-gray-600 mb-4">
                L'eliminazione di un dipendente rimuoverà permanentemente tutti i suoi dati dal sistema.
              </p>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isLoading ? 'Eliminazione...' : '🗑️ Elimina Dipendente'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
