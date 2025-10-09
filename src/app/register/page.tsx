'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanyRegistration, EmployeeRegistration, CandidateRegistration } from '@/types/registration'

type RegistrationType = 'company' | 'employee' | 'candidate'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegistration = async (type: RegistrationType, data: any) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/auth/register-${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        alert('Registrazione completata! Ora puoi effettuare il login.')
        router.push('/login')
      } else {
        const error = await response.json().catch(() => ({}))
        alert(`Errore: ${error.error || 'Registrazione fallita'}`)
      }
    } catch (error) {
      alert('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12">
      <div className="container mx-auto px-4">
        {/* Titolo e sottotitolo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🍽️ LA BRIGATA
          </h1>
          <p className="text-2xl text-gray-600">
            Gestione digitale per la ristorazione italiana
          </p>
        </div>
        
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <RegistrationTypeSelector 
              onSelect={(type) => {
                setRegistrationType(type)
                setStep(2)
              }}
              onBack={() => router.push('/')}
            />
          )}
          
          {step === 2 && registrationType === 'company' && (
            <CompanyRegistrationForm 
              onSubmit={(data) => handleRegistration('company', data)}
              onBack={() => setStep(1)}
              loading={loading}
            />
          )}
          
          {step === 2 && registrationType === 'employee' && (
            <EmployeeRegistrationForm 
              onSubmit={(data) => handleRegistration('employee', data)}
              onBack={() => setStep(1)}
              loading={loading}
            />
          )}
          
          {step === 2 && registrationType === 'candidate' && (
            <CandidateRegistrationForm 
              onSubmit={(data) => handleRegistration('candidate', data)}
              onBack={() => setStep(1)}
              loading={loading}
            />
          )}
        </div>
        
        {/* Descrizioni funzionalità */}
        <div className="grid md:grid-cols-4 gap-6 mt-16 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="font-semibold">Gestione Turni</h3>
            <p className="text-sm text-gray-600">AI ottimizzata</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-semibold">Mance Digitali</h3>
            <p className="text-sm text-gray-600">Distribuzione automatica</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">🏖️</div>
            <h3 className="font-semibold">Ferie & Permessi</h3>
            <p className="text-sm text-gray-600">Workflow digitale</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold">Reports</h3>
            <p className="text-sm text-gray-600">Analytics avanzate</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Selettore tipo registrazione
function RegistrationTypeSelector({ onSelect, onBack }: { onSelect: (type: RegistrationType) => void, onBack: () => void }) {
  return (
    <div>
      <div className="relative mb-6">
        <button onClick={onBack} className="absolute left-0 text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </button>
        <h2 className="text-2xl font-bold text-center whitespace-nowrap">Come ti registri?</h2>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={() => onSelect('company')}
          className="w-full p-6 text-center border-2 border-gray-200 rounded-lg hover:border-orange-500 transition"
        >
          <div className="text-xl font-semibold mb-2">🏢 Sono un Ristoratore</div>
          <p className="text-gray-600 text-sm">
            Possiedo o gestisco un ristorante
          </p>
        </button>
        
        <button
          onClick={() => onSelect('employee')}
          className="w-full p-6 text-center border-2 border-gray-200 rounded-lg hover:border-blue-500 transition"
        >
          <div className="text-xl font-semibold mb-2">👥 Lavoro in un Ristorante</div>
          <p className="text-gray-600 text-sm">
            Voglio gestire turni e mance con i colleghi
          </p>
        </button>
        
        <button
          onClick={() => onSelect('candidate')}
          className="w-full p-6 text-center border-2 border-gray-200 rounded-lg hover:border-purple-500 transition"
        >
          <div className="text-xl font-semibold mb-2">🔍 Cerco Lavoro</div>
          <p className="text-gray-600 text-sm">
            Sto cercando impiego nella ristorazione
          </p>
        </button>
      </div>
    </div>
  )
}

// Form registrazione azienda (versione semplificata)
function CompanyRegistrationForm({ onSubmit, onBack, loading }: { onSubmit: (data: CompanyRegistration) => void, onBack: () => void, loading: boolean }) {
  const [formData, setFormData] = useState<CompanyRegistration>({
    companyName: '',
    fiscalCode: '',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: ''
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit(formData)
    }}>
      <div className="relative mb-6">
        <button type="button" onClick={onBack} className="absolute left-0 text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </button>
        <h3 className="text-xl font-semibold text-center">Registrazione Ristorante</h3>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome Ristorante *"
          required
          value={formData.companyName}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
        
        <input
          type="text"
          placeholder="Codice Fiscale/P.IVA *"
          required
          value={formData.fiscalCode}
          onChange={(e) => setFormData({...formData, fiscalCode: e.target.value.toUpperCase()})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
        
        <input
          type="text"
          placeholder="Indirizzo"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
        
        <input
          type="text"
          placeholder="Nome Proprietario *"
          required
          value={formData.ownerName}
          onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
        
        <input
          type="email"
          placeholder="Email Proprietario *"
          required
          value={formData.ownerEmail}
          onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
        
        <input
          type="password"
          placeholder="Password *"
          required
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-6 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Registra Ristorante'}
      </button>
    </form>
  )
}

// Form registrazione dipendente (versione base)
function EmployeeRegistrationForm({ onSubmit, onBack, loading }: { onSubmit: (data: EmployeeRegistration) => void, onBack: () => void, loading: boolean }) {
  const [formData, setFormData] = useState<EmployeeRegistration>({
    name: '',
    email: '',
    phone: '',
    password: '',
    department: 'sala',
    role: 'DIPENDENTE',
    userType: 'EMPLOYEE',
    companyFiscalCode: ''
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit(formData)
    }}>
      <div className="relative mb-6">
        <button type="button" onClick={onBack} className="absolute left-0 text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </button>
        <h3 className="text-xl font-semibold text-center">Registrazione Dipendente</h3>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome Completo *"
          required
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="email"
          placeholder="Email *"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <select
          value={formData.department}
          onChange={(e) => setFormData({...formData, department: e.target.value as any})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="sala">🍽️ Sala</option>
          <option value="cucina">🔥 Cucina</option>
          <option value="bar">🍹 Bar</option>
        </select>
        
        <input
          type="text"
          placeholder="Codice Fiscale Ristorante *"
          required
          value={formData.companyFiscalCode}
          onChange={(e) => setFormData({...formData, companyFiscalCode: e.target.value.toUpperCase()})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          onBlur={async () => {
            const cf = formData.companyFiscalCode.trim()
            if (!cf) return
            try {
              const res = await fetch(`/api/companies?cf=${encodeURIComponent(cf)}`)
              const data = await res.json()
              if (data?.company) {
                alert(`Azienda trovata: ${data.company.name}`)
              } else if (Array.isArray(data?.companies)) {
                const match = data.companies.find((c: any) => (c.fiscalCode || '').toUpperCase() === cf.toUpperCase())
                if (match) alert(`Azienda trovata: ${match.name}`)
              }
            } catch {}
          }}
        />
        
        <input
          type="password"
          placeholder="Password *"
          required
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Registrati'}
      </button>
    </form>
  )
}

// Form registrazione candidato (versione base)
function CandidateRegistrationForm({ onSubmit, onBack, loading }: { onSubmit: (data: CandidateRegistration) => void, onBack: () => void, loading: boolean }) {
  const [formData, setFormData] = useState<CandidateRegistration>({
    name: '',
    email: '',
    phone: '',
    password: '',
    department: 'sala',
    userType: 'CANDIDATE',
    candidateData: {
      experience: [],
      skills: [],
      availability: 'full-time',
      bio: ''
    }
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit(formData)
    }}>
      <div className="relative mb-6">
        <button type="button" onClick={onBack} className="absolute left-0 text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </button>
        <h3 className="text-xl font-semibold text-center">Profilo Candidato</h3>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome Completo *"
          required
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        
        <input
          type="email"
          placeholder="Email *"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        
        <select
          value={formData.department}
          onChange={(e) => setFormData({...formData, department: e.target.value as any})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="sala">🍽️ Sala</option>
          <option value="cucina">🔥 Cucina</option>
          <option value="bar">🍹 Bar</option>
        </select>
        
        <textarea
          placeholder="Presentati brevemente *"
          required
          rows={3}
          value={formData.candidateData.bio}
          onChange={(e) => setFormData({
            ...formData,
            candidateData: { ...formData.candidateData, bio: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        
        <input
          type="password"
          placeholder="Password *"
          required
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
      >
        {loading ? 'Creando profilo...' : 'Crea Profilo'}
      </button>
    </form>
  )
}


