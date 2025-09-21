'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminCompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<{ companyName: string; restaurantName: string; ownerName: string; fiscalCode: string; address: string; region?: string } | null>(null)
  const [bannerLoading, setBannerLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if ((session.user as any)?.role !== 'ADMIN') { router.push('/dashboard'); return }
  }, [session, status, router])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/companies')
        const data = await res.json()
        setRows(data.companies || [])
      } finally { setLoading(false) }
    })()
  }, [])

  if (status === 'loading' || loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button
              onClick={() => router.push('/admin/overview')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Indietro</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">🏬 Aziende Registrate</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {banner && (
            <div className="mb-4 border rounded-lg p-4 bg-blue-50 border-blue-200 text-gray-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600">Dettagli Azienda</div>
                  <div className="text-lg font-semibold">{banner.companyName}</div>
                </div>
                <button onClick={() => setBanner(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Ristorante:</span> {banner.restaurantName || '-'}</div>
                <div><span className="font-medium">Proprietario:</span> {banner.ownerName || '-'}</div>
                <div><span className="font-medium">Codice Fiscale:</span> {banner.fiscalCode || '-'}</div>
                <div><span className="font-medium">Via:</span> {banner.address || '-'}</div>
                <div className="md:col-span-2"><span className="font-medium">Regione:</span> {banner.region || '-'}</div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Elenco Aziende</h2>
                  <p className="text-sm text-gray-600">Ricerca per nome o codice fiscale</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca..."
                    className="px-3 py-2 border border-gray-300 rounded w-full md:w-80"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Codice Fiscale</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ristoranti</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Dipendenti</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.filter(c => {
                    const q = search.toLowerCase().trim()
                    if (!q) return true
                    return c.name.toLowerCase().includes(q) || (c.fiscalCode || '').toLowerCase().includes(q)
                  }).map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2">{c.fiscalCode}</td>
                      <td className="px-4 py-2">{c._count?.restaurants ?? '-'}</td>
                      <td className="px-4 py-2">{c._count?.users ?? '-'}</td>
                      <td className="px-4 py-2 text-right space-x-3">
                        <button
                          className="text-blue-600 hover:underline disabled:text-gray-400"
                          disabled={bannerLoading}
                          onClick={async () => {
                            setBannerLoading(true)
                            try {
                              const res = await fetch(`/api/companies/${c.id}`)
                              const data = await res.json()
                              let ownerName = '-'
                              try {
                                const r2 = await fetch(`/api/employees?companyId=${encodeURIComponent(c.id)}&active=true`)
                                const d2 = await r2.json()
                                const owner = (d2.employees || []).find((u: any) => (u.role || '').toUpperCase() === 'PROPRIETARIO')
                                ownerName = owner?.name || '-'
                              } catch {}
                              const company = data
                              const firstRest = (company?.restaurants || [])[0]
                              setBanner({
                                companyName: company?.name || c.name,
                                restaurantName: firstRest?.name || (company?.restaurants?.length ? `${company.restaurants.length} ristoranti` : '-'),
                                ownerName,
                                fiscalCode: company?.fiscalCode || c.fiscalCode || '-',
                                address: firstRest?.address || company?.address || '-',
                                region: (company?.region as string) || undefined
                              })
                            } finally {
                              setBannerLoading(false)
                            }
                          }}
                        >Dettagli</button>
                        <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/admin/companies/${c.id}/employees`)}>Dipendenti</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>Nessuna azienda registrata</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


