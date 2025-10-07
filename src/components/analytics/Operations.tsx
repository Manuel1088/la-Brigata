'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function AnalyticsOperations() {
  const { notifyCustom } = useNotifications()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <div className="text-xl text-gray-700">Caricamento analytics operazioni...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Analytics Operazioni</h2>
        <p className="text-gray-600">
          Analisi delle performance operative, efficienza dei processi, ottimizzazione risorse e identificazione colli di bottiglia.
        </p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">87%</div>
            <div className="text-orange-800">Efficienza Operativa</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">42min</div>
            <div className="text-red-800">Tempo Servizio Medio</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">2.3</div>
            <div className="text-green-800">Giri Tavolo</div>
          </div>
        </div>
      </div>
    </div>
  )
}
