'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'

export default function CompanyEmployeesPage() {
  const { data: session, status } = useSession()
  const params = useParams() as { id?: string }
  const router = useRouter()
  const companyId = params?.id as string | undefined
  const [rows, setRows] = useState<any[]>([])
  const [company, setCompany] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const [newHireDept, setNewHireDept] = useState<string>('')
  const [newHireRole, setNewHireRole] = useState<string>('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if ((session.user as any)?.role !== 'ADMIN') { router.push('/dashboard'); return }
  }, [session, status, router])

  useEffect(() => {
    (async () => {
      if (!companyId) return
      try {
        const [empRes, compRes, candRes] = await Promise.all([
          fetch(`/api/employees?companyId=${encodeURIComponent(companyId)}`),
          fetch(`/api/companies/${companyId}`),
          fetch('/api/candidates')
        ])
        const empData = await empRes.json()
        const compData = await compRes.json()
        const candData = await candRes.json()
        setRows(empData.employees || [])
        setCompany(compData || null)
        setCandidates((candData.candidates || []).map((c: any) => ({ id: c.id, name: c.name, email: c.email })))
      } finally { setLoading(false) }
    })()
  }, [companyId])

  if (status === 'loading' || loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button onClick={() => router.push('/admin/companies')} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span>Indietro</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">👥 Dipendenti Azienda</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {company && (
            <div className="mb-6 border rounded-lg p-4 bg-blue-50 border-blue-200 text-gray-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600">Dettagli Azienda</div>
                  <div className="text-lg font-semibold">{company.name}</div>
                </div>
              </div>
              <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Codice Fiscale:</span> {company.fiscalCode || '-'}</div>
                <div><span className="font-medium">Ristoranti:</span> {(company.restaurants?.length || 0) > 0 ? company.restaurants[0]?.name : '-'}</div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Assumi candidato in questa azienda</h2>
                  <p className="text-sm text-gray-600">Seleziona un candidato e completa i dati opzionali</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCandidateId}
              onChange={e => setSelectedCandidateId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm w-full md:w-80"
            >
              <option value="">Seleziona candidato…</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
            <input
              value={newHireDept}
              onChange={e => setNewHireDept(e.target.value)}
              placeholder="Reparto (opz.)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              value={newHireRole}
              onChange={e => setNewHireRole(e.target.value)}
              placeholder="Ruolo (opz.)"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={async () => {
                if (!company) return
                if (!selectedCandidateId) { alert('Seleziona un candidato'); return }
                try {
                  const res = await fetch('/api/candidates/hire', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      candidateId: selectedCandidateId,
                      fiscalCode: company.fiscalCode,
                      department: newHireDept || undefined,
                      role: newHireRole || undefined
                    })
                  })
                  const data = await res.json()
                  if (!res.ok) { alert(data.error || 'Errore assunzione'); return }
                  alert('Candidato assunto con successo!')
                  location.reload()
                } catch {
                  alert('Errore di rete')
                }
              }}
                    className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Assumi
            </button>
                </div>
              </div>
            </div>
          </div>
          {company && (
            <div className="mb-4 text-sm text-gray-700">{company.name} • {company.fiscalCode}</div>
          )}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Reparto</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ruolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((e: any) => (
                <tr key={e.id}>
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.email}</td>
                  <td className="px-4 py-2">{(e as any).department || '-'}</td>
                  <td className="px-4 py-2">{e.role}</td>
                  <td className="px-4 py-2 text-right">
                    {e.isActive ? (
                      <span className="text-green-700 text-sm">✔️ Attivo</span>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          className="text-green-600 hover:underline text-sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/employees/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: e.id, approve: true }) })
                              const data = await res.json()
                              if (!res.ok) { alert(data.error || 'Errore'); return }
                              alert('Dipendente approvato')
                              location.reload()
                            } catch { alert('Errore di rete') }
                          }}
                        >Accetta</button>
                        <button
                          className="text-red-600 hover:underline text-sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/employees/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: e.id, approve: false }) })
                              const data = await res.json()
                              if (!res.ok) { alert(data.error || 'Errore'); return }
                              alert('Richiesta rifiutata')
                              location.reload()
                            } catch { alert('Errore di rete') }
                          }}
                        >Rifiuta</button>
                      </div>
                    )}
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


