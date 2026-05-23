'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { subscriptionStatusClass } from '@/lib/admin-restaurant'

type DetailTab = 'employees' | 'shifts' | 'tips' | 'subscription'

type RestaurantDetail = {
  id: string
  name: string
  city: string
  address: string | null
  phone: string | null
  subscriptionStatus: string
  subscriptionLabel: string
  subscriptionPeriodEnd: string | null
  stripeCustomerId: string | null
  company: {
    name: string
    fiscalCode: string
    subscriptionType: string
  } | null
  counts: {
    users: number
    Employee: number
    shifts: number
    tips: number
  }
  employees: Array<{
    id: string
    name: string
    email: string
    role: string
    department: string | null
    isActive: boolean
  }>
  recentShifts: Array<{
    id: string
    date: string
    department: string
    status: string
    user: { name: string }
  }>
  recentTips: Array<{
    id: string
    date: string
    total: number
  }>
}

export default function AdminRestaurantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [detail, setDetail] = useState<RestaurantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<DetailTab>('employees')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetail(data.restaurant)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-700">Ristorante non trovato</p>
        <button
          type="button"
          onClick={() => router.push('/admin?view=restaurants')}
          className="text-orange-600 hover:underline"
        >
          ← Torna ai ristoranti
        </button>
      </div>
    )
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'employees', label: `Dipendenti (${detail.counts.users})` },
    { id: 'shifts', label: `Turni (${detail.counts.shifts})` },
    { id: 'tips', label: `Mance (${detail.counts.tips})` },
    { id: 'subscription', label: 'Abbonamento' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            type="button"
            onClick={() => router.push('/admin?view=restaurants')}
            className="text-gray-600 hover:text-gray-900 text-sm mb-3"
          >
            ← Ristoranti
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{detail.name}</h1>
              <p className="text-gray-600 mt-1">
                {detail.city}
                {detail.address ? ` · ${detail.address}` : ''}
              </p>
            </div>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${subscriptionStatusClass(
                detail.subscriptionStatus as 'FREE' | 'BASIC' | 'PRO' | 'EXPIRED'
              )}`}
            >
              {detail.subscriptionLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <nav className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="p-6">
            {tab === 'employees' && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Ruolo</th>
                      <th className="px-3 py-2">Reparto</th>
                      <th className="px-3 py-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.employees.map((u) => (
                      <tr key={u.id}>
                        <td className="px-3 py-2 font-medium">{u.name}</td>
                        <td className="px-3 py-2 text-gray-600">{u.email}</td>
                        <td className="px-3 py-2">{u.role}</td>
                        <td className="px-3 py-2">{u.department ?? '—'}</td>
                        <td className="px-3 py-2">
                          {u.isActive ? (
                            <span className="text-green-700">Attivo</span>
                          ) : (
                            <span className="text-red-600">Disattivo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'shifts' && (
              <div className="space-y-2">
                {detail.recentShifts.length === 0 ? (
                  <p className="text-gray-500">Nessun turno registrato</p>
                ) : (
                  detail.recentShifts.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between border border-gray-100 rounded-lg px-4 py-3"
                    >
                      <span className="font-medium">{s.user.name}</span>
                      <span className="text-gray-600 text-sm">
                        {new Date(s.date).toLocaleDateString('it-IT')} · {s.department} ·{' '}
                        {s.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'tips' && (
              <div className="space-y-2">
                {detail.recentTips.length === 0 ? (
                  <p className="text-gray-500">Nessuna mancia registrata</p>
                ) : (
                  detail.recentTips.map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between border border-gray-100 rounded-lg px-4 py-3"
                    >
                      <span>{new Date(t.date).toLocaleDateString('it-IT')}</span>
                      <span className="font-medium">€ {t.total.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'subscription' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Piano ristorante</dt>
                  <dd className="font-medium text-gray-900">{detail.subscriptionLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Scadenza periodo</dt>
                  <dd className="font-medium text-gray-900">
                    {detail.subscriptionPeriodEnd
                      ? new Date(detail.subscriptionPeriodEnd).toLocaleDateString('it-IT')
                      : '—'}
                  </dd>
                </div>
                {detail.company ? (
                  <>
                    <div>
                      <dt className="text-gray-500">Azienda</dt>
                      <dd className="font-medium">{detail.company.name}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">P.IVA / CF</dt>
                      <dd className="font-medium">{detail.company.fiscalCode}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Tipo abbonamento azienda</dt>
                      <dd className="font-medium">{detail.company.subscriptionType}</dd>
                    </div>
                  </>
                ) : null}
                <div>
                  <dt className="text-gray-500">Stripe Customer</dt>
                  <dd className="font-mono text-xs break-all">
                    {detail.stripeCustomerId ?? '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
