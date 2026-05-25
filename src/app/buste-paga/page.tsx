'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PayrollSection from '@/components/PayrollSection'

export default function BustePagaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">💰 Le Mie Buste Paga</h1>
              <p className="text-gray-600 mt-2">
                Gestisci i tuoi documenti e scopri risparmi fiscali
              </p>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Componente Payroll */}
        <PayrollSection />
      </main>
    </div>
  )
}

