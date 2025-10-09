'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'
import { PendingEmploymentsBadge } from './PendingEmploymentsBadge'
import { RestaurantSelector } from './RestaurantSelector'

export default function TopBar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole } = usePermissions()
  const [pendingNotifications, setPendingNotifications] = useState(0)

  // Calculate pending notifications
  useEffect(() => {
    const calculatePendingNotifications = () => {
      let count = 0
      
      try {
        // Conteggio richieste ferie
        const leaveRequests = JSON.parse(localStorage.getItem('leave_requests') || '[]')
        count += leaveRequests.filter((req: any) => req.status === 'PENDING').length
        
        // Conteggio richieste swap turni
        const swapRequests = JSON.parse(localStorage.getItem('shift_swap_requests_v1') || '[]')
        count += swapRequests.filter((req: any) => req.status === 'PENDING').length
        
        // Conteggio richieste dipendenti
        const employeeRequests = JSON.parse(localStorage.getItem('employee_requests') || '[]')
        count += employeeRequests.filter((req: any) => req.status === 'PENDING').length
        
        // Conteggio richieste payroll
        const payrollRequests = JSON.parse(localStorage.getItem('payroll_requests') || '[]')
        count += payrollRequests.filter((req: any) => req.status === 'PENDING').length
      } catch (error) {
        console.error('Errore nel calcolo notifiche:', error)
      }
      
      setPendingNotifications(count)
    }
    
    calculatePendingNotifications()
    
    // Listener per aggiornamenti
    const handleUpdate = () => calculatePendingNotifications()
    window.addEventListener('approvals_updated', handleUpdate)
    window.addEventListener('leave_system_updated', handleUpdate)
    window.addEventListener('shift_swaps_updated', handleUpdate)
    window.addEventListener('employee_requests_updated', handleUpdate)
    window.addEventListener('payroll_requests_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('approvals_updated', handleUpdate)
      window.removeEventListener('leave_system_updated', handleUpdate)
      window.removeEventListener('shift_swaps_updated', handleUpdate)
      window.removeEventListener('employee_requests_updated', handleUpdate)
      window.removeEventListener('payroll_requests_updated', handleUpdate)
    }
  }, [])

  // Don't show topbar on login/register pages
  if (pathname === '/login' || pathname === '/register' || !session) {
    return null
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Dashboard', path: '/dashboard' }]
    
    if (segments.length > 0) {
      const currentPath = segments.join('/')
      const pageNames: Record<string, string> = {
        'tips': 'Mance',
        'shifts': 'Turni',
        'team': 'Team',
        'approvals': 'Approvazioni',
        'operations': 'Operazioni',
        'reports': 'Report',
        'analytics': 'Analytics',
        'calendar': 'Calendario',
        'notifications': 'Notifiche',
        'settings': 'Impostazioni',
        'admin': 'Amministrazione',
        'me': 'Profilo'
      }
      
      const pageName = pageNames[segments[0]] || segments[0]
      breadcrumbs.push({ label: pageName, path: `/${currentPath}` })
    }
    
    return breadcrumbs
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo + Brand + Breadcrumb */}
          <div className="flex items-center gap-4">
            {/* Logo + Brand */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
              title="Torna alla Dashboard"
            >
              <span className="text-2xl">🍽️</span>
              <div className="hidden sm:block">
                <span className="font-bold text-lg text-gray-900">La Brigata</span>
                <p className="text-xs text-gray-600 leading-none">
                  {userRole === UserRole.PROPRIETARIO ? 'Owner' :
                   userRole === UserRole.MANAGER ? 'Manager' :
                   userRole === UserRole.DIRETTORE ? 'Direttore' : 'Team'}
                </p>
              </div>
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <span className="text-gray-400">📍</span>
              {getBreadcrumbs().map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="text-gray-400">/</span>}
                  <button
                    onClick={() => router.push(crumb.path)}
                    className={`hover:text-gray-900 transition-colors ${
                      index === getBreadcrumbs().length - 1 
                        ? 'text-gray-900 font-medium' 
                        : 'text-gray-600'
                    }`}
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Restaurant Selector, Pending Employments, Notifications, Help, User */}
          <div className="flex items-center gap-3">
            {/* Restaurant Selector - Solo se ha multiple employments */}
            <RestaurantSelector />
            
            {/* Pending Employments Badge - Solo per admin/proprietario/manager */}
            {(userRole === UserRole.ADMIN || 
              userRole === UserRole.PROPRIETARIO || 
              userRole === UserRole.MANAGER || 
              userRole === UserRole.DIRETTORE) && (
              <PendingEmploymentsBadge />
            )}
            
            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Centro Notifiche"
            >
              <span className="text-xl">🔔</span>
              {pendingNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {pendingNotifications > 9 ? '9+' : pendingNotifications}
                </span>
              )}
            </button>

            {/* Help/Docs */}
            <button
              onClick={() => {
                // Aprire documentazione o help
                window.open('/docs', '_blank')
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Documentazione e Aiuto"
            >
              <span className="text-xl">❓</span>
            </button>

            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name || 'Utente'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {userRole === UserRole.PROPRIETARIO ? 'Proprietario' :
                     userRole === UserRole.MANAGER ? 'Manager' :
                     userRole === UserRole.DIRETTORE ? 'Direttore' : 'Dipendente'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session?.user?.name || 'Utente'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {session?.user?.email || ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {userRole === UserRole.PROPRIETARIO ? 'Proprietario' :
                         userRole === UserRole.MANAGER ? 'Manager' :
                         userRole === UserRole.DIRETTORE ? 'Direttore' : 'Dipendente'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => router.push('/me')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <span>👤</span>
                    <span>Il Mio Profilo</span>
                  </button>
                  
                  <button
                    onClick={() => router.push('/settings')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <span>⚙️</span>
                    <span>Impostazioni</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-2"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
