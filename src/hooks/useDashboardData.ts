import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Employment {
  id: string
  userId: string
  restaurantId: string
  status: string
  role?: string
  department?: string
  createdAt: string
  restaurant?: {
    id: string
    name: string
    address?: string
    phone?: string
  }
  user?: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

interface Restaurant {
  id: string
  name: string
  address?: string
  phone?: string
}

interface DashboardData {
  userEmployments: Employment[]
  pendingEmployments: Employment[]
  userCompany: Restaurant | null
  allRestaurants: Restaurant[]
  hasMultipleRestaurants: boolean
  canSeePending: boolean
}

interface UseDashboardDataReturn {
  userEmployments: Employment[]
  pendingEmployments: Employment[]
  userCompany: Restaurant | null
  allRestaurants: Restaurant[]
  hasMultipleRestaurants: boolean
  canSeePending: boolean
  isLoading: boolean
  isError: any
  mutate: () => void
}

/**
 * Hook SWR per ottenere tutti i dati del dashboard con una sola chiamata API
 * 
 * Combina:
 * - User employments (ACTIVE)
 * - Pending employments (se admin/manager)
 * - User company/restaurant
 * - Lista di tutti i restaurants dell'utente
 * 
 * Vantaggi:
 * - 1 sola chiamata API invece di 3
 * - Cache condivisa tra componenti
 * - Deduplicazione automatica (10s)
 * - Refresh on-demand con mutate()
 * 
 * @example
 * ```typescript
 * const { 
 *   userEmployments, 
 *   pendingEmployments, 
 *   userCompany,
 *   isLoading,
 *   mutate 
 * } = useDashboardData()
 * 
 * // Refresh manuale
 * await mutate()
 * ```
 */
export function useDashboardData(): UseDashboardDataReturn {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/data',
    fetcher,
    {
      revalidateOnFocus: false,      // Non rivalidare su focus
      dedupingInterval: 10000,       // Cache per 10 secondi
      refreshInterval: 0,             // No auto-refresh
      shouldRetryOnError: false,      // No retry automatico
    }
  )

  return {
    userEmployments: data?.data?.userEmployments || [],
    pendingEmployments: data?.data?.pendingEmployments || [],
    userCompany: data?.data?.userCompany || null,
    allRestaurants: data?.data?.allRestaurants || [],
    hasMultipleRestaurants: data?.data?.hasMultipleRestaurants || false,
    canSeePending: data?.data?.canSeePending || false,
    isLoading,
    isError: error,
    mutate,
  }
}

