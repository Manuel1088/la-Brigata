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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Aziende</h1>
        <div className="flex items-center justify-between mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o codice fiscale..."
            className="px-3 py-2 border rounded w-full max-w-md"
          />
        </div>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                    <button className="text-blue-600 hover:underline" onClick={() => router.push(`/admin/companies/${c.id}`)}>Dettagli</button>
                    <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/admin/companies/${c.id}/employees`)}>Dipendenti</button>
                    <button
                      className="text-green-600 hover:underline"
                      onClick={async () => {
                        const name = prompt('Nome nuovo ristorante:')
                        if (!name) return
                        const address = prompt('Indirizzo (opzionale):') || undefined
                        const phone = prompt('Telefono (opzionale):') || undefined
                        try {
                          const res = await fetch(`/api/companies/${c.id}/restaurants`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, address, phone })
                          })
                          const data = await res.json()
                          if (!res.ok) { alert(data.error || 'Errore creazione ristorante'); return }
                          alert('Ristorante creato')
                        } catch { alert('Errore di rete') }
                      }}
                    >
                      Crea Ristorante
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


