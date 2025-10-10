'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'

interface MenuItem {
  icon: string
  label: string
  path: string
  color?: string
  badge?: number
  roles?: UserRole[]
}

interface MenuSection {
  title: string
  items: MenuItem[]
  roles?: UserRole[]
}

export default function Sidebar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole, canManageEmployees } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)  // 🔓 Sempre aperta
  const [isHovered, setIsHovered] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  // Load pending approvals count for managers
  useEffect(() => {
    const calculatePendingApprovals = () => {
      if (!canManageEmployees()) {
        setPendingApprovals(0)
        return
      }
      
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
        console.error('Errore nel calcolo approvazioni:', error)
      }
      
      setPendingApprovals(count)
    }
    
    calculatePendingApprovals()
    
    // Listener per aggiornamenti
    const handleUpdate = () => calculatePendingApprovals()
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
  }, [canManageEmployees])

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register' || !session) {
    return null
  }

  // Define menu structure based on roles
  const menuSections: MenuSection[] = [
    // PERSONALE - Tutti gli utenti
    {
      title: 'PERSONALE',
      items: [
        { 
          icon: '💰', 
          label: 'Le Mance', 
          path: '/tips', 
          color: '#FDCB6E' 
        },
        { 
          icon: '📅', 
          label: 'I Turni', 
          path: '/shifts', 
          color: '#74B9FF' 
        },
        { 
          icon: '👥', 
          label: 'Il Team', 
          path: '/team', 
          color: '#FDCB6E',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '👤', 
          label: 'Il Profilo', 
          path: '/profile', 
          color: '#2D3436' 
        },
        {
          icon: '✅', 
          label: 'Approvazioni', 
          path: '/approvals', 
          color: '#00B894',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE],
          badge: pendingApprovals > 0 ? pendingApprovals : undefined
        },
        
        { 
          icon: '🔔', 
          label: 'Notifiche', 
          path: '/notifications', 
          color: '#74B9FF' 
        }
      ]
    },
    // GESTIONE - Manager e superiori
    {
      title: 'GESTIONE',
      items: [
        { 
          icon: '📋', 
          label: 'Operazioni', 
          path: '/operations',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '📊', 
          label: 'Report', 
          path: '/reports',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '📈', 
          label: 'Analytics', 
          path: '/analytics',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '📅', 
          label: 'Calendario', 
          path: '/calendar',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
      ],
      roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
    },
    // IMPOSTAZIONI - Tutti gli utenti
    {
      title: 'IMPOSTAZIONI',
      items: [
        { 
          icon: '⚙️', 
          label: 'Impostazioni', 
          path: '/settings'
        },
        { 
          icon: '💳', 
          label: 'Abbonamenti', 
          path: '/subscription',
          color: '#FDCB6E'
        }
      ]
    },
    // AMMINISTRAZIONE - Solo Proprietario
    {
      title: 'SUPER ADMIN',
      items: [
        {
          icon: '🛡️',
          label: 'Super Admin Panel',
          path: '/admin',
          roles: [UserRole.ADMIN]  // 🛡️ SOLO ADMIN
        }
      ],
      roles: [UserRole.ADMIN]  // 🛡️ SOLO ADMIN
    }
  ]

  // Filter sections and items based on user role
  const filteredSections = menuSections
    .filter(section => !section.roles || section.roles.includes(userRole as UserRole))
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(userRole as UserRole))
    }))


  const handleMouseEnter = () => {
    setIsHovered(true)
    // 🔓 Sidebar sempre aperta - non cambiare stato
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // 🔓 Sidebar sempre aperta - non chiudere
  }

  return (
    <div 
      className={`bg-gray-50 text-gray-900 h-full flex flex-col border-r border-gray-200`}
      style={{ width: '250px' }}  // 🎯 Larghezza custom 250px
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >

      {/* Navigation */}
      <nav className="flex-1 p-4 pt-6 space-y-6">
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item, itemIndex) => {
                const isActive = pathname === item.path
                return (
                  <li key={itemIndex}>
                    <button
                      onClick={() => router.push(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-orange-500 text-white' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

    </div>
  )
}
