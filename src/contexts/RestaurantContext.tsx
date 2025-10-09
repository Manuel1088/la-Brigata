'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useEmployments } from '@/hooks/useEmployments'

interface Employment {
  id: string
  restaurantId: string
  status: string
  role: string
  department: string | null
  restaurant: {
    id: string
    name: string
    address: string | null
  }
}

interface RestaurantContextType {
  activeRestaurantId: string | null
  setActiveRestaurantId: (id: string) => void
  employments: Employment[]
  loading: boolean
  refreshEmployments: () => Promise<void>
  hasMultipleRestaurants: boolean
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined)

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [activeRestaurantId, setActiveRestaurantIdState] = useState<string | null>(null)

  const userId = (session?.user as any)?.id

  // ✅ Usa il nuovo hook con SWR (cache + deduplicazione automatica)
  const { employments: rawEmployments, isLoading: loading, mutate } = useEmployments({
    userId: userId,
    status: 'ACTIVE',
    enabled: !!userId
  })

  // Filtra solo employments ACTIVE (doppia sicurezza)
  const employments = rawEmployments.filter((e: any) => e.status === 'ACTIVE')

  useEffect(() => {
    // Seleziona automaticamente il primo restaurant se non ce n'è uno attivo
    if (!activeRestaurantId && employments.length > 0 && userId) {
      const savedRestaurantId = localStorage.getItem(`activeRestaurant_${userId}`)
      
      if (savedRestaurantId && employments.find((e: any) => e.restaurantId === savedRestaurantId)) {
        setActiveRestaurantIdState(savedRestaurantId)
      } else {
        setActiveRestaurantIdState(employments[0].restaurantId)
      }
    }
  }, [employments, activeRestaurantId, userId])

  const setActiveRestaurantId = (id: string) => {
    setActiveRestaurantIdState(id)
    
    // Salva in localStorage
    if (userId) {
      localStorage.setItem(`activeRestaurant_${userId}`, id)
    }
    
    // Dispatch event per aggiornare altri componenti
    window.dispatchEvent(new CustomEvent('restaurant_changed', { detail: { restaurantId: id } }))
  }

  const refreshEmployments = async () => {
    await mutate() // ✅ SWR mutate per refresh automatico
  }

  const hasMultipleRestaurants = employments.length > 1

  const value: RestaurantContextType = {
    activeRestaurantId,
    setActiveRestaurantId,
    employments,
    loading,
    refreshEmployments,
    hasMultipleRestaurants
  }

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const context = useContext(RestaurantContext)
  
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider')
  }
  
  return context
}

