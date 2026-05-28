'use client'
import { useSession } from 'next-auth/react'
import {
  canAccessPermissionManagementPage,
  type CategoryGrants,
  EMPTY_CATEGORY_GRANTS,
} from '@/lib/category-permissions'
import {
  canAccess,
  canSeeGestioneSection,
  canSeeTeamSection,
  ccnlMeetsMinimum,
  getEffectivePermissionIds,
  getPermissionsByCategory,
  getUserPermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizeCcnlLevel,
  PERMISSIONS,
} from '@/lib/permissions'
import type { CCNLLevel } from '@/lib/ccnl'

export function usePermissions() {
  const { data: session } = useSession()

  const userRole = session?.user?.role
  const userLevel = session?.user?.level || 0
  const ccnlLevel = session?.user?.ccnlLevel ?? null
  const userId = session?.user?.id as string | undefined
  const upperRole = (userRole || '').toString().toUpperCase()
  const normalizedCcnl = normalizeCcnlLevel(ccnlLevel)
  const dbGrantedIds = session?.user?.dbGrantedPermissionIds ?? []
  const categoryGrants: CategoryGrants =
    session?.user?.categoryGrants ?? EMPTY_CATEGORY_GRANTS

  const can = (permission: string): boolean => {
    if (!userRole) return false
    if (upperRole === 'ADMIN') return true
    return canAccess(userRole, userLevel, permission, ccnlLevel, dbGrantedIds)
  }

  const canAny = (permissions: string[]): boolean => {
    if (!userRole) return false
    if (upperRole === 'ADMIN') return true
    return hasAnyPermission(userRole, permissions, ccnlLevel, dbGrantedIds)
  }

  const canAll = (permissions: string[]): boolean => {
    if (!userRole) return false
    if (upperRole === 'ADMIN') return true
    return hasAllPermissions(userRole, permissions, ccnlLevel, dbGrantedIds)
  }

  const meetsCcnlMinimum = (minimumLevel: CCNLLevel | string): boolean => {
    if (upperRole === 'ADMIN') return true
    return ccnlMeetsMinimum(ccnlLevel, minimumLevel)
  }

  const getPermissions = (): (typeof PERMISSIONS)[string][] => {
    if (!userRole) return []
    return getUserPermissions(userRole, ccnlLevel)
  }

  const getPermissionsByCat = (category: string): (typeof PERMISSIONS)[string][] => {
    if (!userRole) return []
    return getPermissionsByCategory(userRole, category, ccnlLevel)
  }

  const canManageEmployees = (): boolean => {
    return (
      can('ferie_approve') ||
      can('personale_create') ||
      can('personale_edit') ||
      can('turni_assign')
    )
  }

  const canManageTips = (): boolean => {
    return canAny(['mance_manage', 'mance_calculate', 'mance_approve'])
  }

  // ✅ Task permissions
  const canViewTasks = (): boolean => can('task_view')
  const canCompleteTasks = (): boolean => can('task_complete')
  const canCreateTasks = (): boolean => can('task_create')
  const canManageTasks = (): boolean => can('task_manage')
  const canAssignTaskToRole = (): boolean => can('task_assign_role')

  const canGestioneTurni = (): boolean => {
    return (
      can('gestione_turni') ||
      canAny(['turni_manage', 'turni_assign', 'turni_approve'])
    )
  }

  const canManageShifts = (): boolean => canGestioneTurni()

  const canManageLeaves = (): boolean => {
    return canAny(['ferie_approve', 'ferie_view_all', 'ferie_manage'])
  }

  const canViewReports = (): boolean => {
    return canAny(['report_basic', 'report_advanced', 'report_financial'])
  }

  const canAccessAdmin = (): boolean => {
    return canAny(['admin_users', 'admin_roles', 'admin_settings'])
  }

  const canManagePermissionCategories = (): boolean => {
    if (!userId || !userRole) return false
    return canAccessPermissionManagementPage({
      id: userId,
      role: userRole,
      level: userLevel,
      ccnlLevel,
      department: session?.user?.department,
      restaurantId: session?.user?.restaurantId,
      categoryGrants,
    })
  }

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

  const canCreateShift = (): boolean => canGestioneTurni()
  const canAssignShift = (): boolean => canGestioneTurni()
  const canApproveShift = (): boolean => can('turni_approve')
  const canExportShifts = (): boolean => can('turni_export')
  const canRequestShiftSwap = (): boolean => can('turni_swap_request')

  const canRequestLeave = (): boolean => can('ferie_request')
  const canApproveLeave = (): boolean => can('ferie_approve')
  const canViewAllLeaves = (): boolean => can('ferie_view_all')
  const canManageLeaveSystem = (): boolean => can('ferie_manage')
  const canExportLeaves = (): boolean => can('ferie_export')
  const canViewLeaveCalendar = (): boolean => can('ferie_calendar')
  const canManageLeaveBalance = (): boolean => can('ferie_balance')

  const canViewPayroll = (): boolean => can('payroll_view')
  const canManagePayroll = (): boolean => can('payroll_manage')
  const canScanPayroll = (): boolean => can('payroll_scan')

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
    userRole,
    userLevel,
    ccnlLevel: normalizedCcnl,
    categoryGrants,
    dbGrantedPermissionIds: dbGrantedIds,
    isAuthenticated: !!session,

    can,
    canAny,
    canAll,
    meetsCcnlMinimum,
    canSeeTeamSection: () => canSeeTeamSection(ccnlLevel, userRole),
    canSeeGestioneSection: () => canSeeGestioneSection(ccnlLevel, userRole),
    getPermissions,
    getPermissionsByCat,
    getEffectivePermissionIds: () => {
      if (!userRole) return []
      const base = getEffectivePermissionIds(userRole, ccnlLevel)
      return [...new Set([...base, ...dbGrantedIds])]
    },

    canManageEmployees,
    canManageTips,
    canViewTasks,
    canCompleteTasks,
    canCreateTasks,
    canManageTasks,
    canAssignTaskToRole,
    canGestioneTurni,
    canManageShifts,
    canManageLeaves,
    canViewReports,
    canAccessAdmin,
    canManagePermissionCategories,

    canCreateEmployee,
    canEditEmployee,
    canDeleteEmployee,
    canActivateEmployee,
    canExportEmployees,
    canManageSalary,

    canInsertTips,
    canCalculateTips,
    canApproveTips,
    canViewTipsHistory,
    canExportTips,

    canCreateShift,
    canAssignShift,
    canApproveShift,
    canExportShifts,
    canRequestShiftSwap,

    canRequestLeave,
    canApproveLeave,
    canViewAllLeaves,
    canManageLeaveSystem,
    canExportLeaves,
    canViewLeaveCalendar,
    canManageLeaveBalance,

    canViewPayroll,
    canManagePayroll,
    canScanPayroll,

    canViewBasicReports,
    canViewAdvancedReports,
    canViewFinancialReports,
    canExportReports,
    canViewAnalytics: () => can('report_advanced'),
    canViewPredictions: () => can('report_advanced'),

    canManageUsers,
    canManageCompanies: () => can('admin_companies'),
    canManageCandidates: () => can('admin_candidates'),
    canManageCCNL: () => can('admin_ccnl'),
    canManageRoles,
    canManageSettings,
    canViewAudit,
    canManageBackup,

    canEditPersonal: () => can('edit_personal_info'),
    canManageCompany: () => can('manage_company_settings'),
  }
}
