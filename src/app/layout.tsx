// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import AppLayout from '@/components/AppLayout'
import FloatingPermessiButton from '@/components/FloatingPermessiButton'

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
          <AppLayout>
            {children}
          </AppLayout>
          <FloatingPermessiButton />
        </Providers>
      </body>
    </html>
  )
}