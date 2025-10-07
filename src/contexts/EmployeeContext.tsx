// contexts/EmployeeContext.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useEmployees } from '@/hooks/useEmployees'
import { useCompanyData } from '@/hooks/useCompanyData'
import { useSession } from 'next-auth/react'
import type { EmployeeFull } from '@/lib/employees'

interface EmployeeContextType {
  employees: EmployeeFull[]
  isLoading: boolean
  error: any
  companyId: string | undefined
  mutate: () => void
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined)

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const { data: companyResp, isLoading: isLoadingCompany } = useCompanyData(session?.user?.id)
  const companyId = companyResp?.company?.id
  
  const { 
    data: employees, 
    error, 
    isLoading: isLoadingEmployees,
    mutate 
  } = useEmployees(companyId, true)

  const isLoading = isLoadingCompany || isLoadingEmployees

  return (
    <EmployeeContext.Provider 
      value={{ 
        employees: employees || [], 
        isLoading, 
        error,
        companyId,
        mutate
      }}
    >
      {children}
    </EmployeeContext.Provider>
  )
}

// Hook personalizzato per usare il context
export function useEmployeeContext() {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error('useEmployeeContext deve essere usato dentro EmployeeProvider')
  }
  return context
}
