'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function SettingsNotifications() {
  const { notifyCustom } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    teamUpdates: true,
    systemAlerts: true,
    weeklyReport: true
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      notifyCustom('SUCCESS','SYSTEM','Notifiche','Impostazioni aggiornate')
    } catch (error) {
      notifyCustom('ERROR','SYSTEM','Notifiche','Errore nell\'aggiornamento delle notifiche')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔔 Preferenze Notifiche</h2>
        <p className="text-gray-600">Scegli come e quando ricevere le notifiche.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Notifiche Email</h3>
              <p className="text-sm text-gray-600">Ricevi notifiche via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Notifiche Push</h3>
              <p className="text-sm text-gray-600">Ricevi notifiche push nel browser</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Aggiornamenti Team</h3>
              <p className="text-sm text-gray-600">Ricevi notifiche sui cambiamenti del team</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.teamUpdates}
                onChange={(e) => setNotifications({...notifications, teamUpdates: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Avvisi Sistema</h3>
              <p className="text-sm text-gray-600">Ricevi notifiche per problemi del sistema</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.systemAlerts}
                onChange={(e) => setNotifications({...notifications, systemAlerts: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-gray-900">Report Settimanale</h3>
              <p className="text-sm text-gray-600">Ricevi un riassunto settimanale via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.weeklyReport}
                onChange={(e) => setNotifications({...notifications, weeklyReport: e.target.checked})}
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
            {loading ? 'Salvataggio...' : 'Salva Preferenze'}
          </button>
        </div>
      </div>
    </div>
  )
}
