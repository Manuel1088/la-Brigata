'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function PendingEmploymentsBadge() {
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingCount()
    
    // Aggiorna ogni 30 secondi
    const interval = setInterval(loadPendingCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadPendingCount = async () => {
    try {
      const res = await fetch('/api/employments?status=PENDING')
      const data = await res.json()
      
      if (data.success) {
        setPendingCount(data.employments?.length || 0)
      }
    } catch (error) {
      console.error('Errore caricamento richieste pending:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || pendingCount === 0) {
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

