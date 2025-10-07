'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { UserRole } from '@/types/roles'

interface MenuItem {
  icon: string
  label: string
  path: string
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  // Load pending approvals count for managers
  useEffect(() => {
    if (canManageEmployees()) {
      // Simulate loading pending approvals
      setPendingApprovals(3)
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
          label: 'Le Mie Mance', 
          path: '/tips', 
          color: '#FDCB6E' 
        },
        { 
          icon: '📅', 
          label: 'I Miei Turni', 
          path: '/shifts', 
          color: '#74B9FF' 
        },
        { 
          icon: '👥', 
          label: 'Il Mio Team', 
          path: '/employees', 
          color: '#FDCB6E',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE],
          badge: pendingApprovals > 0 ? pendingApprovals : undefined
        },
        { 
          icon: '📊', 
          label: 'I Miei Dati', 
          path: '/me', 
          color: '#2D3436' 
        }
      ]
    },
    // GESTIONE - Manager e superiori
    {
      title: 'GESTIONE',
      items: [
        { 
          icon: '🏖️', 
          label: 'Ferie e Permessi', 
          path: '/leaves',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '📋', 
          label: 'Prenotazioni', 
          path: '/bookings',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '👥', 
          label: 'Clienti', 
          path: '/customers',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '📈', 
          label: 'Vendite', 
          path: '/sale',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        }
      ],
      roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
    },
    // AMMINISTRAZIONE - Solo Proprietario
    {
      title: 'AMMINISTRAZIONE',
      items: [
        { 
          icon: '🔧', 
          label: 'Dashboard Admin', 
          path: '/admin',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '🏪', 
          label: 'Aziende', 
          path: '/admin/companies',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '👥', 
          label: 'Utenti Piattaforma', 
          path: '/admin/candidates',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '⚙️', 
          label: 'CCNL', 
          path: '/admin/ccnl',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '📈', 
          label: 'Permessi', 
          path: '/admin/permissions',
          roles: [UserRole.PROPRIETARIO]
        }
      ],
      roles: [UserRole.PROPRIETARIO]
    }
  ]

  // Filter sections and items based on user role
  const filteredSections = menuSections
    .filter(section => !section.roles || section.roles.includes(userRole as UserRole))
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(userRole as UserRole))
    }))

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        {isSidebarOpen ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <div>
              <span className="font-bold text-lg text-gray-800">LA BRIGATA</span>
              <p className="text-xs text-gray-500">
                {userRole === UserRole.PROPRIETARIO ? 'Owner' :
                 userRole === UserRole.MANAGER ? 'Manager' : 'Team'}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-2xl mx-auto block">🍽️</span>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-4 -right-3 bg-gray-800 text-white p-1 rounded-full hover:bg-gray-700 transition"
      >
        {isSidebarOpen ? '←' : '→'}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {isSidebarOpen && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            )}
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
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      title={!isSidebarOpen ? item.label : undefined}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {isSidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-700">
        {isSidebarOpen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name || 'Utente'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {session?.user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white transition-colors"
              title="Logout"
            >
              🚪
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
