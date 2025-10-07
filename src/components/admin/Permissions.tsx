'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'
import { UserRole } from '@/types/roles'

interface Permission {
  id: string
  name: string
  description: string
  category: string
  isActive: boolean
}

interface RolePermissions {
  role: UserRole
  permissions: string[]
}

export default function AdminPermissions() {
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.PROPRIETARIO)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      // Mock permissions data
      const mockPermissions: Permission[] = [
        // Personale
        { id: 'personnel_view', name: 'Visualizza Personale', description: 'Visualizzare lista dipendenti', category: 'personnel', isActive: true },
        { id: 'personnel_create', name: 'Crea Personale', description: 'Aggiungere nuovi dipendenti', category: 'personnel', isActive: true },
        { id: 'personnel_edit', name: 'Modifica Personale', description: 'Modificare dati dipendenti', category: 'personnel', isActive: true },
        { id: 'personnel_delete', name: 'Elimina Personale', description: 'Rimuovere dipendenti', category: 'personnel', isActive: true },
        
        // Mance
        { id: 'tips_view', name: 'Visualizza Mance', description: 'Visualizzare distribuzione mance', category: 'tips', isActive: true },
        { id: 'tips_manage', name: 'Gestisci Mance', description: 'Gestire distribuzione mance', category: 'tips', isActive: true },
        { id: 'tips_calculate', name: 'Calcola Mance', description: 'Calcolare distribuzione automatica', category: 'tips', isActive: true },
        { id: 'tips_approve', name: 'Approva Mance', description: 'Approvare distribuzioni mance', category: 'tips', isActive: true },
        
        // Turni
        { id: 'shifts_view', name: 'Visualizza Turni', description: 'Visualizzare calendario turni', category: 'shifts', isActive: true },
        { id: 'shifts_manage', name: 'Gestisci Turni', description: 'Gestire assegnazione turni', category: 'shifts', isActive: true },
        { id: 'shifts_assign', name: 'Assegna Turni', description: 'Assegnare turni ai dipendenti', category: 'shifts', isActive: true },
        { id: 'shifts_approve', name: 'Approva Turni', description: 'Approvare modifiche turni', category: 'shifts', isActive: true },
        
        // Ferie
        { id: 'leaves_view', name: 'Visualizza Ferie', description: 'Visualizzare richieste ferie', category: 'leaves', isActive: true },
        { id: 'leaves_request', name: 'Richiedi Ferie', description: 'Inviare richieste ferie', category: 'leaves', isActive: true },
        { id: 'leaves_approve', name: 'Approva Ferie', description: 'Approvare richieste ferie', category: 'leaves', isActive: true },
        { id: 'leaves_manage', name: 'Gestisci Ferie', description: 'Gestire sistema ferie', category: 'leaves', isActive: true },
        
        // Report
        { id: 'reports_basic', name: 'Report Base', description: 'Visualizzare report base', category: 'reports', isActive: true },
        { id: 'reports_advanced', name: 'Report Avanzati', description: 'Visualizzare report avanzati', category: 'reports', isActive: true },
        { id: 'reports_financial', name: 'Report Finanziari', description: 'Visualizzare report finanziari', category: 'reports', isActive: true },
        { id: 'reports_export', name: 'Esporta Report', description: 'Esportare report in vari formati', category: 'reports', isActive: true },
        
        // Admin
        { id: 'admin_users', name: 'Gestione Utenti', description: 'Gestire utenti sistema', category: 'admin', isActive: true },
        { id: 'admin_roles', name: 'Gestione Ruoli', description: 'Gestire ruoli e permessi', category: 'admin', isActive: true },
        { id: 'admin_settings', name: 'Impostazioni Sistema', description: 'Configurare sistema', category: 'admin', isActive: true },
        { id: 'admin_audit', name: 'Audit Log', description: 'Visualizzare log di sistema', category: 'admin', isActive: true },
        { id: 'admin_backup', name: 'Backup Sistema', description: 'Gestire backup sistema', category: 'admin', isActive: true }
      ]

      // Mock role permissions
      const mockRolePermissions: RolePermissions[] = [
        {
          role: UserRole.PROPRIETARIO,
          permissions: mockPermissions.map(p => p.id) // Tutti i permessi
        },
        {
          role: UserRole.DIRETTORE,
          permissions: mockPermissions.filter(p => !p.id.startsWith('admin_')).map(p => p.id)
        },
        {
          role: UserRole.MANAGER,
          permissions: [
            'personnel_view', 'personnel_create', 'personnel_edit',
            'tips_view', 'tips_manage', 'tips_calculate',
            'shifts_view', 'shifts_manage', 'shifts_assign',
            'leaves_view', 'leaves_approve', 'leaves_manage',
            'reports_basic', 'reports_advanced', 'reports_export'
          ]
        },
        {
          role: UserRole.CASSIERE,
          permissions: [
            'tips_view', 'tips_manage', 'tips_calculate',
            'shifts_view', 'shifts_manage',
            'reports_basic'
          ]
        },
        {
          role: UserRole.DIPENDENTE,
          permissions: [
            'tips_view',
            'shifts_view',
            'leaves_view', 'leaves_request',
            'reports_basic'
          ]
        }
      ]
      
      setPermissions(mockPermissions)
      setRolePermissions(mockRolePermissions)
    } catch (error) {
      console.error('Errore nel caricamento permessi:', error)
      notifyCustom('Errore nel caricamento permessi', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permissionId: string, role: UserRole) => {
    try {
      setRolePermissions(prev => prev.map(rp => {
        if (rp.role === role) {
          const hasPermission = rp.permissions.includes(permissionId)
          return {
            ...rp,
            permissions: hasPermission
              ? rp.permissions.filter(p => p !== permissionId)
              : [...rp.permissions, permissionId]
          }
        }
        return rp
      }))
      
      const permission = permissions.find(p => p.id === permissionId)
      if (permission) {
        notifyCustom(`Permesso ${permission.name} aggiornato per ${role}`, 'success')
        logReadAction('permission_updated', { permissionId, role, permissionName: permission.name })
      }
    } catch (error) {
      notifyCustom('Errore nell\'aggiornamento permesso', 'error')
    }
  }

  const getRolePermissions = (role: UserRole): string[] => {
    return rolePermissions.find(rp => rp.role === role)?.permissions || []
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personnel': return '👥'
      case 'tips': return '💰'
      case 'shifts': return '⏰'
      case 'leaves': return '🏖️'
      case 'reports': return '📊'
      case 'admin': return '🔧'
      default: return '📋'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'personnel': return 'Personale'
      case 'tips': return 'Mance'
      case 'shifts': return 'Turni'
      case 'leaves': return 'Ferie'
      case 'reports': return 'Report'
      case 'admin': return 'Amministrazione'
      default: return category
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.PROPRIETARIO: return '👑 Proprietario'
      case UserRole.DIRETTORE: return '👔 Direttore'
      case UserRole.MANAGER: return '📊 Manager'
      case UserRole.CASSIERE: return '💰 Cassiere'
      case UserRole.DIPENDENTE: return '👤 Dipendente'
      default: return role
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.PROPRIETARIO: return 'bg-purple-100 text-purple-800 border-purple-200'
      case UserRole.DIRETTORE: return 'bg-blue-100 text-blue-800 border-blue-200'
      case UserRole.MANAGER: return 'bg-green-100 text-green-800 border-green-200'
      case UserRole.CASSIERE: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case UserRole.DIPENDENTE: return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredPermissions = permissions.filter(permission => {
    return categoryFilter === 'all' || permission.category === categoryFilter
  })

  const categories = Array.from(new Set(permissions.map(p => p.category))).sort()

  const stats = {
    totalPermissions: permissions.length,
    activePermissions: permissions.filter(p => p.isActive).length,
    roles: rolePermissions.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <div className="text-xl text-gray-700">Caricamento permessi...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalPermissions}</div>
          <div className="text-sm text-blue-700">Permessi Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.activePermissions}</div>
          <div className="text-sm text-green-700">Attivi</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.roles}</div>
          <div className="text-sm text-purple-700">Ruoli</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Ruolo</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selezione Ruolo */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Gestione Permessi per Ruolo
        </h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.values(UserRole).map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 rounded-lg border-2 transition ${
                selectedRole === role
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {getRoleLabel(role)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Permessi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h4 className="text-lg font-semibold mb-4">
            Permessi per {getRoleLabel(selectedRole)}
          </h4>
          
          <div className="space-y-4">
            {filteredPermissions.map(permission => {
              const hasPermission = getRolePermissions(selectedRole).includes(permission.id)
              
              return (
                <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">{getCategoryIcon(permission.category)}</div>
                      <div>
                        <h5 className="font-medium text-gray-900">{permission.name}</h5>
                        <p className="text-sm text-gray-600">{permission.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        permission.category === 'personnel' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        permission.category === 'tips' ? 'bg-green-50 text-green-800 border-green-200' :
                        permission.category === 'shifts' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                        permission.category === 'leaves' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        permission.category === 'reports' ? 'bg-red-50 text-red-800 border-red-200' :
                        'bg-gray-50 text-gray-800 border-gray-200'
                      }`}>
                        {getCategoryLabel(permission.category)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${
                      hasPermission ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {hasPermission ? '✅ Concesso' : '❌ Negato'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPermission}
                        onChange={() => handlePermissionToggle(permission.id, selectedRole)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">
              Riepilogo Permessi
            </h3>
            <p className="text-blue-100">
              {getRoleLabel(selectedRole)} ha {getRolePermissions(selectedRole).length} permessi attivi su {permissions.length} totali
            </p>
          </div>
          <div className="text-6xl opacity-20">🔐</div>
        </div>
      </div>
    </div>
  )
}
