'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function AnalyticsCustomers() {
  const { notifyCustom } = useNotifications()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simula caricamento dati
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">👥</div>
          <div className="text-xl text-gray-700">Caricamento analytics clienti...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Analytics Clienti</h2>
        <p className="text-gray-600">
          Analisi dettagliate del comportamento dei clienti, segmentazione, lifetime value e pattern di consumo.
        </p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">1,248</div>
            <div className="text-blue-800">Clienti Totali</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">78%</div>
            <div className="text-green-800">Tasso Ritenzione</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">€156</div>
            <div className="text-purple-800">LTV Medio</div>
          </div>
        </div>
      </div>
    </div>
  )
}
