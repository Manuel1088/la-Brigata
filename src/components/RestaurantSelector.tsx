'use client'

import { useRestaurant } from '@/contexts/RestaurantContext'

export function RestaurantSelector() {
  const { 
    activeRestaurantId, 
    setActiveRestaurantId, 
    employments, 
    loading,
    hasMultipleRestaurants 
  } = useRestaurant()

  // Non mostrare se ha solo un ristorante o sta caricando
  if (loading || !hasMultipleRestaurants) {
    return null
  }

  const activeEmployment = employments.find(e => e.restaurantId === activeRestaurantId)

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-300 rounded-lg hover:border-orange-500 transition-all shadow-sm hover:shadow-md">
        <span className="text-xl">🍽️</span>
        <div className="text-left">
          <div className="text-xs text-gray-600">Restaurant Attivo</div>
          <div className="font-medium text-gray-900">
            {activeEmployment?.restaurant?.name || 'Seleziona...'}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            I Tuoi Ristoranti ({employments.length})
          </div>
          
          {employments.map((employment) => {
            const isActive = employment.restaurantId === activeRestaurantId
            
            return (
              <button
                key={employment.id}
                onClick={() => setActiveRestaurantId(employment.restaurantId)}
                className={`w-full text-left px-3 py-3 rounded-lg mb-1 transition-all ${
                  isActive 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {isActive ? '✅' : '🍽️'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {employment.restaurant?.name || 'Ristorante'}
                    </div>
                    {employment.restaurant?.address && (
                      <div className={`text-xs truncate ${isActive ? 'text-orange-100' : 'text-gray-500'}`}>
                        📍 {employment.restaurant?.address}
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${isActive ? 'text-orange-100' : 'text-gray-600'}`}>
                      {employment.role} • {employment.department || 'Generale'}
                    </div>
                  </div>
                  {isActive && (
                    <div className="text-xs bg-white/20 px-2 py-1 rounded">
                      Attivo
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        
        <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600">
            💡 I dati mostrati (turni, mance, ferie) sono relativi al ristorante selezionato
          </p>
        </div>
      </div>
    </div>
  )
}

