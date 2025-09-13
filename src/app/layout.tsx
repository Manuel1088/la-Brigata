// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'

function FloatingPermessiButton() {
  // client-only wrapper component
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data: session } = useSession()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { canAccessAdmin } = usePermissions()
  if (!session || !canAccessAdmin()) return null
  return (
    <Link href="/admin/permissions" className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition">
      🧩 Permessi
    </Link>
  )
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LA BRIGATA - Gestione Digitale Ristorazione',
  description: 'Piattaforma completa per la gestione di turni, mance e personale nella ristorazione italiana',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <Providers>
          {children}
          <FloatingPermessiButton />
        </Providers>
      </body>
    </html>
  )
}