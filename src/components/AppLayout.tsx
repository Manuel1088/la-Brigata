'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Show loading state
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

  // Don't show layout for login/register pages
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar - Fixed at top */}
      <TopBar />
      
      {/* Main Layout */}
      <div className="flex pt-16">
        {/* Sidebar - Fixed */}
        <div className="fixed left-0 top-16 bottom-0 z-40">
          <Sidebar />
        </div>
        
        {/* Main Content - Scrollable with sidebar offset */}
        <main className="flex-1 overflow-auto" style={{ marginLeft: '250px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
