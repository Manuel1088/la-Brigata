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
    ownerRole: 'PROPRIETARIO_LAVORATORE',
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
        
        <select
          value={formData.ownerRole}
          onChange={(e) => setFormData({...formData, ownerRole: e.target.value as any})}
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
  const [uploadedPayroll, setUploadedPayroll] = useState<File | null>(null)
  const [isAnalyzingPayroll, setIsAnalyzingPayroll] = useState(false)
  const [extractedPayrollData, setExtractedPayrollData] = useState<{ companyName?: string, fiscalCode?: string, position?: string, level?: string, ferieResidue?: number, rolResidui?: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mapPositionToDeptAndLevel = (pos: string): { dept: string, level: string } => {
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
      : pos.includes('Hostes') || pos.includes('Hostess') ? '5'
      : pos.includes('Lavapiatti') ? '6'
      : '6S'
    return { dept, level }
  }

  const simulatePayrollExtraction = async (file: File) => {
    // Placeholder di estrazione: in produzione integra OCR/AI
    await new Promise(r => setTimeout(r, 1200))
    // Demo: valori fittizi per precompilazione
    return {
      companyName: 'Ristorante Demo Srl',
      fiscalCode: 'ABCDEF12G34H567I',
      position: 'Cameriere',
      level: '5',
      ferieResidue: 10,
      rolResidui: 8,
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
        <input
          type="text"
          placeholder="Nome Azienda"
          value={formData.companyName || ''}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mansione</label>
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
                  : pos.includes('Hostes') || pos.includes('Hostess') ? '5'
                  : pos.includes('Lavapiatti') ? '6'
                  : '6S'
                setFormData({ ...formData, position: pos, department: dept as any, level })
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
        
        {/* Upload Busta Paga (opzionale ma consigliato) */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-900">Carica Busta Paga (PDF/Immagine)</div>
            {extractedPayrollData && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Dati estratti</span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setUploadedPayroll(e.target.files?.[0] || null)}
              className="block w-full"
              ref={fileInputRef}
            />
            <p className="text-xs text-gray-500">Usiamo la busta paga per precompilare i dati (non memorizziamo il file).</p>
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <button
                type="button"
                onClick={async () => {
                  if (!uploadedPayroll) {
                    fileInputRef.current?.click()
                    return
                  }
                  setIsAnalyzingPayroll(true)
                  try {
                    const data = await simulatePayrollExtraction(uploadedPayroll)
                    setExtractedPayrollData(data)
                  } finally {
                    setIsAnalyzingPayroll(false)
                  }
                }}
                disabled={isAnalyzingPayroll}
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {isAnalyzingPayroll ? 'Analisi…' : 'Analizza'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!extractedPayrollData) {
                    alert('Analizza prima la busta paga per applicare i dati')
                    return
                  }
                  const { companyName, fiscalCode, position, level, ferieResidue, rolResidui } = extractedPayrollData
                  const mapping = mapPositionToDeptAndLevel(position || '')
                  setFormData(prev => ({
                    ...prev,
                    companyName: companyName || prev.companyName,
                    companyFiscalCode: fiscalCode || prev.companyFiscalCode,
                    position: position || prev.position,
                    department: mapping.dept as any,
                    level: level || mapping.level
                  }))
                  try {
                    localStorage.setItem('payroll_residui_preview', JSON.stringify({ ferieResidue, rolResidui }))
                  } catch {}
                }}
                className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                Applica dati estratti
              </button>
            </div>
          </div>
          {extractedPayrollData && (
            <div className="mt-3 text-sm text-gray-700 grid md:grid-cols-3 gap-3">
              <div><span className="text-gray-500">Azienda:</span> <span className="font-medium">{extractedPayrollData.companyName}</span></div>
              <div><span className="text-gray-500">CF/P.IVA:</span> <span className="font-medium">{extractedPayrollData.fiscalCode}</span></div>
              <div><span className="text-gray-500">Mansione:</span> <span className="font-medium">{extractedPayrollData.position}</span></div>
              <div><span className="text-gray-500">Livello:</span> <span className="font-medium">{extractedPayrollData.level}</span></div>
              <div><span className="text-gray-500">Ferie Residue:</span> <span className="font-medium">{extractedPayrollData.ferieResidue}</span></div>
              <div><span className="text-gray-500">ROL Residui:</span> <span className="font-medium">{extractedPayrollData.rolResidui}</span></div>
            </div>
          )}
        </div>
        
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
                  : pos.includes('Hostes') || pos.includes('Hostess') ? '5'
                  : pos.includes('Lavapiatti') ? '6'
                  : undefined
                setFormData({ ...formData, position: pos, department: dept as any, level })
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


