'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'
import { PendingEmploymentsBadge } from './PendingEmploymentsBadge'
import { RestaurantSelector } from './RestaurantSelector'
import { NotificationCenter } from './NotificationCenter'

export default function TopBar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole } = usePermissions()
  const [pendingNotifications, setPendingNotifications] = useState(0)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)

  // Contatore allineato a GET /api/notifications (stessa fonte del pannello)
  useEffect(() => {
    const calculatePendingNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' })
        if (!res.ok) {
          setPendingNotifications(0)
          return
        }
        const data = await res.json()
        if (typeof data.meta?.unread === 'number') {
          setPendingNotifications(data.meta.unread)
          return
        }
        const uid = session?.user?.id
        const list = (data.notifications ?? []) as Array<{
          userId?: string
          isRead: boolean
        }>
        const mine = uid
          ? list.filter((n) => !n.userId || n.userId === uid)
          : list
        setPendingNotifications(mine.filter((n) => !n.isRead).length)
      } catch {
        setPendingNotifications(0)
      }
    }

    void calculatePendingNotifications()

    const handleUpdate = () => void calculatePendingNotifications()
    window.addEventListener('notifications_updated', handleUpdate)
    return () => {
      window.removeEventListener('notifications_updated', handleUpdate)
    }
  }, [session?.user?.id])

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
        'buste-paga': 'Buste Paga',
        'shifts': 'Turni',
        'leaves': 'Ferie e Permessi',
        'team': 'Team',
        'mance': 'Mance Team',
        'turni': 'Turni Team',
        'approvals': 'Approvazioni',
        'operations': 'Prenotazioni',
        'events': 'Eventi e Festività',
        'reports': 'Report',
        'analytics': 'Analytics',
        'notifications': 'Notifiche',
        'settings': 'Impostazioni',
        'company': 'Company',
        'subscription': 'Abbonamenti',
        'admin': 'Amministrazione',
        'me': 'Profilo',
        'profile': 'Profilo',
        'employees': 'Dipendenti'
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
    <>
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
              <img src="/laBrigata.it.svg" alt="La Brigata" className="h-8 w-auto" />
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-gray-900">La Brigata</span>
              </div>
            </button>
            
            {/* Breadcrumb rimosso */}
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
              onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
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

            {/* Settings Button */}
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Impostazioni"
            >
              <span className="text-xl">⚙️</span>
            </button>

            {/* User Info + Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              {/* User Avatar & Name - Clickable */}
              <button 
                onClick={() => router.push('/profile')}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 transition-colors"
                title="Vai al Profilo"
              >
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
                    {userRole === UserRole.ADMIN ? 'Amministratore' :
                     userRole === UserRole.PROPRIETARIO ? 'Proprietario' :
                     userRole === UserRole.MANAGER ? 'Manager' :
                     userRole === UserRole.DIRETTORE ? 'Direttore' : 'Dipendente'}
                  </p>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <span className="text-xl">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Notification Center Sidebar con Overlay - FUORI dal TopBar */}
      {isNotificationCenterOpen && (
        <>
          {/* Overlay scuro per chiudere cliccando fuori */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            onClick={() => setIsNotificationCenterOpen(false)}
          />
          
          {/* Pannello Notifiche - Z-index più alto */}
          <div className="fixed top-0 right-0 h-full z-[70]">
            <NotificationCenter 
              isOpen={isNotificationCenterOpen}
              onClose={() => setIsNotificationCenterOpen(false)}
              userId={session?.user?.id}
              userRole={String(userRole)}
              department={session?.user?.department}
            />
          </div>
        </>
      )}
    </>
  )
}
