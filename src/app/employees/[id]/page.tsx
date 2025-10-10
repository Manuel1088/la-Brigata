'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { getLeaveBalances } from '@/lib/leaveSystem'
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
  RESPONSABILE_SALA: { name: 'Responsabile Sala', level: 4, department: 'sala', avatar: '👩‍💼', minRate: 18, maxRate: 22 },
  DIPENDENTE_SALA: { name: 'Dipendente Sala', level: 2, department: 'sala', avatar: '👩‍💼', minRate: 12, maxRate: 15 },
  DIPENDENTE_BAR: { name: 'Dipendente Bar', level: 2, department: 'bar', avatar: '👨‍💼', minRate: 12, maxRate: 15 },
  CASSIERE: { name: 'Cassiere', level: 3, department: 'sala', avatar: '👩‍💼', minRate: 15, maxRate: 18 },
  MANAGER: { name: 'Manager', level: 5, department: 'sala', avatar: '👨‍💼', minRate: 22, maxRate: 30 }
}

const departments = {
  cucina: { name: 'Cucina', icon: '🔥', color: 'red' },
  sala: { name: 'Sala', icon: '🍽️', color: 'blue' },
  bar: { name: 'Bar', icon: '🍹', color: 'green' }
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
    setEditedEmployee(employee)
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
          hourlyRate: editedEmployee.hourlyRate,
          contractType: editedEmployee.contractType,
          startDate: editedEmployee.startDate,
          notes: editedEmployee.notes,
          skills: editedEmployee.skills || []
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Errore nel salvataggio')
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
      // TODO: Implementa eliminazione API
      await new Promise(resolve => setTimeout(resolve, 1000))
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
    session?.user?.id === currentEmployee.id || 
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
  const departmentInfo = departments[roleInfo?.department as keyof typeof departments]
  const availableSkills = commonSkills[roleInfo?.department as keyof typeof commonSkills] || []

  return (
    <div className="min-h-screen bg-gray-50">
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
                <p className="text-gray-600 mt-2">{roleInfo?.name} • {departmentInfo?.name}</p>
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
                    <input
                      type="text"
                      value={editedEmployee?.name || ''}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, name: e.target.value}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-semibold"
                      placeholder="Nome"
                    />
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Informazioni Lavorative</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600 block mb-2">Ruolo:</span>
                  {isEditing ? (
                    <select
                      value={editedEmployee?.role || ''}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, role: e.target.value as any}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      {Object.entries(roleConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="font-medium">{roleInfo?.name}</div>
                  )}
                </div>
                <div>
                  <span className="text-gray-600 block mb-2">Tariffa oraria:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedEmployee?.hourlyRate || 0}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, hourlyRate: parseFloat(e.target.value)}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="€/ora"
                    />
                  ) : (
                    <div className="font-medium">€{currentEmployee?.hourlyRate || 0}/ora</div>
                  )}
                </div>
                <div>
                  <span className="text-gray-600 block mb-2">Contratto:</span>
                  {isEditing ? (
                    <select
                      value={editedEmployee?.contractType || 'full-time'}
                      onChange={(e) => setEditedEmployee(prev => prev ? ({...prev, contractType: e.target.value as any}) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      {contractTypes.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="font-medium">{contractTypes.find(ct => ct.value === currentEmployee?.contractType)?.label}</div>
                  )}
                </div>
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
              </div>
            </div>

            {/* Saldi Ferie */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏖️ Ferie e ROL</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ferie Residue</span>
                  <span className="font-medium text-blue-600">{formatNumber(prevVacationCarry)} giorni</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ROL Residui</span>
                  <span className="font-medium text-purple-600">{formatNumber(prevRolCarry)} ore</span>
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
