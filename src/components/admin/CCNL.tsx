'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

interface CCNLEntry {
  id: string
  name: string
  description: string
  category: 'salary' | 'hours' | 'benefits' | 'holidays' | 'termination'
  value: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export default function AdminCCNL() {
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [ccnlEntries, setCcnlEntries] = useState<CCNLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isEditing, setIsEditing] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CCNLEntry | null>(null)

  useEffect(() => {
    loadCCNLEntries()
  }, [])

  const loadCCNLEntries = async () => {
    try {
      // Mock data - in produzione verrà dal database
      const mockEntries: CCNLEntry[] = [
        {
          id: '1',
          name: 'Stipendio minimo DIPENDENTE_SALA',
          description: 'Stipendio orario minimo per dipendenti sala',
          category: 'salary',
          value: '€12.00/ora',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '2',
          name: 'Stipendio minimo DIPENDENTE_CUCINA',
          description: 'Stipendio orario minimo per dipendenti cucina',
          category: 'salary',
          value: '€13.50/ora',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '3',
          name: 'Ore settimanali standard',
          description: 'Numero di ore lavorative settimanali standard',
          category: 'hours',
          value: '40 ore',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '4',
          name: 'Ore straordinarie - Tariffa',
          description: 'Tariffa oraria per ore straordinarie',
          category: 'hours',
          value: '+50%',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '5',
          name: 'Ferie annuali',
          description: 'Giorni di ferie annuali retribuite',
          category: 'holidays',
          value: '26 giorni',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '6',
          name: 'ROL (Recupero ore lavorate)',
          description: 'Giorni di recupero per ore lavorate in eccesso',
          category: 'holidays',
          value: 'Fino a 8 giorni',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '7',
          name: 'Tredicesima mensilità',
          description: 'Gratifica natalizia obbligatoria',
          category: 'benefits',
          value: '1 stipendio',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '8',
          name: 'Quattordicesima mensilità',
          description: 'Gratifica estiva opzionale',
          category: 'benefits',
          value: '1 stipendio (opzionale)',
          isActive: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '9',
          name: 'Preavviso dimissioni',
          description: 'Giorni di preavviso per dimissioni',
          category: 'termination',
          value: '15 giorni',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '10',
          name: 'Preavviso licenziamento',
          description: 'Giorni di preavviso per licenziamento',
          category: 'termination',
          value: '30 giorni',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ]
      
      setCcnlEntries(mockEntries)
    } catch (error) {
      console.error('Errore nel caricamento CCNL:', error)
      notifyCustom('Errore nel caricamento CCNL', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (entryId: string) => {
    try {
      setCcnlEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, isActive: !entry.isActive, updatedAt: new Date() }
          : entry
      ))
      
      const entry = ccnlEntries.find(e => e.id === entryId)
      if (entry) {
        notifyCustom(`Voce CCNL ${entry.isActive ? 'disattivata' : 'attivata'}`, 'success')
        logReadAction('ccnl_toggled', { entryId, entryName: entry.name, newStatus: !entry.isActive })
      }
    } catch (error) {
      notifyCustom('Errore nell\'operazione', 'error')
    }
  }

  const handleEditEntry = (entry: CCNLEntry) => {
    setEditingEntry(entry)
    setIsEditing(true)
  }

  const handleSaveEntry = async (updatedEntry: CCNLEntry) => {
    try {
      setCcnlEntries(prev => prev.map(entry => 
        entry.id === updatedEntry.id 
          ? { ...updatedEntry, updatedAt: new Date() }
          : entry
      ))
      
      setIsEditing(false)
      setEditingEntry(null)
      notifyCustom('Voce CCNL aggiornata', 'success')
      logReadAction('ccnl_updated', { entryId: updatedEntry.id, entryName: updatedEntry.name })
    } catch (error) {
      notifyCustom('Errore nel salvataggio', 'error')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingEntry(null)
  }

  const filteredEntries = ccnlEntries.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.value.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && entry.isActive) ||
                         (statusFilter === 'inactive' && !entry.isActive)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'salary': return '💰'
      case 'hours': return '⏰'
      case 'benefits': return '🎁'
      case 'holidays': return '🏖️'
      case 'termination': return '🚪'
      default: return '📋'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'salary': return 'Stipendi'
      case 'hours': return 'Orari'
      case 'benefits': return 'Benefici'
      case 'holidays': return 'Ferie'
      case 'termination': return 'Licenziamenti'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'salary': return 'bg-green-50 text-green-800 border-green-200'
      case 'hours': return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'benefits': return 'bg-purple-50 text-purple-800 border-purple-200'
      case 'holidays': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'termination': return 'bg-red-50 text-red-800 border-red-200'
      default: return 'bg-gray-50 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT')
  }

  const stats = {
    total: ccnlEntries.length,
    active: ccnlEntries.filter(e => e.isActive).length,
    inactive: ccnlEntries.filter(e => !e.isActive).length,
    categories: Array.from(new Set(ccnlEntries.map(e => e.category))).length
  }

  const categories = Array.from(new Set(ccnlEntries.map(e => e.category))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-xl text-gray-700">Caricamento CCNL...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-700">Voci Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-green-700">Attive</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          <div className="text-sm text-red-700">Inattive</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.categories}</div>
          <div className="text-sm text-purple-700">Categorie</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome, descrizione o valore..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutte</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="active">Attivi</option>
              <option value="inactive">Inattivi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Voci CCNL */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-500">Nessuna voce CCNL trovata</p>
            <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{getCategoryIcon(entry.category)}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{entry.name}</h3>
                      <p className="text-gray-600">{entry.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(entry.category)}`}>
                      {getCategoryLabel(entry.category)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      entry.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.isActive ? 'Attivo' : 'Inattivo'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Valore:</span>
                      <div className="font-medium text-lg">{entry.value}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Ultimo aggiornamento:</span>
                      <div className="font-medium">{formatDate(entry.updatedAt)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Azioni */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditEntry(entry)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={() => handleToggleActive(entry.id)}
                    className={`px-3 py-1 rounded hover:opacity-80 transition text-sm ${
                      entry.isActive 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {entry.isActive ? '⏸️ Disattiva' : '✅ Attiva'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal di Modifica */}
      {isEditing && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Modifica Voce CCNL</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={editingEntry.name}
                  onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
                <textarea
                  value={editingEntry.description}
                  onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valore</label>
                <input
                  type="text"
                  value={editingEntry.value}
                  onChange={(e) => setEditingEntry({ ...editingEntry, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={editingEntry.category}
                  onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="salary">💰 Stipendi</option>
                  <option value="hours">⏰ Orari</option>
                  <option value="benefits">🎁 Benefici</option>
                  <option value="holidays">🏖️ Ferie</option>
                  <option value="termination">🚪 Licenziamenti</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleSaveEntry(editingEntry)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                💾 Salva
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
