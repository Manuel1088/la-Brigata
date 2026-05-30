'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanyRegistration, EmployeeRegistration, CandidateRegistration } from '@/types/registration'

type RegistrationType = 'company' | 'employee' | 'candidate'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Overload-like typed handler (single implementation with union types)
  async function handleRegistration(
    type: RegistrationType,
    data: CompanyRegistration | EmployeeRegistration | CandidateRegistration
  ): Promise<void> {
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
          <h1 className="text-6xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-5">
            <img src="/laBrigata.it.svg" alt="La Brigata" className="h-20 w-auto shrink-0" />
            <span className="font-bold text-gray-900">La Brigata</span>
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
    ownerRole: 'PROPRIETARIO_LAVORATORE',
    password: ''
  })
  const [ownerFirstName, setOwnerFirstName] = useState('')
  const [ownerLastName, setOwnerLastName] = useState('')

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nome *"
            required
            value={ownerFirstName}
            onChange={(e) => {
              const val = e.target.value
              setOwnerFirstName(val)
              setFormData({ ...formData, ownerName: `${val} ${ownerLastName}`.trim() })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            placeholder="Cognome *"
            required
            value={ownerLastName}
            onChange={(e) => {
              const val = e.target.value
              setOwnerLastName(val)
              setFormData({ ...formData, ownerName: `${ownerFirstName} ${val}`.trim() })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <select
          value={formData.ownerRole}
          onChange={(e) => setFormData({
            ...formData,
            ownerRole: e.target.value as CompanyRegistration['ownerRole']
          })}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white appearance-none cursor-pointer h-[42px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1.25rem'
          }}
          required
        >
          <option value="PROPRIETARIO_LAVORATORE">Proprietario Lavoratore</option>
          <option value="PROPRIETARIO_NON_LAVORATORE">Proprietario non Lavoratore</option>
          <option value="GENERAL_MANAGER">General Manager</option>
        </select>
        
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
    position: '',
    department: 'sala',
    role: 'DIPENDENTE',
    userType: 'EMPLOYEE',
    companyFiscalCode: '',
    level: ''
  })
  const [employeeFirstName, setEmployeeFirstName] = useState('')
  const [employeeLastName, setEmployeeLastName] = useState('')

  type LookupStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'invalid'
  const [companyLookupStatus, setCompanyLookupStatus] = useState<LookupStatus>('idle')
  const [companyLookup, setCompanyLookup] = useState<{ companyName: string; restaurantName: string | null; colleaguesCount: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Normalizzazione P.IVA: rimuovi spazi, prefisso IT, uppercase → 11 cifre
  const normalizeVat = (raw: string) => raw.replace(/\s+/g, '').replace(/^IT/i, '').toUpperCase()

  const runCompanyLookup = async (raw: string) => {
    const vat = normalizeVat(raw)
    if (!/^\d{11}$/.test(vat)) {
      setCompanyLookup(null)
      setCompanyLookupStatus(vat.length > 0 ? 'invalid' : 'idle')
      return
    }
    setCompanyLookupStatus('loading')
    try {
      const res = await fetch(`/api/companies/lookup?vat=${encodeURIComponent(vat)}`)
      const data = await res.json()
      if (res.ok && data.found) {
        setCompanyLookup({
          companyName: data.companyName,
          restaurantName: data.restaurantName ?? null,
          colleaguesCount: data.colleaguesCount ?? 0,
        })
        setCompanyLookupStatus('found')
        // Auto-compila Nome Azienda con la sede (o ragione sociale) trovata
        setFormData(prev => ({ ...prev, companyName: data.restaurantName || data.companyName }))
      } else {
        setCompanyLookup(null)
        setCompanyLookupStatus('notfound')
      }
    } catch {
      setCompanyLookupStatus('idle')
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      if (!formData.level) {
        alert('Seleziona il livello')
        return
      }
      onSubmit(formData)
    }}>
      <div className="relative mb-6">
        <button type="button" onClick={onBack} className="absolute left-0 text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </button>
        <h3 className="text-xl font-semibold text-center">Registrazione Dipendente</h3>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nome *"
            required
            value={employeeFirstName}
            onChange={(e) => {
              const val = e.target.value
              setEmployeeFirstName(val)
              setFormData({ ...formData, name: `${val} ${employeeLastName}`.trim() })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Cognome *"
            required
            value={employeeLastName}
            onChange={(e) => {
              const val = e.target.value
              setEmployeeLastName(val)
              setFormData({ ...formData, name: `${employeeFirstName} ${val}`.trim() })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <input
          type="email"
          placeholder="Email *"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Nome Azienda"
          value={formData.companyName || ''}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
          readOnly={companyLookupStatus === 'found'}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${companyLookupStatus === 'found' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mansione</label>
            <select
              value={formData.position || ''}
              onChange={(e) => {
                const pos = e.target.value
                const dept: EmployeeRegistration['department'] = pos.includes('Chef') || pos.includes('Cuoco') ? 'cucina'
                  : (pos.includes('Bar') || pos.includes('Barman') || pos.includes('Sommelier')) ? 'beverage'
                  : (pos.includes('Cassier') || pos.includes('Hostes') || pos.includes('Hostess')) ? 'accoglienza'
                  : (pos.includes('Dirett') || pos.includes('Manager')) ? 'dirigenti'
                  : pos.includes('Lavapiatti') ? 'sala' : 'sala'
                const level = pos.includes('Direttore') ? 'QA'
                  : pos.includes('Restaurant Manager') ? 'QB'
                  : pos.includes('Head Sommelier') ? '3'
                  : pos.includes('Sommelier') ? '3'
                  : pos.includes('Head Barman') ? '3'
                  : pos.includes('Barman') ? '4'
                  : pos.includes('Barista') ? '5'
                  : pos.includes('Chef de Rang') ? '4'
                  : pos.includes('Chef') ? '2'
                  : pos.includes('Sous Chef') ? '3'
                  : pos.includes('Cuoco') ? '4'
                  : pos.includes('Cassier') ? '4'
                  : (pos.includes('Hostes') || pos.includes('Hostess')) ? '5'
                  : pos.includes('Lavapiatti') ? '6'
                  : '6S'
                setFormData({ ...formData, position: pos, department: dept, level })
              }}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer h-[42px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem'
              }}
            >
              <option value="">Seleziona mansione</option>
              <option value="Direttore">Dirigente / Direttore</option>
              <option value="Restaurant Manager">Restaurant Manager</option>
              <option value="Chef">Chef</option>
              <option value="Sous Chef">Sous Chef</option>
              <option value="Cuoco">Cuoco</option>
              <option value="Cameriere">Cameriere</option>
              <option value="Maître">Maître</option>
              <option value="Chef de Rang">Chef de Rang</option>
              <option value="Sommelier">Sommelier</option>
              <option value="Head Sommelier">Head Sommelier</option>
              <option value="Head Barman">Head Barman</option>
              <option value="Barman">Barman</option>
              <option value="Barista">Barista</option>
              <option value="Lavapiatti">Lavapiatti</option>
              <option value="Cassiere">Cassiere/Cassiera</option>
              <option value="Hostess">Hostess / Host</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Livello</label>
            <select
              value={formData.level || ''}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer h-[42px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem'
              }}
              required
            >
              <option value="">Seleziona livello</option>
              <option value="QA">Quadro A (Direttivo)</option>
              <option value="QB">Quadro B (Direttivo)</option>
              <option value="1">Primo Livello</option>
              <option value="2">Secondo Livello</option>
              <option value="3">Terzo Livello</option>
              <option value="4">Quarto Livello</option>
              <option value="5">Quinto Livello</option>
              <option value="6">Sesto Livello</option>
              <option value="6S">Sesto Livello S</option>
              <option value="7">Settimo Livello</option>
            </select>
            
            {(formData.position || '').includes('Cassier') && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600 mr-2">Consigliato:</span>
                <button type="button" onClick={() => setFormData({ ...formData, level: '4' })} className="px-2 py-1 border rounded mr-1">4</button>
                <button type="button" onClick={() => setFormData({ ...formData, level: '5' })} className="px-2 py-1 border rounded">5</button>
              </div>
            )}
            {(((formData.position || '').includes('Hostes')) || ((formData.position || '').includes('Hostess'))) && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600 mr-2">Consigliato:</span>
                <button type="button" onClick={() => setFormData({ ...formData, level: '5' })} className="px-2 py-1 border rounded mr-1">5</button>
                <button type="button" onClick={() => setFormData({ ...formData, level: '6' })} className="px-2 py-1 border rounded">6</button>
              </div>
            )}
            {(formData.position || '').includes('Lavapiatti') && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600 mr-2">Consigliato:</span>
                <button type="button" onClick={() => setFormData({ ...formData, level: '6' })} className="px-2 py-1 border rounded mr-1">6</button>
                <button type="button" onClick={() => setFormData({ ...formData, level: '6S' })} className="px-2 py-1 border rounded">6S</button>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <input
            type="text"
            placeholder="Codice Fiscale Ristorante *"
            required
            value={formData.companyFiscalCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase()
              setFormData({ ...formData, companyFiscalCode: val })
              if (debounceRef.current) clearTimeout(debounceRef.current)
              const vat = normalizeVat(val)
              if (/^\d{11}$/.test(vat)) {
                debounceRef.current = setTimeout(() => runCompanyLookup(val), 600)
              } else {
                setCompanyLookup(null)
                setCompanyLookupStatus(vat.length > 0 ? 'invalid' : 'idle')
              }
            }}
            onBlur={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              runCompanyLookup(formData.companyFiscalCode)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {companyLookupStatus === 'loading' && (
            <p className="mt-1 text-sm text-gray-500">Ricerca azienda...</p>
          )}
          {companyLookupStatus === 'invalid' && (
            <p className="mt-1 text-xs text-amber-600">Formato P.IVA non valido</p>
          )}
          {companyLookupStatus === 'found' && companyLookup && (
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              ✅ Azienda trovata: <span className="font-medium">{companyLookup.restaurantName || companyLookup.companyName}</span> — {companyLookup.colleaguesCount} {companyLookup.colleaguesCount === 1 ? 'collega' : 'colleghi'} già registrati
            </div>
          )}
          {companyLookupStatus === 'notfound' && (
            <p className="mt-2 text-sm text-gray-600">📝 Sarai il primo del tuo ristorante!</p>
          )}
        </div>
        
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
    position: '',
    department: 'sala',
    userType: 'CANDIDATE',
    candidateData: {
      experience: [],
      skills: [],
      availability: 'full-time',
      bio: ''
    }
  })
  const [candidateFirstName, setCandidateFirstName] = useState('')
  const [candidateLastName, setCandidateLastName] = useState('')

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nome *"
            required
            value={candidateFirstName}
            onChange={(e) => {
              const val = e.target.value
              setCandidateFirstName(val)
              setFormData({ ...formData, name: `${val} ${candidateLastName}`.trim() })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Cognome *"
            required
            value={candidateLastName}
            onChange={(e) => {
              const val = e.target.value
              setCandidateLastName(val)
              setFormData({ ...formData, name: `${candidateFirstName} ${val}`.trim() })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <input
          type="email"
          placeholder="Email *"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mansione desiderata</label>
            <select
              value={formData.position || ''}
              onChange={(e) => {
                const pos = e.target.value
                const dept = pos.includes('Chef') || pos.includes('Cuoco') ? 'cucina'
                  : pos.includes('Bar') || pos.includes('Barman') ? 'beverage'
                  : pos.includes('Sommelier') ? 'beverage'
                  : pos.includes('Cassier') || pos.includes('Hostes') || pos.includes('Hostess') ? 'accoglienza'
                  : pos.includes('Dirett') || pos.includes('Manager') ? 'dirigenti'
                  : pos.includes('Lavapiatti') ? 'sala' : 'sala'
                const level = pos.includes('Direttore') ? 'QA'
                  : pos.includes('Restaurant Manager') ? 'QB'
                  : pos.includes('Head Sommelier') ? '3'
                  : pos.includes('Sommelier') ? '3'
                  : pos.includes('Head Barman') ? '3'
                  : pos.includes('Barman') ? '4'
                  : pos.includes('Barista') ? '5'
                  : pos.includes('Chef de Rang') ? '4'
                  : pos.includes('Chef') ? '2'
                  : pos.includes('Sous Chef') ? '3'
                  : pos.includes('Cuoco') ? '4'
                  : pos.includes('Cassier') ? '4'
                  : (pos.includes('Hostes') || pos.includes('Hostess')) ? '5'
                  : pos.includes('Lavapiatti') ? '6'
                  : undefined
                setFormData({ ...formData, position: pos, department: dept, level })
              }}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white appearance-none cursor-pointer h-[42px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem'
              }}
            >
              <option value="">Seleziona mansione</option>
              <option value="Direttore">Dirigente / Direttore</option>
              <option value="Restaurant Manager">Restaurant Manager</option>
              <option value="Chef">Chef</option>
              <option value="Sous Chef">Sous Chef</option>
              <option value="Cuoco">Cuoco</option>
              <option value="Cameriere">Cameriere</option>
              <option value="Maître">Maître</option>
              <option value="Chef de Rang">Chef de Rang</option>
              <option value="Sommelier">Sommelier</option>
              <option value="Head Sommelier">Head Sommelier</option>
              <option value="Head Barman">Head Barman</option>
              <option value="Barman">Barman</option>
              <option value="Barista">Barista</option>
              <option value="Lavapiatti">Lavapiatti</option>
              <option value="Cassiere">Cassiere/Cassiera</option>
              <option value="Hostess">Hostess / Host</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Livello desiderato</label>
            <select
              value={formData.level || ''}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white appearance-none cursor-pointer h-[42px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem'
              }}
            >
              <option value="">Seleziona livello</option>
              <option value="QA">Quadro A (Direttivo)</option>
              <option value="QB">Quadro B (Direttivo)</option>
              <option value="1">Primo Livello</option>
              <option value="2">Secondo Livello</option>
              <option value="3">Terzo Livello</option>
              <option value="4">Quarto Livello</option>
              <option value="5">Quinto Livello</option>
              <option value="6">Sesto Livello</option>
              <option value="6S">Sesto Livello S</option>
              <option value="7">Settimo Livello</option>
            </select>
            <details className="mt-2 text-xs text-gray-600">
              <summary className="cursor-pointer text-gray-700">Come funzionano i livelli?</summary>
              <div className="mt-1 space-y-1">
                <div>QA/QB: ruoli direttivi con responsabilità generali/specifiche.</div>
                <div>1: alta professionalità e autonomia.</div>
                <div>2: iniziativa e autonomia entro direttive generali.</div>
                <div>3: mansioni di concetto, competenze tecniche.</div>
                <div>4: amministrative/tecnico-pratiche/vendita.</div>
                <div>5: esecutive con preparazione pratica.</div>
                <div>6: addestramento normale, basi professionali.</div>
                <div>6S: intermedio con competenze più specifiche.</div>
                <div>7: mansioni semplici con macchine attrezzate.</div>
              </div>
            </details>
            {(formData.position || '').includes('Cassier') && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600 mr-2">Consigliato:</span>
                <button type="button" onClick={() => setFormData({ ...formData, level: '4' })} className="px-2 py-1 border rounded mr-1">4</button>
                <button type="button" onClick={() => setFormData({ ...formData, level: '5' })} className="px-2 py-1 border rounded">5</button>
              </div>
            )}
            {(((formData.position || '').includes('Hostes')) || ((formData.position || '').includes('Hostess'))) && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600 mr-2">Consigliato:</span>
                <button type="button" onClick={() => setFormData({ ...formData, level: '5' })} className="px-2 py-1 border rounded mr-1">5</button>
                <button type="button" onClick={() => setFormData({ ...formData, level: '6' })} className="px-2 py-1 border rounded">6</button>
              </div>
            )}
            {(formData.position || '').includes('Lavapiatti') && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600 mr-2">Consigliato:</span>
                <button type="button" onClick={() => setFormData({ ...formData, level: '6' })} className="px-2 py-1 border rounded mr-1">6</button>
                <button type="button" onClick={() => setFormData({ ...formData, level: '6S' })} className="px-2 py-1 border rounded">6S</button>
              </div>
            )}
          </div>
        </div>
        
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


