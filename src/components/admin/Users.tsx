'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'
import { UserRole } from '@/types/roles'

interface User {
  id: string
  name: string
  email: string
  role: string
  level: number
  avatar: string
  isActive: boolean
  lastLogin: Date
  createdAt: Date
  company?: string
}

export default function AdminUsers() {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      // Mock data - in produzione verrà dal database
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'Admin Proprietario',
          email: 'admin@brigata.it',
          role: 'PROPRIETARIO',
          level: 10,
          avatar: '👑',
          isActive: true,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date('2024-01-01'),
          company: 'La Brigata'
        },
        {
          id: '2',
          name: 'Marco Direttore',
          email: 'direttore@brigata.it',
          role: 'DIRETTORE',
          level: 9,
          avatar: '👔',
          isActive: true,
          lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000),
          createdAt: new Date('2024-01-15'),
          company: 'La Brigata'
        },
        {
          id: '3',
          name: 'Anna Manager',
          email: 'manager@brigata.it',
          role: 'MANAGER',
          level: 8,
          avatar: '📊',
          isActive: true,
          lastLogin: new Date(Date.now() - 30 * 60 * 1000),
          createdAt: new Date('2024-02-01'),
          company: 'La Brigata'
        },
        {
          id: '4',
          name: 'Luca Cassiere',
          email: 'cassiere@brigata.it',
          role: 'CASSIERE',
          level: 6,
          avatar: '💰',
          isActive: true,
          lastLogin: new Date(Date.now() - 15 * 60 * 1000),
          createdAt: new Date('2024-02-15'),
          company: 'La Brigata'
        },
        {
          id: '5',
          name: 'Sofia Dipendente',
          email: 'dipendente@brigata.it',
          role: 'DIPENDENTE',
          level: 5,
          avatar: '👤',
          isActive: false,
          lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
          createdAt: new Date('2024-03-01'),
          company: 'La Brigata'
        }
      ]
      
      setUsers(mockUsers)
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error)
      notifyCustom('Errore nel caricamento utenti', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      switch (action) {
        case 'activate':
          setUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, isActive: true } : u
          ))
          notifyCustom(`Utente ${user.name} attivato`, 'success')
          logReadAction('user_activated', { userId, userName: user.name })
          break
        case 'deactivate':
          setUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, isActive: false } : u
          ))
          notifyCustom(`Utente ${user.name} disattivato`, 'warning')
          logReadAction('user_deactivated', { userId, userName: user.name })
          break
        case 'delete':
          if (confirm(`Sei sicuro di voler eliminare l'utente ${user.name}?`)) {
            setUsers(prev => prev.filter(u => u.id !== userId))
            notifyCustom(`Utente ${user.name} eliminato`, 'success')
            logReadAction('user_deleted', { userId, userName: user.name })
          }
          break
      }
    } catch (error) {
      notifyCustom('Errore nell\'operazione', 'error')
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) {
      notifyCustom('Seleziona almeno un utente', 'warning')
      return
    }

    try {
      switch (action) {
        case 'activate':
          setUsers(prev => prev.map(u => 
            selectedUsers.includes(u.id) ? { ...u, isActive: true } : u
          ))
          notifyCustom(`${selectedUsers.length} utenti attivati`, 'success')
          break
        case 'deactivate':
          setUsers(prev => prev.map(u => 
            selectedUsers.includes(u.id) ? { ...u, isActive: false } : u
          ))
          notifyCustom(`${selectedUsers.length} utenti disattivati`, 'warning')
          break
        case 'delete':
          if (confirm(`Sei sicuro di voler eliminare ${selectedUsers.length} utenti?`)) {
            setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)))
            notifyCustom(`${selectedUsers.length} utenti eliminati`, 'success')
          }
          break
      }
      setSelectedUsers([])
    } catch (error) {
      notifyCustom('Errore nell\'operazione bulk', 'error')
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    const filteredUserIds = filteredUsers.map(u => u.id)
    setSelectedUsers(filteredUserIds)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PROPRIETARIO': return 'bg-purple-100 text-purple-800'
      case 'DIRETTORE': return 'bg-blue-100 text-blue-800'
      case 'MANAGER': return 'bg-green-100 text-green-800'
      case 'CASSIERE': return 'bg-yellow-100 text-yellow-800'
      case 'DIPENDENTE': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'PROPRIETARIO': return 'Proprietario'
      case 'DIRETTORE': return 'Direttore'
      case 'MANAGER': return 'Manager'
      case 'CASSIERE': return 'Cassiere'
      case 'DIPENDENTE': return 'Dipendente'
      default: return role
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT')
  }

  const formatLastLogin = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Ora'
    if (hours < 24) return `${hours}h fa`
    const days = Math.floor(hours / 24)
    return `${days}g fa`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">👥</div>
          <div className="text-xl text-gray-700">Caricamento utenti...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
          <div className="text-sm text-blue-700">Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.isActive).length}
          </div>
          <div className="text-sm text-green-700">Attivi</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {users.filter(u => !u.isActive).length}
          </div>
          <div className="text-sm text-red-700">Inattivi</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.lastLogin > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-sm text-purple-700">Online 24h</div>
        </div>
      </div>

      {/* Filtri e Azioni */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome o email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ruolo</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="PROPRIETARIO">Proprietario</option>
              <option value="DIRETTORE">Direttore</option>
              <option value="MANAGER">Manager</option>
              <option value="CASSIERE">Cassiere</option>
              <option value="DIPENDENTE">Dipendente</option>
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
          
          <div className="flex items-end">
            <button
              onClick={selectAllUsers}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Seleziona Tutti
            </button>
          </div>
        </div>

        {/* Azioni Bulk */}
        {selectedUsers.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              ✅ Attiva Selezionati ({selectedUsers.length})
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
            >
              ⏸️ Disattiva Selezionati ({selectedUsers.length})
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              🗑️ Elimina Selezionati ({selectedUsers.length})
            </button>
          </div>
        )}
      </div>

      {/* Lista Utenti */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={selectAllUsers}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ultimo Accesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">{user.avatar}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.company || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatLastLogin(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {!user.isActive ? (
                        <button
                          onClick={() => handleUserAction(user.id, 'activate')}
                          className="text-green-600 hover:text-green-900"
                        >
                          ✅ Attiva
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user.id, 'deactivate')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          ⏸️ Disattiva
                        </button>
                      )}
                      <button
                        onClick={() => handleUserAction(user.id, 'delete')}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-gray-500">Nessun utente trovato</p>
          <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
        </div>
      )}
    </div>
  )
}
