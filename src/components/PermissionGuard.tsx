'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGuardProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: ReactNode
  redirectTo?: string
  minLevel?: number
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  redirectTo = '/dashboard',
  minLevel
}: PermissionGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { can, canAny, canAll, userLevel } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    // Controllo livello minimo
    if (minLevel && userLevel < minLevel) {
      router.push(redirectTo)
      return
    }

    // Controllo permessi
    let hasAccess = false

    if (permission) {
      hasAccess = can(permission)
    } else if (permissions.length > 0) {
      hasAccess = requireAll ? canAll(permissions) : canAny(permissions)
    } else {
      hasAccess = true // Nessun controllo specifico
    }

    if (!hasAccess) {
      router.push(redirectTo)
    }
  }, [session, status, permission, permissions, requireAll, redirectTo, minLevel, userLevel, can, canAny, canAll, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Verifica permessi...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Controllo livello minimo
  if (minLevel && userLevel < minLevel) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">Non hai il livello di autorizzazione necessario per accedere a questa sezione.</p>
        </div>
      </div>
    )
  }

  // Controllo permessi
  let hasAccess = false

  if (permission) {
    hasAccess = can(permission)
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions)
  } else {
    hasAccess = true
  }

  if (!hasAccess) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">Non hai i permessi necessari per accedere a questa sezione.</p>
          <button
            onClick={() => router.push(redirectTo)}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Componenti di convenienza per controlli specifici
export function AdminOnly({ children, fallback }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permissions={['admin_users', 'admin_roles', 'admin_settings']}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function ManagerOnly({ children, fallback }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <PermissionGuard
      minLevel={8}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function EmployeeManagement({ children, fallback }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permissions={['personale_create', 'personale_edit', 'personale_delete']}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function TipsManagement({ children, fallback }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permissions={['mance_manage', 'mance_calculate', 'mance_approve']}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function ReportsAccess({ children, fallback }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permissions={['report_basic', 'report_advanced', 'report_financial']}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}
