'use client'

import { useRouter } from 'next/navigation'
import { usePendingEmploymentsCount } from '@/hooks/useEmployments'

export function PendingEmploymentsBadge() {
  const router = useRouter()
  const { count: pendingCount, isLoading } = usePendingEmploymentsCount()

  if (isLoading || pendingCount === 0) {
    return null // Non mostrare se non ci sono richieste
  }

  return (
    <button
      onClick={() => router.push('/team/requests')}
      className="relative px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
      title={`${pendingCount} richieste di assunzione in attesa`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">👥</span>
        <span className="font-medium">Richieste</span>
        <span className="bg-white text-orange-600 px-2 py-0.5 rounded-full text-sm font-bold animate-pulse">
          {pendingCount}
        </span>
      </div>
    </button>
  )
}

