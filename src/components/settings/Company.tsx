'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function SettingsCompany() {
  const { notifyCustom } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState({
    name: 'La Brigata Ristorante',
    address: 'Via Roma 123, 00100 Roma',
    phone: '+39 06 123 4567',
    email: 'info@labrigata.it',
    vat: 'IT12345678901',
    website: 'www.labrigata.it'
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      notifyCustom('Informazioni azienda aggiornate', 'success')
    } catch (error) {
      notifyCustom('Errore nell\'aggiornamento delle informazioni', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🏢 Informazioni Azienda</h2>
        <p className="text-gray-600">Gestisci le informazioni della tua azienda.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Azienda</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({...company, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Indirizzo</label>
            <input
              type="text"
              value={company.address}
              onChange={(e) => setCompany({...company, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
            <input
              type="tel"
              value={company.phone}
              onChange={(e) => setCompany({...company, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={company.email}
              onChange={(e) => setCompany({...company, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Partita IVA</label>
            <input
              type="text"
              value={company.vat}
              onChange={(e) => setCompany({...company, vat: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sito Web</label>
            <input
              type="url"
              value={company.website}
              onChange={(e) => setCompany({...company, website: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva Informazioni'}
          </button>
        </div>
      </div>
    </div>
  )
}
