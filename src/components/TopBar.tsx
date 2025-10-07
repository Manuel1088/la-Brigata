'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'

export default function TopBar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole } = usePermissions()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [pendingNotifications, setPendingNotifications] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate pending notifications
  useEffect(() => {
    const calculatePendingNotifications = () => {
      let count = 0
      
      try {
        const leaveRequests = JSON.parse(localStorage.getItem('leave_requests') || '[]')
        count += leaveRequests.filter((req: any) => req.status === 'PENDING').length
        
        const swapRequests = JSON.parse(localStorage.getItem('shift_swap_requests_v1') || '[]')
        count += swapRequests.filter((req: any) => req.status === 'PENDING').length
        
        const employeeRequests = JSON.parse(localStorage.getItem('employee_requests') || '[]')
        count += employeeRequests.filter((req: any) => req.status === 'PENDING').length
        
        const payrollRequests = JSON.parse(localStorage.getItem('payroll_requests') || '[]')
        count += payrollRequests.filter((req: any) => req.status === 'PENDING').length
      } catch (error) {
        console.error('Errore nel calcolo notifiche:', error)
      }
      
      setPendingNotifications(count)
    }
    
    calculatePendingNotifications()
    
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
        'admin': 'Admin',
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
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo + Breadcrumb */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LB</span>
              </div>
              <span className="hidden sm:block font-semibold text-gray-900">La Brigata</span>
            </div>
            
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
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

          {/* Right Section - Search, Notifications, User */}
          <div className="flex items-center gap-2">
            {/* Search Button - Hidden on mobile */}
            <div className="hidden sm:block" ref={searchRef}>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
                <kbd className="hidden lg:inline-flex items-center px-2 py-1 text-xs bg-white border border-gray-300 rounded">
                  ⌘K
                </kbd>
              </button>
              
              {/* Search Modal */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 mx-4 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search pages, features, or help..."
                        className="flex-1 text-sm outline-none"
                        autoFocus
                      />
                      <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                        ESC
                      </kbd>
                    </div>
                    <div className="text-xs text-gray-500">
                      Search functionality coming soon...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notifiche"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              {pendingNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {pendingNotifications > 9 ? '9+' : pendingNotifications}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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
                      onClick={() => {
                        router.push('/me')
                        setIsUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profilo</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        router.push('/settings')
                        setIsUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Impostazioni</span>
                    </button>
                    
                    <div className="border-t border-gray-100 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
