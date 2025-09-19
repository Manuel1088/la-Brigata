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
    router.replace(`/employees/${session.user.id}`)
  }, [session?.user?.id, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-700">
      Caricamento profilo...
    </div>
  )
}


