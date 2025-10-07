'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

interface Company {
  id: string
  name: string
  fiscalCode: string
  address: string
  region: string
  ownerName: string
  ownerEmail: string
  restaurantName: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: Date
  employeeCount: number
  lastActivity: Date
}

export default function AdminCompanies() {
  const router = useRouter()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      const data = await response.json()
      
      if (data.companies) {
        setCompanies(data.companies.map((company: any) => ({
          ...company,
          createdAt: new Date(company.createdAt),
          lastActivity: new Date(company.lastActivity || company.createdAt)
        })))
      }
    } catch (error) {
      console.error('Errore nel caricamento aziende:', error)
      notifyCustom('Errore nel caricamento aziende', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyAction = async (companyId: string, action: 'activate' | 'deactivate' | 'view') => {
    try {
      const company = companies.find(c => c.id === companyId)
      if (!company) return

      switch (action) {
        case 'activate':
          setCompanies(prev => prev.map(c => 
            c.id === companyId ? { ...c, status: 'active' } : c
          ))
          notifyCustom(`Azienda ${company.name} attivata`, 'success')
          logReadAction('company_activated', { companyId, companyName: company.name })
          break
        case 'deactivate':
          setCompanies(prev => prev.map(c => 
            c.id === companyId ? { ...c, status: 'inactive' } : c
          ))
          notifyCustom(`Azienda ${company.name} disattivata`, 'warning')
          logReadAction('company_deactivated', { companyId, companyName: company.name })
          break
        case 'view':
          router.push(`/admin/companies/${companyId}/employees`)
          break
      }
    } catch (error) {
      notifyCustom('Errore nell\'operazione', 'error')
    }
  }

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.fiscalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter
    const matchesRegion = regionFilter === 'all' || company.region === regionFilter
    
    return matchesSearch && matchesStatus && matchesRegion
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva'
      case 'inactive': return 'Inattiva'
      case 'pending': return 'In Attesa'
      default: return status
    }
  }

  const getRegionIcon = (region: string) => {
    switch (region) {
      case 'Lombardia': return '🏔️'
      case 'Lazio': return '🏛️'
      case 'Campania': return '🌋'
      case 'Sicilia': return '🏝️'
      case 'Puglia': return '🌊'
      default: return '🏢'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT')
  }

  const formatLastActivity = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Oggi'
    if (days === 1) return 'Ieri'
    if (days < 7) return `${days} giorni fa`
    return formatDate(date)
  }

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.status === 'active').length,
    inactive: companies.filter(c => c.status === 'inactive').length,
    pending: companies.filter(c => c.status === 'pending').length,
    totalEmployees: companies.reduce((sum, c) => sum + c.employeeCount, 0)
  }

  const regions = Array.from(new Set(companies.map(c => c.region))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">🏢</div>
          <div className="text-xl text-gray-700">Caricamento aziende...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-700">Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-green-700">Attive</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          <div className="text-sm text-red-700">Inattive</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-yellow-700">In Attesa</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalEmployees}</div>
          <div className="text-sm text-purple-700">Dipendenti</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome, P.IVA o proprietario..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="active">Attive</option>
              <option value="inactive">Inattive</option>
              <option value="pending">In Attesa</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Regione</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutte</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadCompanies}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Lista Aziende */}
      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏢</div>
            <p className="text-gray-500">Nessuna azienda trovata</p>
            <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
          </div>
        ) : (
          filteredCompanies.map(company => (
            <div key={company.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">🏢</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-gray-600">{company.restaurantName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(company.status)}`}>
                      {getStatusLabel(company.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">P.IVA:</span>
                      <div className="font-medium">{company.fiscalCode}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Proprietario:</span>
                      <div className="font-medium">{company.ownerName}</div>
                      <div className="text-gray-500">{company.ownerEmail}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Indirizzo:</span>
                      <div className="font-medium flex items-center gap-1">
                        {getRegionIcon(company.region)} {company.address}
                      </div>
                      <div className="text-gray-500">{company.region}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Dipendenti:</span>
                      <div className="font-medium text-lg">{company.employeeCount}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-600">
                    <span>Registrata il {formatDate(company.createdAt)} • </span>
                    <span>Ultima attività: {formatLastActivity(company.lastActivity)}</span>
                  </div>
                </div>
                
                {/* Azioni */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleCompanyAction(company.id, 'view')}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                  >
                    👥 Dipendenti
                  </button>
                  
                  {company.status === 'inactive' ? (
                    <button
                      onClick={() => handleCompanyAction(company.id, 'activate')}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                    >
                      ✅ Attiva
                    </button>
                  ) : company.status === 'active' ? (
                    <button
                      onClick={() => handleCompanyAction(company.id, 'deactivate')}
                      className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm"
                    >
                      ⏸️ Disattiva
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
