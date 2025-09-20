'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminOverviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    const role = (session.user as any)?.role
    if (role !== 'ADMIN') { router.push('/dashboard'); return }
  }, [session, status, router])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/companies')
        const data = await res.json()
        setCompanies(data.companies || [])
      } finally { setLoading(false) }
    })()
  }, [])

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Pannello Admin</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Aziende Registrate</h2>
              <button onClick={() => router.push('/admin/companies')} className="text-sm text-blue-600 hover:underline">Apri</button>
            </div>
            <div className="text-sm text-gray-700">Totale: {companies.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Candidati (Cerco Lavoro)</h2>
              <button onClick={() => router.push('/admin/candidates')} className="text-sm text-blue-600 hover:underline">Apri</button>
            </div>
            <div className="text-sm text-gray-700">Lista candidati registrati</div>
          </div>
        </div>
      </div>
    </div>
  )
}


