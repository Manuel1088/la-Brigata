'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

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
  const [employments, setEmployments] = useState<Employment[]>([])
  const [loading, setLoading] = useState(true)

  const userId = (session?.user as any)?.id

  useEffect(() => {
    if (userId) {
      loadEmployments()
    }
  }, [userId])

  const loadEmployments = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/employments?userId=${userId}&status=ACTIVE`)
      const data = await res.json()
      
      if (data.success && data.employments) {
        const activeEmployments = data.employments.filter(
          (e: Employment) => e.status === 'ACTIVE'
        )
        
        setEmployments(activeEmployments)
        
        // Se non c'è un restaurant attivo, seleziona il primo
        if (!activeRestaurantId && activeEmployments.length > 0) {
          const savedRestaurantId = localStorage.getItem(`activeRestaurant_${userId}`)
          
          if (savedRestaurantId && activeEmployments.find((e: Employment) => e.restaurantId === savedRestaurantId)) {
            setActiveRestaurantIdState(savedRestaurantId)
          } else {
            setActiveRestaurantIdState(activeEmployments[0].restaurantId)
          }
        }
      }
    } catch (error) {
      console.error('Errore caricamento employments:', error)
    } finally {
      setLoading(false)
    }
  }

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
    await loadEmployments()
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

