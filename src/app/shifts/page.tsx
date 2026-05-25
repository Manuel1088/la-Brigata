'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import ShiftsCalendar from '@/components/shifts/Calendar'
import ShiftLegendButton from '@/components/shifts/ShiftLegendButton'
import { getAllowedDepartmentsForCcnl } from '@/lib/shift-department-access'

export default function ShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const userCcnl = session?.user?.ccnlLevel ?? null
  const userRole = session?.user?.role ?? null
  const userDepartment = session?.user?.department ?? null

  const allowedDepartments = useMemo(
    () => getAllowedDepartmentsForCcnl(userCcnl, userDepartment, userRole),
    [userCcnl, userDepartment, userRole]
  )

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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-end mb-4">
            <ShiftLegendButton />
          </div>
          <ShiftsCalendar allowedDepartments={allowedDepartments} />
        </div>
      </main>
    </div>
  )
}
