"use client"

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'

export default function FloatingPermessiButton() {
  const { data: session } = useSession()
  const { canAccessAdmin } = usePermissions()
  if (!session || !canAccessAdmin()) return null
  return (
    <Link href="/admin/permissions" className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition">
      🧩 Permessi
    </Link>
  )
}
