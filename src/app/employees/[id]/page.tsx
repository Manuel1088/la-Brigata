'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Stati
  const [employee, setEmployee] = useState(mockEmployee)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newSkill, setNewSkill] = useState('')

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  // Gestione competenze
  const addSkill = () => {
    if (newSkill.trim() && !employee.skills.includes(newSkill.trim())) {
      setEmployee(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setEmployee(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const addCommonSkill = (skill: string) => {
    if (!employee.skills.includes(skill)) {
      setEmployee(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }))
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // Qui andrà la chiamata API per salvare nel database
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('✅ Dipendente aggiornato con successo!')
      setIsEditing(false)
      setTimeout(() => setMessage(''), 3000)
      
    } catch (error) {
      setMessage('❌ Errore durante il salvataggio')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo dipendente? Questa azione non può essere annullata.')) {
      return
    }

    setIsLoading(true)
    
    try {
      // Qui andrà la chiamata API per eliminare dal database
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('✅ Dipendente eliminato con successo!')
      setTimeout(() => {
        router.push('/employees')
      }, 2000)
      
    } catch (error) {
      setMessage('❌ Errore durante l\'eliminazione')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleActive = async () => {
    setIsLoading(true)
    
    try {
      setEmployee(prev => ({ ...prev, isActive: !prev.isActive }))
      // Qui andrà la chiamata API per aggiornare lo status
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setMessage(`✅ Dipendente ${employee.isActive ? 'disattivato' : 'attivato'} con successo!`)
      setTimeout(() => setMessage(''), 3000)
      
    } catch (error) {
      setMessage('❌ Errore durante l\'aggiornamento')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
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

  const roleInfo = roleConfig[employee.role as keyof typeof roleConfig]
  const departmentInfo = departments[roleInfo?.department as keyof typeof departments]
  const availableSkills = roleInfo ? commonSkills[roleInfo.department as keyof typeof commonSkills] || [] : []

  // Limitazioni: un dipendente può modificare solo il proprio profilo personale
  const isOwner = session?.user?.id === employee.id
  const canEditPersonal = isOwner
  const canEditWork = false // i dati lavorativi restano sola lettura per i dipendenti

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => isOwner ? router.push('/dashboard') : router.push('/employees')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{isOwner ? 'Indietro' : 'Torna ai Dipendenti'}</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                👤 {employee.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {employee.isActive ? 'Attivo' : 'Inattivo'}
              </span>
              <button
                onClick={toggleActive}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg transition ${
                  employee.isActive 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {employee.isActive ? 'Disattiva' : 'Attiva'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Messaggio di stato */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Colonna Sinistra - Profilo */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">{employee.avatar}</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{employee.name}</h2>
                  <p className="text-gray-600 mb-4">{roleInfo?.name}</p>
                  
                  <div className="space-y-2 mb-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                      departmentInfo?.color === 'red' ? 'bg-red-100 text-red-800' :
                      departmentInfo?.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {departmentInfo?.icon} {departmentInfo?.name}
                    </span>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                      roleInfo?.level === 5 ? 'bg-red-100 text-red-800' :
                      roleInfo?.level === 4 ? 'bg-orange-100 text-orange-800' :
                      roleInfo?.level === 3 ? 'bg-yellow-100 text-yellow-800' :
                      roleInfo?.level === 2 ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      Livello {roleInfo?.level} - {roleInfo?.name}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paga Oraria:</span>
                      <span className="font-medium">€{employee.hourlyRate}/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contratto:</span>
                      <span className="font-medium">{employee.contractType === 'full-time' ? 'Full-time' : 'Part-time'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dal:</span>
                      <span className="font-medium">{new Date(employee.startDate).toLocaleDateString('it-IT')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Costo Mensile:</span>
                      <span className="font-medium">€{(employee.hourlyRate * (employee.contractType === 'full-time' ? 160 : 80)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonna Destra - Dettagli */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Informazioni di Contatto */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">📞 Contatti</h3>
                  <button
                    onClick={() => canEditPersonal && setIsEditing(!isEditing)}
                    disabled={!canEditPersonal}
                    className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                  >
                    {isEditing ? 'Annulla' : '✏️ Modifica'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={employee.email}
                        onChange={(e) => setEmployee(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900">{employee.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={employee.phone}
                        onChange={(e) => setEmployee(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900">{employee.phone}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={employee.personalInfo.address}
                        onChange={(e) => setEmployee(prev => ({ 
                          ...prev, 
                          personalInfo: { ...prev.personalInfo, address: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900">{employee.personalInfo.address}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contatto Emergenza</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={employee.personalInfo.emergencyContact}
                        onChange={(e) => setEmployee(prev => ({ 
                          ...prev, 
                          personalInfo: { ...prev.personalInfo, emergencyContact: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900">{employee.personalInfo.emergencyContact}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Competenze */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Competenze</h3>
                
                {/* Competenze Attuali */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                      >
                        {skill}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-orange-600 hover:text-orange-800"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
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
                              disabled={employee.skills.includes(skill)}
                              className={`px-3 py-1 rounded-full text-sm transition ${
                                employee.skills.includes(skill)
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
                    value={employee.notes}
                    onChange={(e) => setEmployee(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Note aggiuntive, valutazioni, obiettivi..."
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{employee.notes}</p>
                )}
              </div>

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
        </div>
      </main>
    </div>
  )
}
