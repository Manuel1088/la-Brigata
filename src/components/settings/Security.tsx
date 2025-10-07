'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function SettingsSecurity() {
  const { notifyCustom } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: 30,
    loginNotifications: true
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      notifyCustom('Impostazioni di sicurezza aggiornate', 'success')
    } catch (error) {
      notifyCustom('Errore nell\'aggiornamento delle impostazioni', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔒 Sicurezza Account</h2>
        <p className="text-gray-600">Gestisci le impostazioni di sicurezza del tuo account.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Autenticazione a Due Fattori</h3>
              <p className="text-sm text-gray-600">Aggiungi un livello extra di sicurezza al tuo account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.twoFactor}
                onChange={(e) => setSecurity({...security, twoFactor: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">Timeout Sessione (minuti)</h3>
            <select
              value={security.sessionTimeout}
              onChange={(e) => setSecurity({...security, sessionTimeout: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minuti</option>
              <option value={30}>30 minuti</option>
              <option value={60}>1 ora</option>
              <option value={120}>2 ore</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Notifiche di Login</h3>
              <p className="text-sm text-gray-600">Ricevi notifiche per nuovi accessi al tuo account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.loginNotifications}
                onChange={(e) => setSecurity({...security, loginNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva Impostazioni'}
          </button>
        </div>
      </div>
    </div>
  )
}
