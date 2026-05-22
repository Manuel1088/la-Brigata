'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { ccnlMeetsMinimum } from '@/lib/permissions'
import { UserRole } from '@/types/roles'
import { isAuthPath } from '@/lib/utils'

interface MenuItem {
  icon: string
  label: string
  path: string
  color?: string
  badge?: number
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

/** true se il livello utente è >= minLevel (QA > QB > L1 > … > L6). */
function ccnlMeetsLevel(
  userCcnl: string | null | undefined,
  minLevel: string
): boolean {
  return ccnlMeetsMinimum(userCcnl, minLevel)
}

function isQbOrQaCcnl(userCcnl: string | null | undefined): boolean {
  const level = (userCcnl ?? '').toString().trim().toUpperCase()
  return level === 'QA' || level === 'QB'
}

export default function Sidebar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { userRole, canInsertTips } = usePermissions()
  const userCcnl = session?.user?.ccnlLevel ?? null
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)  // 🔓 Sempre aperta
  const [isHovered, setIsHovered] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  const showApprovalsBadge = ccnlMeetsLevel(userCcnl, 'LIVELLO_2')

  // Conteggio approvazioni da API aggregata (DB)
  useEffect(() => {
    const loadPendingApprovals = async () => {
      if (!showApprovalsBadge) {
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
  }, [showApprovalsBadge])

  // Don't show sidebar on login/register or without active session
  if (isAuthPath(pathname) || status !== 'authenticated' || !session) {
    return null
  }

  const menuSections: MenuSection[] = [
    {
      title: 'PERSONALE',
      items: [
        { icon: '💰', label: 'Le Mance', path: '/tips', color: '#FDCB6E' },
        { icon: '📄', label: 'Buste Paga', path: '/buste-paga', color: '#00B894' },
        { icon: '📅', label: 'I Miei Turni', path: '/shifts', color: '#74B9FF' },
        { icon: '🏖️', label: 'Ferie e Permessi', path: '/leaves', color: '#00B894' },
        { icon: '👤', label: 'Il Profilo', path: '/profile', color: '#2D3436' },
      ],
    },
    {
      title: 'MANCE TEAM',
      items: [
        { icon: '💰', label: 'Mance Team', path: '/team/mance', color: '#FDCB6E' },
      ],
    },
    {
      title: 'TURNI TEAM',
      items: [
        { icon: '📅', label: 'Turni Team', path: '/team/turni', color: '#74B9FF' },
      ],
    },
    {
      title: 'GESTIONE',
      items: [
        { icon: '📅', label: 'Prenotazioni', path: '/operations' },
        { icon: '🎉', label: 'Eventi e Festività', path: '/events', color: '#A29BFE' },
      ],
    },
    {
      title: 'APPROVAZIONI',
      items: [
        {
          icon: '✅',
          label: 'Approvazioni',
          path: '/approvals',
          color: '#00B894',
          badge: pendingApprovals > 0 ? pendingApprovals : undefined,
        },
      ],
    },
    {
      title: 'TEAM',
      items: [{ icon: '👥', label: 'Il Team', path: '/team', color: '#FDCB6E' }],
    },
    {
      title: 'REPORT',
      items: [
        { icon: '📊', label: 'Report', path: '/reports' },
        { icon: '📈', label: 'Analytics', path: '/analytics' },
      ],
    },
    {
      title: 'IMPOSTAZIONI',
      items: [
        { icon: '⚙️', label: 'Impostazioni', path: '/settings' },
        { icon: '🔔', label: 'Notifiche', path: '/notifications', color: '#74B9FF' },
        { icon: '💳', label: 'Abbonamenti', path: '/subscription', color: '#FDCB6E' },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        {
          icon: '🛡️',
          label: 'Admin Panel',
          path: '/admin',
        },
      ],
    },
  ]

  const isSectionVisible = (title: string): boolean => {
    switch (title) {
      case 'PERSONALE':
      case 'IMPOSTAZIONI':
        return true
      case 'MANCE TEAM':
        return canInsertTips()
      case 'TURNI TEAM':
      case 'GESTIONE':
        return ccnlMeetsLevel(userCcnl, 'LIVELLO_3')
      case 'APPROVAZIONI':
        return ccnlMeetsLevel(userCcnl, 'LIVELLO_2')
      case 'TEAM':
        return isQbOrQaCcnl(userCcnl)
      case 'REPORT':
        return ccnlMeetsLevel(userCcnl, 'LIVELLO_1')
      case 'ADMIN':
        return userRole === UserRole.ADMIN
      default:
        return false
    }
  }

  const filteredSections = menuSections.filter((section) =>
    isSectionVisible(section.title)
  )

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
      style={{ width: '250px' }} // 🎯 Larghezza custom 250px
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
