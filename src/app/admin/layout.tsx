'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    // 🛡️ Verifica che sia ADMIN (livello 11)
    const userRole = (session.user as any)?.role
    const userLevel = (session.user as any)?.level

    if (userRole !== 'ADMIN' || userLevel !== 11) {
      console.warn('Access denied to /admin/* - User is not Super Admin')
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Durante il loading, mostra schermata di caricamento
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🛡️</div>
          <div className="text-xl text-gray-700">Verifica permessi...</div>
        </div>
      </div>
    )
  }

  // Verifica finale prima di renderizzare
  const userRole = (session?.user as any)?.role
  const userLevel = (session?.user as any)?.level
  
  if (userRole !== 'ADMIN' || userLevel !== 11) {
    return null // Non renderizzare nulla se non autorizzato
  }

  return <>{children}</>
}

