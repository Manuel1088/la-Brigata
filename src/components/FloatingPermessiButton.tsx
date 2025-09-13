"use client"

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'

export default function FloatingPermessiButton() {
  const { data: session } = useSession()
  const { canAccessAdmin } = usePermissions()
  // Rimosso da tutte le dashboard
  return null
}
