'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import AdminContextualSidebar from './AdminContextualSidebar'
import TopBar from './TopBar'
import { isAuthPath } from '@/lib/utils'
import { isPlatformAdmin, isPlatformAdminAreaPath } from '@/lib/platform-admin'

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

  const useAdminSidebar =
    isPlatformAdmin(session.user?.role, session.user?.level) &&
    isPlatformAdminAreaPath(pathname)

  const SidebarComponent = useAdminSidebar ? AdminContextualSidebar : Sidebar

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuToggle={() => setMobileSidebarOpen((open) => !open)} />

      <div className="flex pt-16">
        <div className="hidden md:fixed md:left-0 md:top-16 md:bottom-0 md:z-40 md:block">
          <Suspense
            fallback={
              <div
                className="bg-white border-r border-gray-200 h-full"
                style={{ width: '250px' }}
              />
            }
          >
            <SidebarComponent />
          </Suspense>
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
              <Suspense fallback={null}>
                <SidebarComponent
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              </Suspense>
            </div>
          </>
        )}

        <main
          className={`flex-1 overflow-auto md:ml-[250px] ${
            useAdminSidebar ? 'max-md:pb-4' : 'max-md:ml-0 max-md:pb-16'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
