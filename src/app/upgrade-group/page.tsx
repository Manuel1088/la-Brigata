'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface InformalCompanyMember {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  createdAt: string
}

interface InformalCompanyData {
  id: string
  name: string
  address: string
  city: string
  type: string
  description: string | null
  createdAt: string
  users: InformalCompanyMember[]
  memberCount: number
  canUpgrade: boolean
}

export default function UpgradeGroupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<InformalCompanyData[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<InformalCompanyData | null>(null)
  
  const [formData, setFormData] = useState({
    fiscalCode: '',
    legalName: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    phone: ''
  })

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/informal-companies')
      const data = await res.json()
      
      if (data.success) {
        setGroups(data.informalCompanies)
      }
    } catch (error) {
      console.error('Errore caricamento gruppi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGroup) return

    if (!confirm(`Confermi di voler convertire "${selectedGroup.name}" in azienda registrata? Tutti i ${selectedGroup.memberCount} membri saranno auto-approvati.`)) {
      return
    }

    try {
      setUpgrading(true)

      const res = await fetch(`/api/informal-companies/${selectedGroup.id}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        alert(`🎉 ${data.message}\n\n✅ Azienda: ${data.company.name}\n✅ Restaurant: ${data.restaurant.name}\n✅ Dipendenti convertiti: ${data.convertedMembers}/${data.totalMembers}`)
        
        // Redirect al dashboard
        router.push('/dashboard')
      } else {
        alert(`❌ Errore: ${data.error}`)
      }
    } catch (error) {
      console.error('Errore upgrade:', error)
      alert('❌ Errore durante la conversione')
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏢</div>
          <div className="text-xl text-gray-700">Caricamento gruppi...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🏢 Registra il Tuo Gruppo come Azienda
        </h1>
        <p className="text-lg text-gray-600">
          Converti il tuo gruppo temporaneo in un&apos;azienda registrata con tutti i benefici
        </p>
      </div>

      {/* Benefici */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-semibold text-green-900">Auto-Approvazione</div>
          <div className="text-sm text-green-700">Tutti i membri esistenti vengono approvati automaticamente</div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="text-3xl mb-2">📊</div>
          <div className="font-semibold text-blue-900">Funzionalità Complete</div>
          <div className="text-sm text-blue-700">Accesso a tutte le funzionalità pro dell&apos;azienda</div>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="text-3xl mb-2">🔔</div>
          <div className="font-semibold text-purple-900">Notifiche a Tutti</div>
          <div className="text-sm text-purple-700">Tutti i membri ricevono notifica dell&apos;upgrade</div>
        </div>
      </div>

      {/* Lista Gruppi */}
      {groups.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nessun Gruppo Temporaneo</h3>
          <p className="text-gray-600">Non hai gruppi temporanei da convertire</p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">I Tuoi Gruppi Temporanei</h2>
          
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {group.name}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>📍 {group.address}, {group.city}</div>
                    <div>🏢 Tipo: {group.type}</div>
                    {group.description && <div>📝 {group.description}</div>}
                    <div>📅 Creato: {new Date(group.createdAt).toLocaleDateString('it-IT')}</div>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">{group.memberCount}</div>
                  <div className="text-xs text-orange-700">Membri</div>
                </div>
              </div>

              {/* Lista Membri */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Membri del gruppo:</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {group.users.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                      <span className="text-lg">👤</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Azione */}
              {group.canUpgrade && (
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  🚀 Registra come Azienda
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Upgrade */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-6xl">🏢</div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Registra Azienda
                  </h2>
                  <p className="text-gray-600">
                    Converti &quot;{selectedGroup.name}&quot; in azienda registrata
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpgrade} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codice Fiscale / P.IVA *
                  </label>
                  <input
                    type="text"
                    value={formData.fiscalCode}
                    onChange={(e) => setFormData({ ...formData, fiscalCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                    maxLength={16}
                    placeholder="IT12345678901"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                    placeholder={selectedGroup.name}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo Completo
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={selectedGroup.address}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Proprietario *
                    </label>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Proprietario *
                    </label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+39 123 456 7890"
                  />
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">ℹ️</div>
                    <div className="flex-1 text-sm text-blue-800">
                      <p className="font-semibold mb-1">Cosa succederà:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Verrà creata una nuova azienda con i dati inseriti</li>
                        <li>Verrà creato un ristorante con il nome del gruppo</li>
                        <li>Tutti i {selectedGroup.memberCount} membri saranno automaticamente approvati</li>
                        <li>Ogni membro riceverà una notifica dell&apos;upgrade</li>
                        <li>Il gruppo temporaneo verrà eliminato</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Azioni */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    disabled={upgrading}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition font-semibold shadow-md hover:shadow-lg disabled:opacity-50"
                    disabled={upgrading}
                  >
                    {upgrading ? '⏳ Conversione...' : '🚀 Conferma Registrazione'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

