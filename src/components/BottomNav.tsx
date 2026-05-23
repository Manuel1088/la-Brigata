'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Calendar, Coins, Home, User } from 'lucide-react'
import { isAuthPath } from '@/lib/utils'

const TABS = [
  { href: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' || p === '/' },
  { href: '/shifts', label: 'Turni', icon: Calendar, match: (p: string) => p === '/shifts' || p.startsWith('/shifts/') },
  { href: '/tips', label: 'Mance', icon: Coins, match: (p: string) => p === '/tips' || p.startsWith('/tips/') },
  { href: '/me', label: 'Profilo', icon: User, match: (p: string) => p === '/me' || p.startsWith('/me/') },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (isAuthPath(pathname) || status === 'loading' || !session) {
    return null
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white"
      aria-label="Navigazione principale"
    >
      <ul className="flex h-16 items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  active
                    ? 'font-semibold text-orange-600'
                    : 'font-medium text-gray-500 hover:text-gray-800'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={`h-5 w-5 ${active ? 'text-orange-500' : 'text-gray-400'}`}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
