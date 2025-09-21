'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'
import { getEmployeesByCompany } from '@/lib/employees'

type DashboardSection = 'bookings' | 'sale' | 'customers' | 'leaves' | 'shifts' | 'rest' | 'tips' | 'admin'
type ShiftViewScope = 'own' | 'department' | 'all'

interface AccessConfig {
  dashboard?: Partial<Record<DashboardSection, boolean>>
  shifts?: {
    viewScope?: ShiftViewScope
    canEdit?: boolean
  }
}

type AccessStore = Record<string, AccessConfig>

export default function AccessStandalonePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { canAccessAdmin } = usePermissions()

  const [employees, setEmployees] = useState<any[]>([])
  const [accessMap, setAccessMap] = useState<AccessStore>({})
  const [permMap, setPermMap] = useState<Record<string, { permissions: string[] }>>({})
  const waitingForCompany = !!session && !(session.user as any)?.companyId

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const cid = (session?.user as any)?.companyId as string | undefined
        if (!cid) return
        const api = await getEmployeesByCompany(cid, { active: true })
        const list = api.map((e: any, idx: number) => ({
          id: e.id || String(idx + 1),
          name: e.name,
          avatar: e.avatar || '👤',
          department: e.department || 'sala',
          level: (e as any).level || 2,
        }))
        if (!cancelled) setEmployees(list)
      } catch {
        if (!cancelled) setEmployees([])
      }
    }
    if (session) load()
    const onEmp = () => load()
    try { window.addEventListener('employees_updated', onEmp as any) } catch {}
    return () => { cancelled = true; try { window.removeEventListener('employees_updated', onEmp as any) } catch {} }
  }, [session])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_access_controls_v1')
      setAccessMap(raw ? JSON.parse(raw) : {})
    } catch {
      setAccessMap({})
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_permissions_v1')
      setPermMap(raw ? JSON.parse(raw) : {})
    } catch {
      setPermMap({})
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  if (!canAccessAdmin()) {
    router.push('/dashboard')
    return null
  }

  const updateAccess = (userId: string, updater: (prev: AccessConfig) => AccessConfig) => {
    setAccessMap(prev => {
      const next: AccessStore = { ...prev, [userId]: updater(prev[userId] || {}) }
      try { localStorage.setItem('user_access_controls_v1', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const toggleSection = (userId: string, section: DashboardSection) => {
    updateAccess(userId, (prev) => {
      const current = prev.dashboard?.[section] ?? true
      return { ...prev, dashboard: { ...(prev.dashboard || {}), [section]: !current } }
    })
  }

  const setShiftScope = (userId: string, scope: ShiftViewScope) => {
    updateAccess(userId, (prev) => ({ ...prev, shifts: { ...(prev.shifts || {}), viewScope: scope } }))
  }

  const setShiftEdit = (userId: string, canEdit: boolean) => {
    updateAccess(userId, (prev) => ({ ...prev, shifts: { ...(prev.shifts || {}), canEdit } }))
  }

  const setPermissionOverride = (userId: string, permission: string, enabled: boolean) => {
    setPermMap(prev => {
      const existing = prev[userId]?.permissions || []
      const nextPerms = enabled ? Array.from(new Set([...existing, permission])) : existing.filter(p => p !== permission)
      const nextMap = { ...prev, [userId]: { permissions: nextPerms } }
      try { localStorage.setItem('user_permissions_v1', JSON.stringify(nextMap)) } catch {}
      return nextMap
    })
  }

  const hasOverride = (userId: string, permission: string): boolean => {
    return !!permMap[userId]?.permissions?.includes(permission)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">🧩 Gestione Accessi</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Configura cosa vedono e cosa possono fare i tuoi sottoposti</h2>
              <p className="text-sm text-gray-600">Sezioni visibili in Dashboard e permessi di visualizzazione/modifica nelle pagine.</p>
            </div>

            <div className="p-6 space-y-4">
              {waitingForCompany && (
                <div className="text-sm text-gray-500">Caricamento dati aziendali...</div>
              )}
              {employees.length === 0 && (
                <div className="text-sm text-gray-500">Nessun dipendente trovato.</div>
              )}

              {employees.map((emp) => {
                const cfg = accessMap[emp.id] || {}
                const dash = cfg.dashboard || {}
                const shifts = cfg.shifts || {}
                return (
                  <div key={emp.id} className="border rounded p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{emp.avatar}</div>
                        <div>
                          <div className="font-semibold text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.department?.toUpperCase()} • L{emp.level}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-2">Sezioni Dashboard visibili</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {([
                            ['📋 Prenotazioni','bookings'],
                            ['🏬 Sale','sale'],
                            ['📒 Clienti','customers'],
                            ['🏖️ Ferie','leaves'],
                            ['📅 Turni','shifts'],
                            ['😴 Riposi','rest'],
                            ['💰 Mance','tips'],
                            ['🛡️ Admin','admin']
                          ] as [string, DashboardSection][]).map(([label, key]) => (
                            <label key={key} className="inline-flex items-center gap-2">
                              <input type="checkbox" checked={dash[key] ?? true} onChange={() => toggleSection(emp.id, key)} />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-2">Turni - Ambito Visualizzazione e Modifica</div>
                        <div className="flex items-center gap-3 text-sm mb-2">
                          <label className="inline-flex items-center gap-2">
                            <input type="radio" name={`scope_${emp.id}`} checked={(shifts.viewScope||'own')==='own'} onChange={() => setShiftScope(emp.id, 'own')} />
                            Solo i propri
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input type="radio" name={`scope_${emp.id}`} checked={shifts.viewScope==='department'} onChange={() => setShiftScope(emp.id, 'department')} />
                            Reparto
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input type="radio" name={`scope_${emp.id}`} checked={shifts.viewScope==='all'} onChange={() => setShiftScope(emp.id, 'all')} />
                            Tutti
                          </label>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!shifts.canEdit} onChange={(e)=> setShiftEdit(emp.id, e.target.checked)} />
                          Può modificare i turni
                        </label>
                      </div>
                    </div>

                    {/* Altri Permessi Granulari */}
                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-2">Ferie e Permessi</div>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasOverride(emp.id, 'ferie_approve')}
                            onChange={(e)=> setPermissionOverride(emp.id, 'ferie_approve', e.target.checked)}
                          />
                          Può approvare richieste ferie
                        </label>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-2">Mance</div>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasOverride(emp.id, 'mance_manage')}
                            onChange={(e)=> setPermissionOverride(emp.id, 'mance_manage', e.target.checked)}
                          />
                          Può inserire/modificare mance
                        </label>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-2">Prenotazioni</div>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasOverride(emp.id, 'bookings_manage')}
                            onChange={(e)=> setPermissionOverride(emp.id, 'bookings_manage', e.target.checked)}
                          />
                          Può inserire/modificare prenotazioni
                        </label>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 mb-2">Dipendenti</div>
                        <div className="flex flex-col gap-2 text-sm">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hasOverride(emp.id, 'personale_create')}
                              onChange={(e)=> setPermissionOverride(emp.id, 'personale_create', e.target.checked)}
                            />
                            Può assumere (creare dipendenti)
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hasOverride(emp.id, 'personale_delete')}
                              onChange={(e)=> setPermissionOverride(emp.id, 'personale_delete', e.target.checked)}
                            />
                            Può licenziare (eliminare dipendenti)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

