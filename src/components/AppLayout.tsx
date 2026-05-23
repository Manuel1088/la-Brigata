'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { isAuthPath } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const authPage = isAuthPath(pathname)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session && !authPage) {
      router.push('/login')
    }
  }, [session, status, router, authPage])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  // Login/register: mai sidebar, topbar o offset layout
  if (authPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuToggle={() => setMobileSidebarOpen((open) => !open)} />

      <div className="flex pt-16">
        <div className="hidden md:fixed md:left-0 md:top-16 md:bottom-0 md:z-40 md:block">
          <Sidebar />
        </div>

        {mobileSidebarOpen && (
          <>
            <button
              type="button"
              className="md:hidden fixed inset-0 top-16 z-[60] bg-black/50"
              aria-label="Chiudi menu"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="md:hidden fixed left-0 top-16 bottom-0 z-[61]">
              <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </>
        )}

        <main className="flex-1 overflow-auto max-md:ml-0 max-md:pb-16 md:ml-[250px]">
          {children}
        </main>
      </div>
    </div>
  )
}
