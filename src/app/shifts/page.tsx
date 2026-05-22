'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import ShiftsCalendar from '@/components/shifts/Calendar'
import PersonalWeekShifts from '@/components/shifts/PersonalWeek'
import {
  getAllowedDepartmentsForCcnl,
  getShiftsPageViewMode,
  normalizeUserDepartmentToShiftDept,
  SHIFT_DEPARTMENT_LABELS,
} from '@/lib/shift-department-access'

export default function ShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const userCcnl = session?.user?.ccnlLevel ?? null
  const userRole = session?.user?.role ?? null
  const userDepartment = session?.user?.department ?? null

  const viewMode = useMemo(
    () => getShiftsPageViewMode(userCcnl, userRole),
    [userCcnl, userRole]
  )

  const allowedDepartments = useMemo(
    () => getAllowedDepartmentsForCcnl(userCcnl, userDepartment, userRole),
    [userCcnl, userDepartment, userRole]
  )

  const deptLabel =
    viewMode === 'department'
      ? SHIFT_DEPARTMENT_LABELS[normalizeUserDepartmentToShiftDept(userDepartment)]
          .label
      : null

  const pageTitle =
    viewMode === 'personal'
      ? 'I Miei Turni'
      : viewMode === 'department'
        ? `Turni — ${deptLabel ?? 'Reparto'}`
        : 'Turni'

  const pageSubtitle =
    viewMode === 'personal'
      ? 'Visualizza i tuoi turni lavorativi della settimana'
      : viewMode === 'department'
        ? 'Gestisci i turni del tuo reparto'
        : 'Gestisci e programma i turni di tutti i reparti'

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📅 {pageTitle}</h1>
              <p className="text-gray-600 mt-2">{pageSubtitle}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {viewMode === 'personal' ? (
            <PersonalWeekShifts />
          ) : (
            <>
              <ShiftsCalendar allowedDepartments={allowedDepartments} />
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  🔵 Turno Lavorativo | ⚪ Riposo | 🟢 Ferie | 🟣 Evento Aziendale
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
