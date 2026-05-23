'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type SidebarProps = {
  onNavigate?: () => void
}

type RestaurantOption = { id: string; name: string }

export default function AdminContextualSidebar({ onNavigate }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const view = searchParams.get('view') ?? ''
  const isDashboard = pathname === '/dashboard'
  const isAdminRoot = pathname === '/admin'
  const isRestaurantDetail = /^\/admin\/restaurants\/[^/]+$/.test(pathname)
  const isRestaurantsView =
    isAdminRoot && (view === 'restaurants' || view === '' || !view)
  const isUsersView = isAdminRoot && view === 'users'
  const isToolsView = isAdminRoot && view === 'tools'
  const isPermissionsPage = pathname === '/permissions'

  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [localQ, setLocalQ] = useState(() => searchParams.get('q') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalQ(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    if (!isUsersView) return
    void fetch('/api/admin/restaurants', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setRestaurants(
          (d.restaurants ?? []).map((x: { id: string; name: string }) => ({
            id: x.id,
            name: x.name,
          }))
        )
      })
      .catch(() => setRestaurants([]))
  }, [isUsersView])

  const pushAdmin = useCallback(
    (updates: Record<string, string | null>, baseView?: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (baseView) params.set('view', baseView)
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === '' || val === 'all') {
          params.delete(key)
        } else {
          params.set(key, val)
        }
      }
      router.push(`/admin?${params.toString()}`)
      onNavigate?.()
    },
    [router, searchParams, onNavigate]
  )

  const debouncedQ = useCallback(
    (value: string, baseView: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pushAdmin({ q: value.trim() || null }, baseView)
      }, 300)
    },
    [pushAdmin]
  )

  const navItem = (label: string, path: string, icon: string, active: boolean) => (
    <button
      type="button"
      onClick={() => {
        router.push(path)
        onNavigate?.()
      }}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition ${
        active
          ? 'bg-orange-50 text-orange-700 font-semibold border-l-4 border-orange-500'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-left">{label}</span>
    </button>
  )

  const filterLabel = (text: string) => (
    <label className="block text-xs font-medium text-gray-600 mb-1">{text}</label>
  )

  const inputClass =
    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none'

  return (
    <div
      className="bg-white text-gray-900 h-full flex flex-col border-r border-gray-200"
      style={{ width: '250px' }}
    >
      <nav className="flex-1 p-4 pt-4 space-y-4 overflow-y-auto">
        {isDashboard && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Admin
            </h3>
            <ul className="space-y-0.5">
              {navItem('Admin Panel', '/admin', '⚙️', false)}
              {navItem(
                'Gestione permessi',
                '/admin?view=tools&tools=permissions',
                '🔐',
                false
              )}
            </ul>
          </div>
        )}

        {!isDashboard && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Piattaforma
            </h3>
            <ul className="space-y-0.5">
              {navItem('Dashboard', '/dashboard', '📊', false)}
              {navItem(
                'Vista Ristoranti',
                '/admin?view=restaurants',
                '🏨',
                isRestaurantsView && !isRestaurantDetail
              )}
              {navItem('Vista Utenti', '/admin?view=users', '👥', isUsersView)}
              {navItem(
                'Gestione permessi',
                '/admin?view=tools&tools=permissions',
                '🔐',
                isToolsView || isPermissionsPage
              )}
            </ul>
          </div>
        )}

        {isRestaurantsView && !isRestaurantDetail && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Filtri ristoranti
            </h3>
            <div className="space-y-3">
              <div>
                {filterLabel('Cerca')}
                <input
                  type="search"
                  className={inputClass}
                  placeholder="Nome, città..."
                  value={localQ}
                  onChange={(e) => {
                    setLocalQ(e.target.value)
                    debouncedQ(e.target.value, 'restaurants')
                  }}
                />
              </div>
              <div>
                {filterLabel('Abbonamento')}
                <select
                  className={inputClass}
                  value={searchParams.get('subscription') ?? 'all'}
                  onChange={(e) =>
                    pushAdmin(
                      {
                        subscription:
                          e.target.value === 'all' ? null : e.target.value,
                      },
                      'restaurants'
                    )
                  }
                >
                  <option value="all">Tutti</option>
                  <option value="FREE">Gratuito</option>
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="EXPIRED">Scaduto</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {isUsersView && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Filtri utenti
            </h3>
            <div className="space-y-3">
              <div>
                {filterLabel('Cerca')}
                <input
                  type="search"
                  className={inputClass}
                  placeholder="Nome, email..."
                  value={localQ}
                  onChange={(e) => {
                    setLocalQ(e.target.value)
                    debouncedQ(e.target.value, 'users')
                  }}
                />
              </div>
              <div>
                {filterLabel('Ruolo')}
                <select
                  className={inputClass}
                  value={searchParams.get('role') ?? 'all'}
                  onChange={(e) =>
                    pushAdmin(
                      { role: e.target.value === 'all' ? null : e.target.value },
                      'users'
                    )
                  }
                >
                  <option value="all">Tutti</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="DIPENDENTE">Dipendente</option>
                  <option value="HEAD_CHEF">Head Chef</option>
                </select>
              </div>
              <div>
                {filterLabel('Ristorante')}
                <select
                  className={inputClass}
                  value={searchParams.get('restaurantId') ?? 'all'}
                  onChange={(e) =>
                    pushAdmin(
                      {
                        restaurantId:
                          e.target.value === 'all' ? null : e.target.value,
                      },
                      'users'
                    )
                  }
                >
                  <option value="all">Tutti</option>
                  <option value="none">Senza ristorante</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {filterLabel('Stato')}
                <select
                  className={inputClass}
                  value={
                    searchParams.get('active') === 'true'
                      ? 'active'
                      : searchParams.get('active') === 'false'
                        ? 'inactive'
                        : 'all'
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    pushAdmin(
                      {
                        active:
                          v === 'all' ? null : v === 'active' ? 'true' : 'false',
                      },
                      'users'
                    )
                  }}
                >
                  <option value="all">Tutti</option>
                  <option value="active">Attivi</option>
                  <option value="inactive">Disattivi</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {isRestaurantDetail && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Ristorante
            </h3>
            <button
              type="button"
              onClick={() => {
                router.push('/admin?view=restaurants')
                onNavigate?.()
              }}
              className="text-sm text-orange-600 hover:underline"
            >
              ← Elenco ristoranti
            </button>
          </div>
        )}

        {isToolsView && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Strumenti
            </h3>
            <ul className="space-y-0.5">
              {navItem(
                'Permessi',
                '/admin?view=tools&tools=permissions',
                '🔐',
                searchParams.get('tools') !== 'audit'
              )}
              {navItem(
                'Audit',
                '/admin?view=tools&tools=audit',
                '📋',
                searchParams.get('tools') === 'audit'
              )}
            </ul>
          </div>
        )}
      </nav>
    </div>
  )
}
