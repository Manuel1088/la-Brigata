// src/hooks/useEmployees.ts
import useSWR from 'swr'
import { getEmployeesByCompany } from '@/lib/employees'

export function useEmployees(companyId: string | undefined, active?: boolean) {
  const key = companyId 
    ? `employees-${companyId}${active ? '-active' : ''}` 
    : null

  return useSWR(
    key,
    () => getEmployeesByCompany(companyId!, { active }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minuto di cache
      errorRetryCount: 1
    }
  )
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


