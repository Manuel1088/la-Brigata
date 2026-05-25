import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface UseEmploymentsParams {
  userId?: string
  status?: string
  restaurantId?: string
  enabled?: boolean // Per controllare se la query deve essere eseguita
}

interface Employment {
  id: string
  userId: string
  restaurantId: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'TERMINATED'
  role: string
  startDate: string
  endDate?: string
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
    phone?: string
    role?: string
    ccnlLevel?: string
    position?: string
  }
  restaurant?: {
    id: string
    name: string
    address?: string
    phone?: string
  }
}

interface UseEmploymentsReturn {
  employments: Employment[]
  isLoading: boolean
  error: unknown
  mutate: () => void
  isValidating: boolean
}

/**
 * Hook per gestire le query agli employments con cache e deduplicazione automatica
 * 
 * @example
 * ```typescript
 * const { employments, isLoading, mutate } = useEmployments({ 
 *   status: 'PENDING',
 *   userId: session?.user?.id 
 * })
 * ```
 */
export function useEmployments(params: UseEmploymentsParams = {}): UseEmploymentsReturn {
  const { userId, status, restaurantId, enabled = true } = params
  
  // Costruisci l'URL della query
  const searchParams = new URLSearchParams()
  if (userId) searchParams.set('userId', userId)
  if (status) searchParams.set('status', status)
  if (restaurantId) searchParams.set('restaurantId', restaurantId)
  
  const url = enabled ? `/api/employments?${searchParams.toString()}` : null
  
  const { data, error, isLoading, mutate, isValidating } = useSWR(url, fetcher, {
    revalidateOnFocus: false,      // Non rivalidare quando la tab torna in focus
    revalidateOnReconnect: false,  // Non rivalidare su riconnessione
    dedupingInterval: 5000,        // ✅ Evita chiamate duplicate per 5 secondi
    refreshInterval: 0,             // Nessun polling automatico (controllato manualmente)
    shouldRetryOnError: false,      // Non ritentare in caso di errore
  })
  
  return {
    employments: data?.employments || data?.data || [],
    isLoading,
    error,
    mutate,
    isValidating
  }
}
