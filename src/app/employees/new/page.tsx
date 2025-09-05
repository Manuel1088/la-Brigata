'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Configurazione ruoli e livelli
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

export default function NewEmployeePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Stati del form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    hourlyRate: '',
    contractType: 'full-time',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    avatar: '👤',
    fiscalCode: '',
    address: '',
    emergencyContact: '',
    notes: '',
    skills: [] as string[]
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newSkill, setNewSkill] = useState('')

  // Redirect se non autenticato o non autorizzato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    // Solo manager e superiori possono aggiungere dipendenti
    const canAdd = ['PROPRIETARIO', 'DIRETTORE', 'MANAGER'].includes(session.user?.role || '')
    if (!canAdd) {
      router.push('/employees')
      return
    }
  }, [session, status, router])

  // Auto-completamento quando si seleziona un ruolo
  const handleRoleChange = (role: string) => {
    if (role && roleConfig[role as keyof typeof roleConfig]) {
      const config = roleConfig[role as keyof typeof roleConfig]
      setFormData(prev => ({
        ...prev,
        role,
        avatar: config.avatar,
        hourlyRate: config.minRate.toString(),
        skills: commonSkills[config.department as keyof typeof commonSkills] || []
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        role,
        avatar: '👤',
        hourlyRate: '',
        skills: []
      }))
    }
  }

  // Gestione competenze
  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const addCommonSkill = (skill: string) => {
    if (!formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }))
    }
  }

  // Validazione
  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage('❌ Nome è obbligatorio')
      return false
    }
    if (!formData.email.trim()) {
      setMessage('❌ Email è obbligatoria')
      return false
    }
    if (!formData.role) {
      setMessage('❌ Ruolo è obbligatorio')
      return false
    }
    if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
      setMessage('❌ Paga oraria deve essere maggiore di 0')
      return false
    }
    
    // Validazione paga vs livello
    if (formData.role && roleConfig[formData.role as keyof typeof roleConfig]) {
      const config = roleConfig[formData.role as keyof typeof roleConfig]
      const rate = parseFloat(formData.hourlyRate)
      if (rate < config.minRate || rate > config.maxRate) {
        setMessage(`❌ Paga oraria per ${config.name} deve essere tra €${config.minRate} e €${config.maxRate}`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    
    try {
      // Qui andrà la chiamata API per salvare nel database
      // Per ora simuliamo il salvataggio
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('✅ Dipendente aggiunto con successo!')
      setTimeout(() => {
        router.push('/employees')
      }, 2000)
      
    } catch (error) {
      setMessage('❌ Errore durante il salvataggio')
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

  const selectedRoleConfig = formData.role ? roleConfig[formData.role as keyof typeof roleConfig] : null
  const availableSkills = selectedRoleConfig ? commonSkills[selectedRoleConfig.department as keyof typeof commonSkills] || [] : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/employees')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Torna ai Dipendenti</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                ➕ Nuovo Dipendente
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
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

          {/* Form */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                📝 Informazioni Dipendente
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Compila tutti i campi obbligatori per aggiungere un nuovo dipendente
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              {/* Sezione Informazioni Base */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">👤 Informazioni Base</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Mario Rossi"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="mario.rossi@brigata.it"
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
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="+39 333 123 4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avatar
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{formData.avatar}</span>
                      <input
                        type="text"
                        value={formData.avatar}
                        onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="👤"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione Lavorativa */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">💼 Informazioni Lavorative</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ruolo *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Seleziona un ruolo</option>
                      {Object.entries(roleConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.avatar} {config.name} (L{config.level} - {departments[config.department as keyof typeof departments].name})
                        </option>
                      ))}
                    </select>
                    {selectedRoleConfig && (
                      <p className="text-sm text-gray-500 mt-1">
                        Range paga suggerito: €{selectedRoleConfig.minRate} - €{selectedRoleConfig.maxRate}/h
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paga Oraria (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="15.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo Contratto
                    </label>
                    <select
                      value={formData.contractType}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {contractTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Inizio
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="form-checkbox h-4 w-4 text-orange-600"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Dipendente attivo
                  </label>
                </div>
              </div>

              {/* Sezione Competenze */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">🎯 Competenze</h3>
                
                {/* Competenze Attuali */}
                {formData.skills.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Competenze Selezionate
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-orange-600 hover:text-orange-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competenze Comuni per il Reparto */}
                {availableSkills.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Competenze Comuni per {selectedRoleConfig?.department}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSkills.map((skill, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => addCommonSkill(skill)}
                          disabled={formData.skills.includes(skill)}
                          className={`px-3 py-1 rounded-full text-sm transition ${
                            formData.skills.includes(skill)
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

              {/* Sezione Informazioni Personali */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">📋 Informazioni Personali</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Codice Fiscale
                    </label>
                    <input
                      type="text"
                      value={formData.fiscalCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, fiscalCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="RSSMRA80A01H501U"
                      maxLength={16}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contatto Emergenza
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Maria Rossi - +39 333 987 6543"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Via Roma 123, 20100 Milano"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Personali
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Note aggiuntive, valutazioni, obiettivi..."
                  />
                </div>
              </div>

              {/* Pulsanti */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => router.push('/employees')}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {isLoading ? 'Salvataggio...' : '💾 Salva Dipendente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
