'use client'
import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { EmployeeProvider } from '@/contexts/EmployeeContext'
import { RestaurantProvider } from '@/contexts/RestaurantContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RestaurantProvider>
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
      </RestaurantProvider>
    </SessionProvider>
  )
}
