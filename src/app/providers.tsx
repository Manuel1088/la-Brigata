// contexts/Provider-style wrapper for app-wide configs
'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { EmployeeProvider } from '@/contexts/EmployeeContext'
import { RestaurantProvider } from '@/contexts/RestaurantContext'

// Global fetcher with basic error handling
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const error: any = new Error('API Error')
    try { error.info = await res.json() } catch { error.info = {} }
    error.status = res.status
    throw error
  }
  return res.json()
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RestaurantProvider>
        <SWRConfig
          value={{
            fetcher,
            dedupingInterval: 5000,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: true,
            keepPreviousData: true,
            errorRetryCount: 3,
            errorRetryInterval: 1000,
            onError: (error, key) => {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('SWR Error:', key, error)
              }
            }
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
