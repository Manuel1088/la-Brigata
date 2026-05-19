// src/hooks/useEmployees.ts
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import type { EmployeeFull } from '@/lib/employees'

interface UseEmployeesOptions {
  active?: boolean
  department?: string
  enabled?: boolean
  /** Override esplicito (es. da EmployeeContext) */
  companyId?: string
  restaurantId?: string
}

interface EmployeesResponse {
  employees: EmployeeFull[]
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { data: session } = useSession()
  const { active = true, department, enabled = true, companyId: companyIdOpt, restaurantId: restaurantIdOpt } = options
  const companyId = companyIdOpt ?? session?.user?.companyId
  const restaurantId = restaurantIdOpt ?? session?.user?.restaurantId

  const canFetch = enabled && !!(companyId || restaurantId)
  const key = canFetch
    ? ['/api/employees', companyId ?? '', restaurantId ?? '', !!active, department ?? '']
    : null

  const { data, error, isLoading, isValidating, mutate } = useSWR<EmployeesResponse>(
    key,
    async ([url, cId, rId, act, dept]: [string, string, string, boolean, string]) => {
      const params = new URLSearchParams()
      if (cId) params.set('companyId', cId)
      if (rId) params.set('restaurantId', rId)
      if (act) params.set('active', 'true')
      if (dept) params.set('department', dept)
      const res = await fetch(`${url}?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
    {
      keepPreviousData: true,
      revalidateOnMount: true,
      dedupingInterval: 5000,
      revalidateIfStale: true,
      fallbackData: { employees: [] }
    }
  )

  return {
    employees: data?.employees || [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

// Tipi TypeScript
export interface Employee {
  id: string
  name: string
  role: string
  department?: string
  active: boolean
}

export interface UseEmployeesResult {
  data: Employee[] | undefined
  error: unknown
  isLoading: boolean
  mutate: () => void
}


