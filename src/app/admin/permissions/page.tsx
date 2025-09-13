'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { getEmployeesFullClient } from '@/lib/employees'

interface SimpleUser {
  id: string
  name: string
  email: string
  role: string
  level: number
  avatar: string
  isActive: boolean
}

const mockUsers: SimpleUser[] = [
  { id: '1', name: 'Admin Proprietario', email: 'admin@brigata.it', role: 'PROPRIETARIO', level: 10, avatar: '👑', isActive: true },
  { id: '2', name: 'Marco Direttore', email: 'direttore@brigata.it', role: 'DIRETTORE', level: 9, avatar: '👔', isActive: true },
  { id: '3', name: 'Anna Manager', email: 'manager@brigata.it', role: 'MANAGER', level: 8, avatar: '📊', isActive: true },
  { id: '4', name: 'Luca Cassiere', email: 'cassiere@brigata.it', role: 'CASSIERE', level: 6, avatar: '💰', isActive: true },
  { id: '5', name: 'Sofia Dipendente', email: 'dipendente@brigata.it', role: 'DIPENDENTE', level: 5, avatar: '👤', isActive: true }
]

type OverridesMap = Record<string, { permissions: string[] }>

export default function AdminPermissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canCreateShift, canAssignShift, canApproveShift, canManageUsers } = usePermissions()

  const [users, setUsers] = useState<SimpleUser[]>(mockUsers)
  const [employees, setEmployees] = useState<any[]>([])
  const [overrides, setOverrides] = useState<OverridesMap>({})

  const currentUser = session?.user as any
  const currentUserName = currentUser?.name as string | undefined

  const currentEmployee = useMemo(() => {
    if (!currentUserName) return null
    return employees.find((e) => e.name === currentUserName) || null
  }, [employees, currentUserName])
  const currentDept = currentEmployee?.department as string | undefined

  const manageAll = canApproveShift()
  const manageDeptOnly = (canCreateShift() || canAssignShift()) && !manageAll

  useEffect(() => {
    try {
      const full = getEmployeesFullClient()
      setEmployees(full)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_permissions_v1')
      setOverrides(raw ? JSON.parse(raw) : {})
    } catch {
      setOverrides({})
    }
  }, [])

  const getUserDept = (u: SimpleUser): string | undefined => {
    const emp = employees.find((e) => e.name === u.name)
    return emp?.department
  }

  const getUserPerms = (userId: string): string[] => overrides[userId]?.permissions || []

  const updateUserPerm = (userId: string, perm: string, enabled: boolean) => {
    setOverrides((prev) => {
      const next: OverridesMap = { ...prev }
      const current = next[userId]?.permissions || []
      const updated = enabled ? Array.from(new Set([...current, perm])) : current.filter((p) => p !== perm)
      next[userId] = { permissions: updated }
      try {
        localStorage.setItem('user_permissions_v1', JSON.stringify(next))
        window.dispatchEvent(new CustomEvent('user_permissions_updated'))
      } catch {}
      return { ...next }
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session || !canManageUsers()) {
    router.push('/admin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Indietro</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">🧩 Abilitazioni</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-gray-700">{session.user?.name}</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">{(session.user as any)?.role}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Permessi Specifici Utente</h3>
              <p className="text-sm text-gray-600">Concedi o revoca permessi per i turni. {manageAll ? 'Hai privilegi globali.' : manageDeptOnly ? `Puoi abilitare solo utenti del tuo reparto (${currentDept || '-'})` : 'Solo visualizzazione.'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruolo</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reparto</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gestione turni (proprio reparto)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gestione tutti i turni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => {
                    const dept = getUserDept(u)
                    const perms = getUserPerms(u.id)
                    const canToggleManage = manageAll || (manageDeptOnly && dept && currentDept && dept === currentDept)
                    const canToggleApprove = manageAll // solo chi ha privilegi globali può concedere globale
                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">{u.avatar}</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{u.name}</div>
                              <div className="text-sm text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">L{u.level} - {u.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{dept || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={perms.includes('turni_manage')}
                            onChange={(e) => updateUserPerm(u.id, 'turni_manage', e.target.checked)}
                            disabled={!canToggleManage}
                            title={canToggleManage ? '' : 'Non autorizzato per questo utente'}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={perms.includes('turni_approve')}
                            onChange={(e) => updateUserPerm(u.id, 'turni_approve', e.target.checked)}
                            disabled={!canToggleApprove}
                            title={canToggleApprove ? '' : 'Solo privilegi globali'}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


