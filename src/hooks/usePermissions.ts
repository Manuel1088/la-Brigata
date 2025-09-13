'use client'
import { useSession } from 'next-auth/react'
import { hasPermission, hasAnyPermission, hasAllPermissions, canAccess, getUserPermissions, getPermissionsByCategory, PERMISSIONS } from '@/lib/permissions'

export function usePermissions() {
  const { data: session } = useSession()
  
  const userRole = (session?.user as any)?.role
  const userLevel = (session?.user as any)?.level || 0
  const userId = session?.user?.id as string | undefined

  // Lettura override permessi per-utente da localStorage
  const getUserOverrides = (): string[] => {
    if (!userId) return []
    try {
      const raw = localStorage.getItem('user_permissions_v1')
      if (!raw) return []
      const map = JSON.parse(raw) as Record<string, { permissions: string[] }>
      return map[userId]?.permissions || []
    } catch {
      return []
    }
  }

  // Funzioni di controllo permessi
  const can = (permission: string): boolean => {
    if (!userRole) return false
    if (userRole === 'ADMIN' || userRole === 'PROPRIETARIO') return true
    // Role-based + override per utente
    return canAccess(userRole, userLevel, permission) || getUserOverrides().includes(permission)
  }

  const canAny = (permissions: string[]): boolean => {
    if (!userRole) return false
    return hasAnyPermission(userRole, permissions)
  }

  const canAll = (permissions: string[]): boolean => {
    if (!userRole) return false
    return hasAllPermissions(userRole, permissions)
  }

  // Funzioni di utilità
  const getPermissions = (): typeof PERMISSIONS[string][] => {
    if (!userRole) return []
    return getUserPermissions(userRole)
  }

  const getPermissionsByCat = (category: string): typeof PERMISSIONS[string][] => {
    if (!userRole) return []
    return getPermissionsByCategory(userRole, category)
  }

  // Controlli specifici per sezioni
  const canManageEmployees = (): boolean => {
    return canAny(['personale_view', 'personale_create', 'personale_edit'])
  }

  const canManageTips = (): boolean => {
    return canAny(['mance_manage', 'mance_calculate', 'mance_approve'])
  }

  const canManageShifts = (): boolean => {
    return canAny(['turni_manage', 'turni_assign', 'turni_approve'])
  }

  const canManageLeaves = (): boolean => {
    return canAny(['ferie_approve', 'ferie_view_all', 'ferie_manage'])
  }

  const canViewReports = (): boolean => {
    return canAny(['report_basic', 'report_advanced', 'report_financial'])
  }

  const canAccessAdmin = (): boolean => {
    return canAny(['admin_users', 'admin_roles', 'admin_settings'])
  }

  // Controlli per azioni specifiche
  const canCreateEmployee = (): boolean => can('personale_create')
  const canEditEmployee = (): boolean => can('personale_edit')
  const canDeleteEmployee = (): boolean => can('personale_delete')
  const canActivateEmployee = (): boolean => can('personale_activate')
  const canExportEmployees = (): boolean => can('personale_export')
  const canManageSalary = (): boolean => can('personale_salary')

  const canInsertTips = (): boolean => can('mance_manage')
  const canCalculateTips = (): boolean => can('mance_calculate')
  const canApproveTips = (): boolean => can('mance_approve')
  const canViewTipsHistory = (): boolean => can('mance_history')
  const canExportTips = (): boolean => can('mance_export')

  const canCreateShift = (): boolean => can('turni_manage')
  const canAssignShift = (): boolean => can('turni_assign')
  const canApproveShift = (): boolean => can('turni_approve')
  const canExportShifts = (): boolean => can('turni_export')

  const canRequestLeave = (): boolean => can('ferie_request')
  const canApproveLeave = (): boolean => can('ferie_approve')
  const canViewAllLeaves = (): boolean => can('ferie_view_all')
  const canManageLeaveSystem = (): boolean => can('ferie_manage')
  const canExportLeaves = (): boolean => can('ferie_export')
  const canViewLeaveCalendar = (): boolean => can('ferie_calendar')
  const canManageLeaveBalance = (): boolean => can('ferie_balance')

  const canViewBasicReports = (): boolean => can('report_basic')
  const canViewAdvancedReports = (): boolean => can('report_advanced')
  const canViewFinancialReports = (): boolean => can('report_financial')
  const canExportReports = (): boolean => can('report_export')

  const canManageUsers = (): boolean => can('admin_users')
  const canManageRoles = (): boolean => can('admin_roles')
  const canManageSettings = (): boolean => can('admin_settings')
  const canViewAudit = (): boolean => can('admin_audit')
  const canManageBackup = (): boolean => can('admin_backup')

  return {
    // Stato utente
    userRole,
    userLevel,
    isAuthenticated: !!session,
    
    // Funzioni base
    can,
    canAny,
    canAll,
    getPermissions,
    getPermissionsByCat,
    
    // Controlli per sezioni
    canManageEmployees,
    canManageTips,
    canManageShifts,
    canManageLeaves,
    canViewReports,
    canAccessAdmin,
    
    // Controlli specifici - Personale
    canCreateEmployee,
    canEditEmployee,
    canDeleteEmployee,
    canActivateEmployee,
    canExportEmployees,
    canManageSalary,
    
    // Controlli specifici - Mance
    canInsertTips,
    canCalculateTips,
    canApproveTips,
    canViewTipsHistory,
    canExportTips,
    
    // Controlli specifici - Turni
    canCreateShift,
    canAssignShift,
    canApproveShift,
    canExportShifts,
    
    // Controlli specifici - Ferie
    canRequestLeave,
    canApproveLeave,
    canViewAllLeaves,
    canManageLeaveSystem,
    canExportLeaves,
    canViewLeaveCalendar,
    canManageLeaveBalance,
    
    // Controlli specifici - Report
    canViewBasicReports,
    canViewAdvancedReports,
    canViewFinancialReports,
    canExportReports,
    
    // Controlli specifici - Admin
    canManageUsers,
    canManageRoles,
    canManageSettings,
    canViewAudit,
    canManageBackup
  }
}
