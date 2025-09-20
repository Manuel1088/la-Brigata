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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Candidati (Cerco Lavoro)</h1>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={searchCF}
              onChange={e => setSearchCF(e.target.value)}
              placeholder="Cerca azienda per Codice Fiscale..."
              className="border rounded px-3 py-2 w-full md:w-80"
            />
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="border rounded px-3 py-2 w-full md:w-96"
            >
              <option value="">Seleziona azienda…</option>
              {companies
                .filter(c => !searchCF.trim() || (c.fiscalCode || '').toLowerCase().includes(searchCF.toLowerCase()))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name} • {c.fiscalCode}</option>
                ))}
            </select>
          </div>
          {selectedCompanyId && (
            <div className="text-xs text-gray-600 mt-2">
              Azienda selezionata: {companies.find(c => c.id === selectedCompanyId)?.name} — {companies.find(c => c.id === selectedCompanyId)?.fiscalCode}
            </div>
          )}
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
                          // ricarica lista
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
    </div>
  )
}


