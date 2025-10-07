'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getLeaveBalances } from '@/lib/leaveSystem'
import type { EmployeeFull } from '@/lib/employees'
import { useCompanyData } from '@/hooks/useCompanyData'
import { useEmployees } from '@/hooks/useEmployees'
import PayrollSection from '@/components/PayrollSection'

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
  
  // Stati
  const [employee, setEmployee] = useState<EmployeeFull>(mockEmployee as unknown as EmployeeFull)
  const [profileReady, setProfileReady] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  // Company data via SWR hook
  const { data: companyResp } = useCompanyData(session?.user?.id)
  const companyData = companyResp?.company as any | undefined
  // Employees via SWR hook (active only)
  const { data: employees } = useEmployees(companyData?.id, true)
  const [newSkill, setNewSkill] = useState('')
  const [workingOwner, setWorkingOwner] = useState(false)
  // Saldi Ferie/ROL
  const [prevVacationCarry, setPrevVacationCarry] = useState<number>(0)
  const [prevRolCarry, setPrevRolCarry] = useState<number>(0)

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  // Carica dipendente da SWR (employees) con fallback alla sessione per utenti registrati
  useEffect(() => {
    if (status === 'loading') return
    try {
      const sessionId = session?.user?.id as string | undefined
      const sessionEmail = session?.user?.email as string | undefined
      if (employees && employees.length > 0) {
        // Cerca dipendente per ID o per email (per utenti che visualizzano il proprio profilo)
        const foundEmployee = employees.find((emp: any) => 
          emp.id === paramId || 
          (paramId === sessionId && emp.email === sessionEmail)
        )
        if (foundEmployee) {
          setEmployee(foundEmployee as EmployeeFull)
          setProfileReady(true)
        } else {
          setMessage('Dipendente non trovato')
        }
      } else {
        // Fallback per utenti registrati che non sono ancora dipendenti
        if (paramId === sessionId) {
          setEmployee({
            ...mockEmployee,
            id: sessionId,
            name: session?.user?.name || 'Utente',
            email: session?.user?.email || '',
          } as EmployeeFull)
          setProfileReady(true)
        } else {
          setMessage('Dipendente non trovato')
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento dipendente:', error)
      setMessage('Errore nel caricamento')
    }
  }, [employees, paramId, session, status])

  // Carica saldi ferie
  useEffect(() => {
    if (profileReady && employee?.id) {
      try {
        const balances = getLeaveBalances(employee?.id || '')
        const vacationBalance = balances.find(b => b.type === 'VACATION')
        const rolBalance = balances.find(b => b.type === 'ROL')
        if (vacationBalance) {
          setPrevVacationCarry(vacationBalance.remaining || 0)
        }
        if (rolBalance) {
          setPrevRolCarry(rolBalance.remaining || 0)
        }
      } catch (error) {
        console.error('Errore nel caricamento saldi ferie:', error)
      }
    }
  }, [profileReady, employee])

  // Gestione salvataggio
  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Qui implementerai la logica di salvataggio
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simula chiamata API
      setIsEditing(false)
      setMessage('Modifiche salvate con successo')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      setMessage('Errore nel salvataggio')
    } finally {
      setIsLoading(false)
    }
  }

  // Gestione eliminazione
  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo dipendente?')) return
    
    setIsLoading(true)
    try {
      // Qui implementerai la logica di eliminazione
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simula chiamata API
      router.push('/team')
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error)
      setMessage('Errore nell\'eliminazione')
    } finally {
      setIsLoading(false)
    }
  }

  // Gestione competenze
  const addSkill = () => {
    if (newSkill.trim() && !employee?.skills?.includes(newSkill.trim())) {
      setEmployee(prev => ({
        ...prev,
        skills: [...(prev?.skills || []), newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setEmployee(prev => ({
      ...prev,
      skills: (prev?.skills || []).filter(s => s !== skill)
    }))
  }

  const addCommonSkill = (skill: string) => {
    if (!employee?.skills?.includes(skill)) {
      setEmployee(prev => ({
        ...prev,
        skills: [...(prev?.skills || []), skill]
      }))
    }
  }

  // Controlli permessi
  const canEditPersonal = employee ? (
    session?.user?.id === employee?.id || 
    (session?.user as any)?.role === 'MANAGER' || 
    (session?.user as any)?.role === 'PROPRIETARIO'
  ) : false

  // Informazioni dipendente
  const roleInfo = roleConfig[employee?.role as keyof typeof roleConfig]
  const departmentInfo = departments[roleInfo?.department as keyof typeof departments]
  const availableSkills = commonSkills[roleInfo?.department as keyof typeof commonSkills] || []

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento profilo...</div>
        </div>
      </div>
    )
  }

  if (!profileReady && message) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl text-gray-700">{message}</div>
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

  // Non renderizzare se employee non è definito
  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-700">Caricamento dipendente...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/team')}
                className="text-gray-500 hover:text-gray-700 transition text-lg"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
                <p className="text-gray-600 mt-1">{roleInfo?.name} • {departmentInfo?.name}</p>
              </div>
            </div>
            
            {canEditPersonal && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {isEditing ? 'Annulla Modifica' : 'Modifica Profilo'}
              </button>
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
                <div className="text-6xl mb-4">{employee?.avatar || '👤'}</div>
                <h2 className="text-xl font-semibold text-gray-900">{employee?.name || 'Nome non disponibile'}</h2>
                <p className="text-gray-600">{employee?.email || 'Email non disponibile'}</p>
                <p className="text-gray-600">{employee?.phone || 'Telefono non disponibile'}</p>
                
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
                  <span className="text-gray-600">Ruolo:</span>
                  <div className="font-medium">{roleInfo?.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tariffa oraria:</span>
                  <div className="font-medium">€{employee?.hourlyRate || 0}/ora</div>
                </div>
                <div>
                  <span className="text-gray-600">Contratto:</span>
                  <div className="font-medium">{contractTypes.find(ct => ct.value === employee?.contractType)?.label}</div>
                </div>
                <div>
                  <span className="text-gray-600">Data assunzione:</span>
                  <div className="font-medium">{employee?.startDate ? new Date(employee.startDate).toLocaleDateString('it-IT') : 'Non disponibile'}</div>
                </div>
              </div>
            </div>

            {/* Saldi Ferie */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏖️ Saldi Ferie</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ferie:</span>
                  <span className="font-medium">20 giorni</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ROL:</span>
                  <span className="font-medium">8 giorni</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Permessi:</span>
                  <span className="font-medium">2 giorni</span>
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
                {employee?.skills?.map(skill => (
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
                            disabled={employee?.skills?.includes(skill)}
                            className={`px-3 py-1 rounded-full text-sm transition ${
                              employee?.skills?.includes(skill)
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
                  value={employee?.notes || ''}
                  onChange={(e) => setEmployee(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Note aggiuntive, valutazioni, obiettivi..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{employee?.notes || 'Nessuna nota disponibile'}</p>
              )}
            </div>

            {/* Sezione Payroll */}
            <PayrollSection />

            {/* Azioni */}
            {isEditing && canEditPersonal && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Salvataggio...' : '💾 Salva Modifiche'}
                  </button>
                </div>
              </div>
            )}

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
