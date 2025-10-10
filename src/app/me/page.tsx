'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function MeRedirectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.replace('/login')
      return
    }
    // Redirect alla pagina profilo semplificata (accessibile a tutti)
    router.replace('/profile')
  }, [session?.user?.id, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-700">
      <div className="text-center">
        <div className="text-4xl mb-4">👤</div>
        <div className="text-xl">Caricamento profilo...</div>
      </div>
    </div>
  )
}


