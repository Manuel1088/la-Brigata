'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'

export default function TopBar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole } = usePermissions()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [pendingNotifications, setPendingNotifications] = useState(0)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/tips': 'Le Mie Mance',
      '/shifts': 'I Miei Turni',
      '/team': 'Il Mio Team',
      '/approvals': 'Approvazioni',
      '/operations': 'Operazioni',
      '/reports': 'Report',
      '/analytics': 'Analytics',
      '/calendar': 'Calendario',
      '/notifications': 'Notifiche',
      '/settings': 'Impostazioni',
      '/admin': 'Amministrazione',
      '/me': 'I Miei Dati'
    }
    return titles[pathname] || 'La Brigata'
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      {/* Left Section - Page Title & Time */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
          <p className="text-sm text-gray-600">
            {formatDate(currentTime)}
          </p>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">🕐</span>
            <span className="font-medium">{formatTime(currentTime)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <span className="font-medium">
              {userRole === UserRole.PROPRIETARIO ? 'Proprietario' :
               userRole === UserRole.MANAGER ? 'Manager' :
               userRole === UserRole.DIRETTORE ? 'Direttore' : 'Dipendente'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notifiche"
        >
          <span className="text-xl">🔔</span>
          {pendingNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {pendingNotifications > 9 ? '9+' : pendingNotifications}
            </span>
          )}
        </button>

        {/* Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => router.push('/tips')}
            className="px-3 py-2 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors"
            title="Mance"
          >
            💰 Mance
          </button>
          
          <button
            onClick={() => router.push('/shifts')}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
            title="Turni"
          >
            📅 Turni
          </button>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {session?.user?.name || 'Utente'}
            </p>
            <p className="text-xs text-gray-600">
              {session?.user?.email || ''}
            </p>
          </div>
          
          <div className="relative group">
            <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="text-gray-600 hidden md:block">▼</span>
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <button
                  onClick={() => router.push('/me')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>👤</span>
                  <span>Il Mio Profilo</span>
                </button>
                
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>⚙️</span>
                  <span>Impostazioni</span>
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
  )
}
