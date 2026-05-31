'use client'

import { useState } from 'react'
import useSWR from 'swr'

type InviteStatus = 'active' | 'expired' | 'exhausted' | 'revoked'

type Invite = {
  id: string
  code: string
  companyId: string
  restaurantId: string
  expiresAt: string
  maxUses: number
  usedCount: number
  isActive: boolean
  status: InviteStatus
  createdAt: string
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

const STATUS_BADGE: Record<InviteStatus, { label: string; cls: string }> = {
  active: { label: 'Attivo', cls: 'bg-green-100 text-green-800' },
  expired: { label: 'Scaduto', cls: 'bg-gray-100 text-gray-600' },
  exhausted: { label: 'Esaurito', cls: 'bg-amber-100 text-amber-800' },
  revoked: { label: 'Revocato', cls: 'bg-red-100 text-red-700' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamInvites() {
  const { data, error, isLoading, mutate } = useSWR<{ invites: Invite[] }>(
    '/api/companies/invite',
    fetcher
  )
  const [generating, setGenerating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const invites = data?.invites ?? []

  const generate = async () => {
    setGenerating(true)
    setActionError(null)
    try {
      const res = await fetch('/api/companies/invite', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Errore nella generazione del codice')
      }
      await mutate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Errore nella generazione del codice')
    } finally {
      setGenerating(false)
    }
  }

  const revoke = async (code: string) => {
    setActionError(null)
    try {
      const res = await fetch(`/api/companies/invite/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Errore nella revoca')
      }
      await mutate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Errore nella revoca')
    }
  }

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Codici invito attivi</h2>
          <p className="text-sm text-gray-500">
            Condividi un codice con i tuoi dipendenti: lo useranno in registrazione al posto del
            Codice Fiscale. Valido 7 giorni, fino a 50 utilizzi.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="shrink-0 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
        >
          {generating ? 'Genero…' : '+ Genera codice'}
        </button>
      </div>

      {actionError && (
        <p className="mb-3 text-sm text-red-600">{actionError}</p>
      )}

      {isLoading ? (
        <div className="h-20 animate-pulse bg-gray-100 rounded-lg" />
      ) : error ? (
        <p className="text-sm text-gray-500">Impossibile caricare i codici invito.</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Nessun codice invito. Generane uno per far entrare i tuoi dipendenti.
        </p>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => {
            const badge = STATUS_BADGE[inv.status]
            return (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold tracking-widest text-gray-900">
                    {inv.code}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{inv.usedCount}/{inv.maxUses} usi</span>
                  <span>Scade il {formatDate(inv.expiresAt)}</span>
                  <button
                    type="button"
                    onClick={() => copy(inv.code)}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {copiedCode === inv.code ? 'Copiato!' : 'Copia'}
                  </button>
                  {inv.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => revoke(inv.code)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Revoca
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
