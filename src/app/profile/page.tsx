'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [personalForm, setPersonalForm] = useState({
    birthDate: '',
    birthPlace: '',
    maritalStatus: '',
    children: '',
    education: '',
    languages: '',
    hobbies: '',
    sports: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: ''
  })
  const [companyForm, setCompanyForm] = useState({
    name: '',
    fiscalCode: '',
    address: '',
    phone: '',
    email: ''
  })
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    address: '',
    phone: ''
  })
  
  // Carica dati azienda
  const { data: companyData, isLoading: isLoadingCompany } = useCompanyData(session?.user?.id)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    // Inizializza con dati sessione
    setFormData({
      name: session.user?.name || '',
      email: session.user?.email || '',
      phone: (session.user as any)?.phone || ''
    })
    
    // Inizializza form azienda
    if (companyData?.company) {
      setCompanyForm({
        name: companyData.company.name || '',
        fiscalCode: companyData.company.fiscalCode || '',
        address: companyData.company.address || '',
        phone: companyData.company.phone || '',
        email: companyData.company.email || ''
      })
    }
    
    // Inizializza form ristorante
    if (companyData?.restaurant) {
      setRestaurantForm({
        name: companyData.restaurant.name || '',
        address: companyData.restaurant.address || '',
        phone: companyData.restaurant.phone || ''
      })
    }
  }, [session, status, router, companyData])

  const handleSave = async () => {
    if (!session?.user?.id) return
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        })
      })

      if (!response.ok) {
        throw new Error('Errore nel salvataggio')
      }

      setMessage('✅ Modifiche salvate con successo!')
      setIsEditing(false)
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      setMessage('❌ Errore nel salvataggio')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePersonal = async () => {
    if (!session?.user?.id) return
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.user.id,
          ...personalForm
        })
      })

      if (!response.ok) {
        throw new Error('Errore nel salvataggio')
      }

      setMessage('✅ Informazioni personali salvate!')
      setIsEditingPersonal(false)
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      setMessage('❌ Errore nel salvataggio')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!session?.user?.id) return
    
    // Validazione
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage('❌ Compila tutti i campi password')
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('❌ Le password non coincidono')
      return
    }
    
    if (passwordForm.newPassword.length < 8) {
      setMessage('❌ La nuova password deve essere di almeno 8 caratteri')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore nel cambio password')
      }

      setMessage('✅ Password cambiata con successo!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setIsChangingPassword(false)
    } catch (error) {
      setMessage(error instanceof Error ? `❌ ${error.message}` : '❌ Errore nel cambio password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!companyData?.company?.id) return
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: companyData.company.id,
          ...companyForm
        })
      })

      if (!response.ok) {
        throw new Error('Errore nel salvataggio azienda')
      }

      setMessage('✅ Dati azienda salvati!')
      setIsEditingCompany(false)
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      setMessage('❌ Errore nel salvataggio azienda')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRestaurant = async () => {
    if (!companyData?.restaurant?.id) return
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch(`/api/restaurants/${companyData.restaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restaurantForm)
      })

      if (!response.ok) {
        throw new Error('Errore nel salvataggio ristorante')
      }

      setMessage('✅ Dati ristorante salvati!')
      setIsEditingRestaurant(false)
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      setMessage('❌ Errore nel salvataggio ristorante')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const userRole = (session.user as any)?.role || 'DIPENDENTE'
  const userAvatar = (session.user as any)?.avatar || '👤'
  const isOwner = userRole === 'PROPRIETARIO' || userRole === 'PROPRIETARIO_OPERATIVO' || userRole === 'DIRETTORE_GENERALE'

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">👤 {formData.name || session.user?.name}</h1>
                <p className="text-gray-600 mt-2">{userRole}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        name: session.user?.name || '',
                        email: session.user?.email || '',
                        phone: (session.user as any)?.phone || ''
                      })
                    }}
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
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Modifica Profilo
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p>{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonna Sinistra: Profilo + Azienda */}
          <div className="space-y-6">
            {/* Profilo */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">{userAvatar}</div>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-semibold"
                      placeholder="Nome"
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center"
                      placeholder="Telefono"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-gray-900">{formData.name}</h2>
                    <p className="text-gray-600">{formData.email}</p>
                    <p className="text-gray-600">{formData.phone || 'Nessun telefono'}</p>
                  </>
                )}
                
                <div className="mt-4">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Cambio Password */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 Sicurezza</h3>
              
              {!isChangingPassword ? (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Cambia Password
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password Attuale
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nuova Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimo 8 caratteri</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conferma Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsChangingPassword(false)
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                    >
                      {isLoading ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dati Azienda */}
            {isLoadingCompany && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-blue-800">⏳ Caricamento dati azienda...</p>
              </div>
            )}
            
            {!isLoadingCompany && !companyData?.company && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-blue-800 font-medium mb-2">ℹ️ Nessuna azienda associata</p>
                <p className="text-sm text-blue-700">
                  Non sei ancora associato a un'azienda. Se sei un dipendente, chiedi al tuo manager di aggiungerti.
                </p>
              </div>
            )}
            
            {companyData?.company && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🏢 Azienda</h3>
                  {isOwner && (
                    <div className="flex gap-2">
                      {isEditingCompany ? (
                        <>
                          <button
                            onClick={() => setIsEditingCompany(false)}
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleSaveCompany}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                          >
                            {isLoading ? 'Salvataggio...' : 'Salva'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditingCompany(true)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Modifica
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Nome Azienda:</span>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.company.name}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Codice Fiscale:</span>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.fiscalCode}
                        onChange={(e) => setCompanyForm({...companyForm, fiscalCode: e.target.value.toUpperCase()})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.company.fiscalCode}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Indirizzo Sede:</span>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Indirizzo..."
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.company.address || 'Non specificato'}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Telefono Azienda:</span>
                    {isEditingCompany ? (
                      <input
                        type="tel"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Telefono..."
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.company.phone || 'Non specificato'}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Email Azienda:</span>
                    {isEditingCompany ? (
                      <input
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Email..."
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.company.email || 'Non specificata'}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonna Destra: Informazioni Personali + Ristorante */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">👤 Informazioni Personali</h3>
                <div className="flex gap-2">
                  {isEditingPersonal ? (
                    <>
                      <button
                        onClick={() => setIsEditingPersonal(false)}
                        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleSavePersonal}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Salvataggio...' : 'Salva'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingPersonal(true)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Modifica
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data di Nascita */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Data di Nascita:</span>
                  {isEditingPersonal ? (
                    <input
                      type="date"
                      value={personalForm.birthDate}
                      onChange={(e) => setPersonalForm({...personalForm, birthDate: e.target.value})}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.birthDate || 'Non specificata'}</div>
                  )}
                </div>

                {/* Luogo di Nascita */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Luogo di Nascita:</span>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm.birthPlace}
                      onChange={(e) => setPersonalForm({...personalForm, birthPlace: e.target.value})}
                      className="w-1/2 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Città"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.birthPlace || 'Non specificato'}</div>
                  )}
                </div>

                {/* Stato Civile */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Stato Civile:</span>
                  {isEditingPersonal ? (
                    <select
                      value={personalForm.maritalStatus}
                      onChange={(e) => setPersonalForm({...personalForm, maritalStatus: e.target.value})}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Seleziona...</option>
                      <option value="single">Celibe/Nubile</option>
                      <option value="married">Coniugato/a</option>
                      <option value="divorced">Divorziato/a</option>
                      <option value="widowed">Vedovo/a</option>
                    </select>
                  ) : (
                    <div className="font-medium text-right">
                      {personalForm.maritalStatus === 'single' ? 'Celibe/Nubile' :
                       personalForm.maritalStatus === 'married' ? 'Coniugato/a' :
                       personalForm.maritalStatus === 'divorced' ? 'Divorziato/a' :
                       personalForm.maritalStatus === 'widowed' ? 'Vedovo/a' : 'Non specificato'}
                    </div>
                  )}
                </div>

                {/* Figli */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Numero Figli:</span>
                  {isEditingPersonal ? (
                    <input
                      type="number"
                      min="0"
                      value={personalForm.children}
                      onChange={(e) => setPersonalForm({...personalForm, children: e.target.value})}
                      className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="0"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.children || '0'}</div>
                  )}
                </div>

                {/* Titolo di Studio */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100 md:col-span-2">
                  <span className="text-gray-600">Titolo di Studio:</span>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm.education}
                      onChange={(e) => setPersonalForm({...personalForm, education: e.target.value})}
                      className="w-2/3 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Es: Diploma alberghiero, Laurea in..."
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.education || 'Non specificato'}</div>
                  )}
                </div>

                {/* Lingue */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100 md:col-span-2">
                  <span className="text-gray-600">Lingue Parlate:</span>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm.languages}
                      onChange={(e) => setPersonalForm({...personalForm, languages: e.target.value})}
                      className="w-2/3 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Es: Italiano, Inglese, Francese"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.languages || 'Non specificato'}</div>
                  )}
                </div>

                {/* Hobby */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100 md:col-span-2">
                  <span className="text-gray-600">Hobby e Interessi:</span>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm.hobbies}
                      onChange={(e) => setPersonalForm({...personalForm, hobbies: e.target.value})}
                      className="w-2/3 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Es: Lettura, Cucina, Fotografia"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.hobbies || 'Non specificato'}</div>
                  )}
                </div>

                {/* Sport */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100 md:col-span-2">
                  <span className="text-gray-600">Sport Praticati:</span>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm.sports}
                      onChange={(e) => setPersonalForm({...personalForm, sports: e.target.value})}
                      className="w-2/3 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Es: Calcio, Nuoto, Palestra"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.sports || 'Non specificato'}</div>
                  )}
                </div>

                {/* Contatto Emergenza */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Contatto Emergenza:</span>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm.emergencyContact}
                      onChange={(e) => setPersonalForm({...personalForm, emergencyContact: e.target.value})}
                      className="w-1/2 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Nome"
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.emergencyContact || 'Non specificato'}</div>
                  )}
                </div>

                {/* Telefono Emergenza */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Telefono Emergenza:</span>
                  {isEditingPersonal ? (
                    <input
                      type="tel"
                      value={personalForm.emergencyPhone}
                      onChange={(e) => setPersonalForm({...personalForm, emergencyPhone: e.target.value})}
                      className="w-1/2 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="+39 ..."
                    />
                  ) : (
                    <div className="font-medium text-right">{personalForm.emergencyPhone || 'Non specificato'}</div>
                  )}
                </div>

                {/* Note */}
                <div className="py-2 md:col-span-2">
                  <span className="text-gray-600 block mb-2">Note Personali:</span>
                  {isEditingPersonal ? (
                    <textarea
                      value={personalForm.notes}
                      onChange={(e) => setPersonalForm({...personalForm, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      placeholder="Informazioni aggiuntive..."
                    />
                  ) : (
                    <div className="font-medium text-gray-700">{personalForm.notes || 'Nessuna nota'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Dati Ristorante */}
            {companyData?.restaurant && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🍽️ Ristorante</h3>
                  {isOwner && (
                    <div className="flex gap-2">
                      {isEditingRestaurant ? (
                        <>
                          <button
                            onClick={() => setIsEditingRestaurant(false)}
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleSaveRestaurant}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                          >
                            {isLoading ? 'Salvataggio...' : 'Salva'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditingRestaurant(true)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Modifica
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Nome Ristorante:</span>
                    {isEditingRestaurant ? (
                      <input
                        type="text"
                        value={restaurantForm.name}
                        onChange={(e) => setRestaurantForm({...restaurantForm, name: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.restaurant.name}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Indirizzo:</span>
                    {isEditingRestaurant ? (
                      <input
                        type="text"
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({...restaurantForm, address: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Indirizzo..."
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.restaurant.address || 'Non specificato'}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Telefono:</span>
                    {isEditingRestaurant ? (
                      <input
                        type="tel"
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({...restaurantForm, phone: e.target.value})}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Telefono..."
                      />
                    ) : (
                      <div className="font-medium text-right">{companyData.restaurant.phone || 'Non specificato'}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

