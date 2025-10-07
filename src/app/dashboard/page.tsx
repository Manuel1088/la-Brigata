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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole, canManageEmployees } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Load pending approvals count for managers
  useEffect(() => {
    if (canManageEmployees()) {
      // Simulate loading pending approvals
      setPendingApprovals(3)
    }
  }, [canManageEmployees])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    )
  }

  if (!session) return null

  // Define menu structure based on roles
  const menuSections: MenuSection[] = [
    // PERSONALE - Tutti gli utenti
    {
      title: 'PERSONALE',
      items: [
        { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
        { icon: '👤', label: 'Il Mio Profilo', path: '/me' },
        { icon: '📅', label: 'I Miei Turni', path: '/shifts' },
        { icon: '💰', label: 'Le Mie Mance', path: '/tips' },
        { icon: '🏖️', label: 'Ferie & Permessi', path: '/leaves' }
      ]
    },
    // TEAM - Tutti gli utenti
    {
      title: 'TEAM',
      items: [
        { icon: '👥', label: 'Il Team', path: '/team' },
        { icon: '💬', label: 'Chat', path: '/chat' }
      ]
    },
    // GESTIONE - Solo Manager+
    {
      title: 'GESTIONE',
      items: [
        { 
          icon: '👔', 
          label: 'Gestisci Team', 
          path: '/team/manage',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '🎯', 
          label: 'Operazioni', 
          path: '/operations',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '✅', 
          label: 'Approvazioni', 
          path: '/approvals',
          badge: pendingApprovals,
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '📊', 
          label: 'Report', 
          path: '/reports',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        }
      ],
      roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
    },
    // BUSINESS - Solo Owner
    {
      title: 'BUSINESS',
      items: [
        { 
          icon: '💼', 
          label: 'Business Intelligence', 
          path: '/business',
          roles: [UserRole.PROPRIETARIO]
        }
      ],
      roles: [UserRole.PROPRIETARIO]
    },
    // CONFIGURAZIONE - Manager+
    {
      title: 'CONFIGURAZIONE',
      items: [
        { 
          icon: '⚙️', 
          label: 'Impostazioni Ristorante', 
          path: '/settings/restaurant',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        },
        { 
          icon: '🏢', 
          label: 'Azienda', 
          path: '/settings/company',
          roles: [UserRole.PROPRIETARIO]
        }
      ],
      roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
    },
    // AMMINISTRAZIONE - Solo Super Admin
    {
      title: 'AMMINISTRAZIONE',
      items: [
        { 
          icon: '🔧', 
          label: 'Dashboard Admin', 
          path: '/admin/dashboard',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '🏪', 
          label: 'Ristoranti', 
          path: '/admin/customers',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '👥', 
          label: 'Utenti Piattaforma', 
          path: '/admin/users',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '⚙️', 
          label: 'Piattaforma', 
          path: '/admin/platform',
          roles: [UserRole.PROPRIETARIO]
        },
        { 
          icon: '📈', 
          label: 'Analytics', 
          path: '/admin/analytics',
          roles: [UserRole.PROPRIETARIO]
        }
      ],
      roles: [UserRole.PROPRIETARIO]
    }
  ]

  // Filter sections and items based on user role
  const filteredSections = menuSections
    .filter(section => {
      if (!section.roles) return true
      return section.roles.includes(userRole)
    })
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.roles) return true
        return item.roles.includes(userRole)
      })
    }))
    .filter(section => section.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-100 flex">
      
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        bg-white shadow-lg transition-all duration-300 flex flex-col
        fixed h-screen z-50
      `}>
        
        {/* Logo/Brand */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded transition"
            >
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {filteredSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-6">
              {/* Section Title */}
              {isSidebarOpen && (
                <div className="px-4 mb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
              )}
              
              {/* Section Items */}
              <ul className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.path
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => router.push(item.path)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-3 rounded-lg
                          transition-all duration-200 relative
                          ${isActive 
                            ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                          ${!isSidebarOpen && 'justify-center'}
                        `}
                        title={!isSidebarOpen ? item.label : undefined}
                      >
                        <span className="text-2xl">{item.icon}</span>
                        {isSidebarOpen && (
                          <>
                            <span className="text-sm flex-1 text-left">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                        {!isSidebarOpen && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-4">
          {isSidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl text-white font-bold">
                  {session.user?.avatar as any || session.user?.name?.charAt(0) || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session.user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
              >
                <span>🚪</span>
                <span>Esci</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl text-white font-bold">
                {session.user?.avatar as any || session.user?.name?.charAt(0) || '👤'}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex justify-center text-2xl hover:bg-red-50 p-2 rounded-lg transition"
                title="Esci"
              >
                🚪
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* Main Content Area */}
      <div className={`
        flex-1 transition-all duration-300
        ${isSidebarOpen ? 'ml-64' : 'ml-20'}
      `}>
        
        {/* Top Header */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>🏠</span>
                  <span>/</span>
                  <span className="font-medium text-gray-900">
                    {pathname === '/dashboard' ? 'Dashboard' :
                     pathname === '/me' ? 'Profilo' :
                     pathname === '/shifts' ? 'Turni' :
                     pathname === '/tips' ? 'Mance' :
                     pathname === '/leaves' ? 'Ferie' :
                     pathname === '/team' ? 'Team' :
                     pathname === '/team/manage' ? 'Gestisci Team' :
                     pathname === '/operations' ? 'Operazioni' :
                     pathname === '/approvals' ? 'Approvazioni' :
                     pathname === '/reports' ? 'Report' :
                     pathname === '/business' ? 'Business' :
                     pathname.startsWith('/admin') ? 'Admin' :
                     'Pagina'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Quick Actions */}
                <button 
                  className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  onClick={() => {/* Open command palette */}}
                >
                  <span>⌘K</span>
                  <span>Quick Actions</span>
                </button>

                {/* Notifications */}
                <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                  <span className="text-2xl">🔔</span>
                  {pendingApprovals > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Date */}
                <div className="hidden lg:block text-sm text-gray-600">
                  {new Date().toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>

      </div>

      {/* Command Palette Hint (Keyboard Shortcut) */}
      <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm hidden md:block">
        <span className="text-gray-400">Premi</span> <kbd className="bg-gray-700 px-2 py-1 rounded ml-1">⌘K</kbd> <span className="text-gray-400">per azioni rapide</span>
      </div>

    </div>
  )
}
