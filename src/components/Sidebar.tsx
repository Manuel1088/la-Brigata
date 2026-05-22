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
  excludeRoles?: UserRole[]
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
  const {
    userRole,
    canManageEmployees,
    canSeeTeamSection,
    canSeeGestioneSection,
  } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)  // 🔓 Sempre aperta
  const [isHovered, setIsHovered] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  // Conteggio approvazioni da API aggregata (DB)
  useEffect(() => {
    const loadPendingApprovals = async () => {
      if (!canManageEmployees()) {
        setPendingApprovals(0)
        return
      }

      try {
        const res = await fetch('/api/approvals/pending-count', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setPendingApprovals(typeof data.total === 'number' ? data.total : 0)
        } else {
          setPendingApprovals(0)
        }
      } catch (error) {
        console.error('Errore nel caricamento approvazioni:', error)
        setPendingApprovals(0)
      }
    }

    loadPendingApprovals()

    const handleUpdate = () => loadPendingApprovals()
    window.addEventListener('approvals_updated', handleUpdate)
    window.addEventListener('leave_system_updated', handleUpdate)
    window.addEventListener('shift_swaps_updated', handleUpdate)
    window.addEventListener('employee_requests_updated', handleUpdate)

    return () => {
      window.removeEventListener('approvals_updated', handleUpdate)
      window.removeEventListener('leave_system_updated', handleUpdate)
      window.removeEventListener('shift_swaps_updated', handleUpdate)
      window.removeEventListener('employee_requests_updated', handleUpdate)
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
          color: '#FDCB6E',
          // Solo dipendenti che lavorano (esclusi ADMIN e PROPRIETARIO)
          excludeRoles: [UserRole.ADMIN, UserRole.PROPRIETARIO]
        },
        { 
          icon: '📄', 
          label: 'Buste Paga', 
          path: '/buste-paga', 
          color: '#00B894',
          // Solo dipendenti con stipendio (esclusi ADMIN e PROPRIETARIO)
          excludeRoles: [UserRole.ADMIN, UserRole.PROPRIETARIO]
        },
        { 
          icon: '📅', 
          label: 'I Miei Turni', 
          path: '/shifts', 
          color: '#74B9FF',
          // Solo per chi lavora fisicamente (esclusi ADMIN e PROPRIETARIO)
          excludeRoles: [UserRole.ADMIN, UserRole.PROPRIETARIO]
        },
        { 
          icon: '🏖️', 
          label: 'Ferie e Permessi', 
          path: '/leaves', 
          color: '#00B894',
          // Solo dipendenti che lavorano (esclusi ADMIN e PROPRIETARIO)
          excludeRoles: [UserRole.ADMIN, UserRole.PROPRIETARIO]
        },
        { 
          icon: '👤', 
          label: 'Il Profilo', 
          path: '/profile', 
          color: '#2D3436'
          // Tutti hanno profilo (nessuna esclusione)
        }
      ]
    },
    // TEAM — CCNL LIVELLO_2+ (permessi da getCcnlPermissions)
    {
      title: 'TEAM',
      items: [
        { icon: '👥', label: 'Il Team', path: '/team', color: '#FDCB6E' },
        { icon: '💰', label: 'Mance Team', path: '/team/mance', color: '#FDCB6E' },
        { icon: '📅', label: 'Turni Team', path: '/team/turni', color: '#74B9FF' },
        {
          icon: '✅',
          label: 'Approvazioni',
          path: '/approvals',
          color: '#00B894',
          badge: pendingApprovals > 0 ? pendingApprovals : undefined,
        },
      ],
    },
    // GESTIONE — CCNL LIVELLO_1+
    {
      title: 'GESTIONE',
      items: [
        { icon: '📅', label: 'Prenotazioni', path: '/operations' },
        { icon: '🎉', label: 'Eventi e Festività', path: '/events', color: '#A29BFE' },
        { icon: '📊', label: 'Report', path: '/reports' },
        { icon: '📈', label: 'Analytics', path: '/analytics' },
      ],
    },
    // AZIENDA - Solo Proprietari/Manager
    {
      title: 'AZIENDA',
      items: [
        { 
          icon: '🏢', 
          label: 'Company', 
          path: '/company',
          color: '#FDCB6E',
          roles: [UserRole.MANAGER, UserRole.PROPRIETARIO, UserRole.DIRETTORE]
        }
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
          icon: '🔔', 
          label: 'Notifiche', 
          path: '/notifications', 
          color: '#74B9FF' 
        },
        { 
          icon: '💳', 
          label: 'Abbonamenti', 
          path: '/subscription',
          color: '#FDCB6E'
        }
      ]
    },
    // ADMIN - Solo team La Brigada (gestione piattaforma)
    {
      title: 'ADMIN',
      items: [
        {
          icon: '🛡️',
          label: 'Admin Panel',
          path: '/admin',
          roles: [UserRole.ADMIN]
        }
      ],
      roles: [UserRole.ADMIN]
    }
  ]

  const showTeam = canSeeTeamSection()
  const showGestione = canSeeGestioneSection()

  const filteredSections = menuSections
    .filter((section) => {
      if (section.title === 'TEAM') return showTeam
      if (section.title === 'GESTIONE') return showGestione
      if (section.roles) return section.roles.includes(userRole as UserRole)
      return true
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const roleMatch = !item.roles || item.roles.includes(userRole as UserRole)
        const notExcluded =
          !item.excludeRoles || !item.excludeRoles.includes(userRole as UserRole)
        return roleMatch && notExcluded
      }),
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
      className={`bg-white text-gray-900 h-full flex flex-col border-r border-gray-200`}
      style={{ width: '250px' }}  // 🎯 Larghezza custom 250px
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >

      {/* Navigation */}
      <nav className="flex-1 p-4 pt-4 space-y-3">
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item, itemIndex) => {
                const isActive = pathname === item.path
                return (
                  <li key={itemIndex}>
                    <button
                      onClick={() => router.push(item.path)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg transition-all relative ${
                        isActive 
                          ? 'bg-gray-100 text-gray-900 font-semibold shadow-sm border-l-4 border-orange-500' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
