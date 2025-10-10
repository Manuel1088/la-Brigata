// src/hooks/useCompanyData.ts - OTTIMIZZATO
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useCompanyData(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/users/${userId}/company` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000, // ✅ Cache 5 minuti
      errorRetryCount: 2,
      keepPreviousData: true, // ✅ Mantieni dati precedenti durante ricaricamento
    }
  )

  return {
    data: data?.success ? data : null,
    company: data?.company || null,
    restaurant: data?.restaurant || null,
    restaurants: data?.restaurants || [],
    hasMultiple: data?.hasMultiple || false,
    employments: data?.employments || [],
    isLoading,
    error,
    mutate,
  }
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


