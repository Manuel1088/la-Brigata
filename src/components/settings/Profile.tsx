'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function SettingsProfile() {
  const { notifyCustom } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Mario Rossi',
    email: 'mario.rossi@example.com',
    phone: '+39 123 456 7890',
    avatar: '👤',
    department: 'Management',
    role: 'Manager'
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      // Simula salvataggio
      await new Promise(resolve => setTimeout(resolve, 1000))
      notifyCustom('Profilo aggiornato con successo', 'success')
    } catch (error) {
      notifyCustom('Errore nell\'aggiornamento del profilo', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 Profilo Personale</h2>
        <p className="text-gray-600">Gestisci le tue informazioni personali e di contatto.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
            <input
              type="text"
              value={profile.avatar}
              onChange={(e) => setProfile({...profile, avatar: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="👤"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </div>
    </div>
  )
}
