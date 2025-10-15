'use client'
import { useEffect, useState } from 'react'
import { getCustomers, saveCustomers, Customer } from '@/lib/customers'
import { PermissionGuard } from '@/components/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'

export default function OperationsCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editForm, setEditForm] = useState<{ 
    allergies: string
    recurrences: string
    preferences: string
    notes: string 
  }>({ 
    allergies: '', 
    recurrences: '', 
    preferences: '', 
    notes: '' 
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'vip' | 'regular'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'lastVisit' | 'totalVisits'>('name')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    allergies: '',
    recurrences: '',
    preferences: '',
    notes: ''
  })

  const { can } = usePermissions()

  useEffect(() => {
    const load = () => setCustomers(getCustomers())
    load()
    const h = () => load()
    window.addEventListener('customers_updated', h)
    return () => window.removeEventListener('customers_updated', h)
  }, [])

  const deleteCustomer = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo cliente?')) {
      const next = customers.filter(c => c.id !== id)
      setCustomers(next)
      try { saveCustomers(next) } catch {}
      setSelected(null)
    }
  }

  const saveCustomerEdit = () => {
    if (!selected) return
    const updated = customers.map(c => 
      c.id === selected.id 
        ? { ...c, ...editForm }
        : c
    )
    setCustomers(updated)
    saveCustomers(updated)
    setIsEditing(false)
    setSelected({ ...selected, ...editForm })
  }

  const addNewCustomer = () => {
    const customer: Customer = {
      id: crypto.randomUUID(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email || undefined,
      allergies: newCustomer.allergies,
      recurrences: newCustomer.recurrences,
      preferences: newCustomer.preferences,
      notes: newCustomer.notes,
      totalBookings: 0,
      totalGuests: 0,
      lastVisitDate: new Date().toISOString().split('T')[0],
      lunchCount: 0,
      dinnerCount: 0
    }
    
    const updated = [...customers, customer]
    setCustomers(updated)
    saveCustomers(updated)
    setShowAddModal(false)
    setNewCustomer({
      name: '',
      phone: '',
      email: '',
      allergies: '',
      recurrences: '',
      preferences: '',
      notes: ''
    })
  }

  // Filtra e ordina clienti
  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (customer.phone || '').includes(searchTerm) ||
                           (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = filterBy === 'all' || 
                           (filterBy === 'vip' && (customer.totalBookings || 0) >= 10) ||
                           (filterBy === 'regular' && (customer.totalBookings || 0) < 10)
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'lastVisit':
          const aDate = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0
          const bDate = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0
          return bDate - aDate
        case 'totalVisits':
          return (b.totalBookings || 0) - (a.totalBookings || 0)
        default:
          return 0
      }
    })

  const handleSelectCustomer = (customer: Customer) => {
    setSelected(customer)
    setEditForm({
      allergies: customer.allergies || '',
      recurrences: customer.recurrences || '',
      preferences: customer.preferences || '',
      notes: customer.notes || ''
    })
    setIsEditing(false)
  }

  const getCustomerStatus = (customer: Customer) => {
    const visits = customer.totalBookings || 0
    if (visits >= 20) return { label: 'VIP', color: 'bg-purple-100 text-purple-800' }
    if (visits >= 10) return { label: 'Fedele', color: 'bg-green-100 text-green-800' }
    if (visits >= 5) return { label: 'Regolare', color: 'bg-blue-100 text-blue-800' }
    if (visits >= 1) return { label: 'Nuovo', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Prospect', color: 'bg-gray-100 text-gray-800' }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Mai'
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  return (
    <PermissionGuard permission="customers_view">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📒 Clienti</h2>
              <p className="text-gray-600 mt-1">Gestisci la base clienti e le loro preferenze</p>
            </div>
            
            {can('customers_create') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                ➕ Nuovo Cliente
              </button>
            )}
          </div>
        </div>

        {/* Filtri e ricerca */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, telefono, email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtra per</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as 'all' | 'vip' | 'regular')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti</option>
                <option value="vip">VIP (10+ visite)</option>
                <option value="regular">Regolari (&lt;10 visite)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordina per</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'lastVisit' | 'totalVisits')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Nome</option>
                <option value="lastVisit">Ultima visita</option>
                <option value="totalVisits">Totale visite</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {filteredCustomers.length} clienti trovati
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista clienti */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Lista Clienti</h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📒</div>
                  <p className="text-gray-500">Nessun cliente trovato</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCustomers.map(customer => {
                    const status = getCustomerStatus(customer)
                    return (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                          selected?.id === customer.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-medium text-gray-900">{customer.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div>📞 {customer.phone}</div>
                              {customer.email && <div>📧 {customer.email}</div>}
                              <div>🔄 {(customer.totalBookings || 0)} visite</div>
                              <div>📅 Ultima: {formatDate(customer.lastVisitDate)}</div>
                            </div>
                          </div>
                          
                          {can('customers_delete') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteCustomer(customer.id)
                              }}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dettagli cliente */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selected ? `Dettagli - ${selected.name}` : 'Seleziona un cliente'}
              </h3>
            </div>
            
            <div className="p-6">
              {selected ? (
                <div className="space-y-6">
                  {/* Info base */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Telefono:</span>
                      <div className="font-medium">{selected.phone}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <div className="font-medium">{selected.email || 'Non fornita'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Totale visite:</span>
                      <div className="font-medium">{selected.totalBookings || 0}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Ultima visita:</span>
                      <div className="font-medium">{formatDate(selected.lastVisitDate)}</div>
                    </div>
                  </div>

                  {/* Preferenze editabili */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Preferenze</h4>
                      {can('customers_edit') && (
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          {isEditing ? '💾 Salva' : '✏️ Modifica'}
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Allergie</label>
                          <textarea
                            value={editForm.allergies}
                            onChange={(e) => setEditForm(prev => ({ ...prev, allergies: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ricorrenze</label>
                          <textarea
                            value={editForm.recurrences}
                            onChange={(e) => setEditForm(prev => ({ ...prev, recurrences: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preferenze</label>
                          <textarea
                            value={editForm.preferences}
                            onChange={(e) => setEditForm(prev => ({ ...prev, preferences: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveCustomerEdit}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            💾 Salva Modifiche
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Allergie:</span>
                          <p className="text-gray-600">{selected.allergies || 'Nessuna informazione'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Ricorrenze:</span>
                          <p className="text-gray-600">{selected.recurrences || 'Nessuna informazione'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Preferenze:</span>
                          <p className="text-gray-600">{selected.preferences || 'Nessuna informazione'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Note:</span>
                          <p className="text-gray-600">{selected.notes || 'Nessuna nota'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👆</div>
                  <p className="text-gray-500">Seleziona un cliente dalla lista per vedere i dettagli</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal nuovo cliente */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Nuovo Cliente</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefono *</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergie</label>
                  <textarea
                    value={newCustomer.allergies}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, allergies: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferenze</label>
                  <textarea
                    value={newCustomer.preferences}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, preferences: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                  <textarea
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={addNewCustomer}
                    disabled={!newCustomer.name || !newCustomer.phone}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    💾 Salva Cliente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
