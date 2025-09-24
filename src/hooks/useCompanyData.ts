// src/hooks/useCompanyData.ts
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useCompanyData(userId: string | undefined) {
  return useSWR(
    userId ? `/api/users/${userId}/company` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minuti di cache
      errorRetryCount: 2
    }
  )
}

// Tipi TypeScript per la risposta
export interface CompanyData {
  company: {
    id: string
    name: string
    fiscalCode: string
    restaurants: Array<{
      id: string
      name: string
    }>
  }
}

export interface UseCompanyDataResult {
  data: CompanyData | undefined
  error: any
  isLoading: boolean
  mutate: () => void
}


