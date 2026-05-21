// contexts/Provider-style wrapper for app-wide configs
'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { EmployeeProvider } from '@/contexts/EmployeeContext'
import { RestaurantProvider } from '@/contexts/RestaurantContext'

class FetchError extends Error {
  info: unknown
  status: number

  constructor(message: string, status: number, info: unknown) {
    super(message)
    this.name = 'FetchError'
    this.status = status
    this.info = info
  }
}

// Global fetcher with basic error handling
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    let info: unknown = {}
    try {
      info = await res.json()
    } catch {
      info = {}
    }
    throw new FetchError('API Error', res.status, info)
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
