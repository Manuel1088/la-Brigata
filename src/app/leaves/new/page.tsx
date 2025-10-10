'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect a Time Management
export default function LeavesRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/time-management?tab=leaves')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-xl">Reindirizzamento...</div>
      </div>
    </div>
  )
}
