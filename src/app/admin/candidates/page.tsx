'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminCandidatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; fiscalCode: string }>>([])
  const [searchCF, setSearchCF] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if ((session.user as any)?.role !== 'ADMIN') { router.push('/dashboard'); return }
  }, [session, status, router])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/candidates')
        const data = await res.json()
        setRows(data.candidates || [])
        const r2 = await fetch('/api/companies')
        const d2 = await r2.json()
        setCompanies((d2.companies || []).map((c: any) => ({ id: c.id, name: c.name, fiscalCode: c.fiscalCode })))
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
            <h1 className="text-3xl font-bold text-gray-900">👤 Candidati (Cerco Lavoro)</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Assumi candidato in azienda</h2>
                  <p className="text-sm text-gray-600">Filtra per codice fiscale e seleziona l'azienda</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    value={searchCF}
                    onChange={e => setSearchCF(e.target.value)}
                    placeholder="Cerca per Codice Fiscale..."
                    className="px-3 py-2 border border-gray-300 rounded w-full md:w-80"
                  />
                  <select
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded w-full md:w-96"
                  >
                    <option value="">Seleziona azienda…</option>
                    {companies
                      .filter(c => !searchCF.trim() || (c.fiscalCode || '').toLowerCase().includes(searchCF.toLowerCase()))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name} • {c.fiscalCode}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nome</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Telefono</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Competenze</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2">{c.email}</td>
                    <td className="px-4 py-2">{c.phone || '-'}</td>
                    <td className="px-4 py-2">{c.skills?.join(', ') || '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        className="text-green-600 hover:underline"
                        onClick={async () => {
                          let fiscal: string | undefined
                          if (selectedCompanyId) {
                            const comp = companies.find(x => x.id === selectedCompanyId)
                            fiscal = comp?.fiscalCode
                          } else {
                            const input = prompt('Inserisci Codice Fiscale azienda per assunzione:')
                            if (!input) return
                            fiscal = input.trim()
                          }
                          const department = prompt('Reparto (cucina/sala/bar) opzionale:') || undefined
                          const role = prompt('Ruolo (es. DIPENDENTE, CASSIERE...) opzionale:') || undefined
                          try {
                            const res = await fetch('/api/candidates/hire', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ candidateId: c.id, fiscalCode: fiscal, department, role })
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              alert(data.error || 'Errore assunzione')
                              return
                            }
                            alert('Candidato assunto con successo!')
                            location.reload()
                          } catch {
                            alert('Errore di rete')
                          }
                        }}
                      >
                        Assumi in Azienda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}


