'use client'
import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { EmployeeProvider } from '@/contexts/EmployeeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig 
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          revalidateIfStale: false,
          shouldRetryOnError: false,
        }}
      >
        <EmployeeProvider>
          {children}
        </EmployeeProvider>
      </SWRConfig>
    </SessionProvider>
  )
}
