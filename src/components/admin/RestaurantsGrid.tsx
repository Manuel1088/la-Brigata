'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { subscriptionStatusClass } from '@/lib/admin-restaurant'

type RestaurantCard = {
  id: string
  name: string
  city: string
  address: string | null
  employeeCount: number
  subscriptionStatus: string
  subscriptionLabel: string
  subscriptionPeriodEnd: string | null
  companyName: string | null
}

export default function AdminRestaurantsGrid() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<RestaurantCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/restaurants', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore caricamento')
      setRestaurants(data.restaurants ?? [])
    } catch {
      setRestaurants([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = restaurants.filter((r) => {
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      (r.companyName ?? '').toLowerCase().includes(q)
    const matchStatus =
      statusFilter === 'all' || r.subscriptionStatus === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-600">Caricamento ristoranti...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder="Cerca per nome, città, azienda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="all">Tutti gli abbonamenti</option>
          <option value="FREE">Gratuito</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="EXPIRED">Scaduto</option>
        </select>
      </div>

      <p className="text-sm text-gray-600">
        {filtered.length} ristorant{filtered.length === 1 ? 'e' : 'i'} su {restaurants.length}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nessun ristorante trovato</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => router.push(`/admin/restaurants/${r.id}`)}
              className="text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-orange-300 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-lg text-gray-900">{r.name}</h3>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${subscriptionStatusClass(
                    r.subscriptionStatus as 'FREE' | 'BASIC' | 'PRO' | 'EXPIRED'
                  )}`}
                >
                  {r.subscriptionLabel}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">📍 {r.city}</p>
              {r.companyName ? (
                <p className="text-xs text-gray-500 mb-3">{r.companyName}</p>
              ) : null}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  👥 <strong>{r.employeeCount}</strong> dipendenti
                </span>
                <span className="text-orange-600 font-medium">Dettaglio →</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
