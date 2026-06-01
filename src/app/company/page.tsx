'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useCompanyData } from '@/hooks/useCompanyData'
import type { LocationDto } from '@/lib/restaurant-location-api'
import RoomsTab from './RoomsTab'
import ShiftTemplatesTab from './ShiftTemplatesTab'

type CompanyTabId = 'info' | 'rooms' | 'shifts' | 'stats'

export default function CompanyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageCompany } = usePermissions()
  const {
    company: companyData,
    restaurant: restaurantData,
    isLoading,
    mutate: refreshCompanyData,
  } = useCompanyData(session?.user?.id)

  const [activeTab, setActiveTab] = useState<CompanyTabId>('info')
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [companyForm, setCompanyForm] = useState({
    name: '',
    fiscalCode: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  })

  const [dbLocations, setDbLocations] = useState<LocationDto[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!canManageCompany()) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, canManageCompany])

  useEffect(() => {
    if (companyData) {
      setCompanyForm({
        name: (companyData as { name?: string }).name || '',
        fiscalCode: (companyData as { fiscalCode?: string }).fiscalCode || '',
        address: (companyData as { address?: string }).address || '',
        phone: (companyData as { phone?: string }).phone || '',
        email: (companyData as { email?: string }).email || '',
        website: '',
      })
    }
  }, [companyData])

  const resolveCompanyId = (): string | null => {
    const fromCompany = (companyData as { id?: string } | null)?.id
    if (fromCompany) return fromCompany
    const fromRestaurant = (restaurantData as { companyId?: string | null } | null)?.companyId
    return fromRestaurant ?? null
  }

  const handleSaveCompany = async () => {
    const companyId = resolveCompanyId()
    if (!companyId) {
      setMessage('❌ Nessuna azienda collegata al tuo account. Contatta l’amministratore.')
      return
    }

    if (!companyForm.name.trim()) {
      setMessage('❌ Il nome azienda è obbligatorio')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      const { website: _website, ...payload } = companyForm
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: companyId,
          ...payload,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Errore nel salvataggio')
      }

      await refreshCompanyData()
      setMessage('✅ Dati azienda salvati!')
      setIsEditingCompany(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Errore nel salvataggio azienda'
      setMessage(`❌ ${detail}`)
    } finally {
      setIsSaving(false)
    }
  }

  const restaurantId = (restaurantData as { id?: string } | undefined)?.id
  const activeDbLocations = dbLocations.filter((l) => l.isActive)
  const totalCapacity = activeDbLocations.reduce((sum, l) => sum + (l.capacity ?? 0), 0)
  const totalTables = activeDbLocations.reduce((sum, l) => sum + (l.tables ?? 0), 0)

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session || !canManageCompany()) return null

  const tabs: Array<{ id: CompanyTabId; label: string; icon: string }> = [
    { id: 'info', label: 'Informazioni', icon: '📋' },
    { id: 'rooms', label: 'Sale & Orari', icon: '🏛️' },
    { id: 'shifts', label: 'Turni', icon: '📅' },
    { id: 'stats', label: 'Statistiche', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Azienda</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.includes('✅')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-max py-4 px-6 text-center font-medium text-sm transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-orange-500 text-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">📋 Dati aziendali</h3>
                  <div className="flex gap-2">
                    {isEditingCompany ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingCompany(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCompany}
                          disabled={isSaving}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          {isSaving ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingCompany(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Modifica
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome azienda</label>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.name || 'Non specificato'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Codice fiscale / P.IVA
                    </label>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.fiscalCode}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, fiscalCode: e.target.value.toUpperCase() })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.fiscalCode || 'Non specificato'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sede legale</label>
                    {isEditingCompany ? (
                      <input
                        type="text"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Via, Città, CAP"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.address || 'Non specificato'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
                    {isEditingCompany ? (
                      <input
                        type="tel"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.phone || 'Non specificato'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email aziendale</label>
                    {isEditingCompany ? (
                      <input
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.email || 'Non specificato'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sito web</label>
                    {isEditingCompany ? (
                      <input
                        type="url"
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="https://..."
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{companyForm.website || 'Non specificato'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rooms' && (
              <RoomsTab
                restaurantId={restaurantId}
                companyName={
                  (companyData as { name?: string } | undefined)?.name ||
                  companyForm.name ||
                  undefined
                }
                onMessage={setMessage}
                onLocationsChange={setDbLocations}
              />
            )}

            {activeTab === 'shifts' && (
              <ShiftTemplatesTab
                restaurantId={restaurantId}
                onMessage={setMessage}
              />
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">📊 Overview aziendale</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="text-4xl mb-3">👥</div>
                    <div className="text-3xl font-bold text-blue-600">{totalCapacity}</div>
                    <div className="text-sm text-blue-700 mt-1">Coperti totali</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="text-4xl mb-3">🏛️</div>
                    <div className="text-3xl font-bold text-purple-600">{activeDbLocations.length}</div>
                    <div className="text-sm text-purple-700 mt-1">Sale operative</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Tavoli totali (sale attive): <strong>{totalTables}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
