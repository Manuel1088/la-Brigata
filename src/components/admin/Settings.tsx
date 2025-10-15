'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

interface SystemSetting {
  id: string
  name: string
  description: string
  category: 'general' | 'security' | 'backup' | 'notifications' | 'performance'
  type: 'string' | 'number' | 'boolean' | 'select'
  value: string | number | boolean
  options?: string[]
  isRequired: boolean
  isActive: boolean
}

export default function AdminSettings() {
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editedSettings, setEditedSettings] = useState<Record<string, string | number | boolean>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      // Mock settings data
      const mockSettings: SystemSetting[] = [
        // Generale
        {
          id: 'app_name',
          name: 'Nome Applicazione',
          description: 'Nome visualizzato dell\'applicazione',
          category: 'general',
          type: 'string',
          value: 'La Brigata',
          isRequired: true,
          isActive: true
        },
        {
          id: 'app_version',
          name: 'Versione Applicazione',
          description: 'Versione corrente del sistema',
          category: 'general',
          type: 'string',
          value: '1.0.0',
          isRequired: true,
          isActive: true
        },
        {
          id: 'timezone',
          name: 'Fuso Orario',
          description: 'Fuso orario predefinito del sistema',
          category: 'general',
          type: 'select',
          value: 'Europe/Rome',
          options: ['Europe/Rome', 'Europe/London', 'Europe/Paris', 'America/New_York'],
          isRequired: true,
          isActive: true
        },
        {
          id: 'maintenance_mode',
          name: 'Modalità Manutenzione',
          description: 'Abilita modalità manutenzione per tutti gli utenti',
          category: 'general',
          type: 'boolean',
          value: false,
          isRequired: false,
          isActive: true
        },
        
        // Sicurezza
        {
          id: 'session_timeout',
          name: 'Timeout Sessione (minuti)',
          description: 'Durata massima di una sessione utente in minuti',
          category: 'security',
          type: 'number',
          value: 480,
          isRequired: true,
          isActive: true
        },
        {
          id: 'password_min_length',
          name: 'Lunghezza Minima Password',
          description: 'Lunghezza minima richiesta per le password',
          category: 'security',
          type: 'number',
          value: 8,
          isRequired: true,
          isActive: true
        },
        {
          id: 'max_login_attempts',
          name: 'Tentativi Login Massimi',
          description: 'Numero massimo di tentativi di login prima del blocco',
          category: 'security',
          type: 'number',
          value: 5,
          isRequired: true,
          isActive: true
        },
        {
          id: 'two_factor_auth',
          name: 'Autenticazione a Due Fattori',
          description: 'Abilita autenticazione a due fattori per tutti gli utenti',
          category: 'security',
          type: 'boolean',
          value: false,
          isRequired: false,
          isActive: true
        },
        
        // Backup
        {
          id: 'auto_backup',
          name: 'Backup Automatico',
          description: 'Abilita backup automatico del database',
          category: 'backup',
          type: 'boolean',
          value: true,
          isRequired: false,
          isActive: true
        },
        {
          id: 'backup_frequency',
          name: 'Frequenza Backup',
          description: 'Frequenza dei backup automatici',
          category: 'backup',
          type: 'select',
          value: 'daily',
          options: ['hourly', 'daily', 'weekly', 'monthly'],
          isRequired: false,
          isActive: true
        },
        {
          id: 'backup_retention',
          name: 'Ritenzione Backup (giorni)',
          description: 'Numero di giorni per mantenere i backup',
          category: 'backup',
          type: 'number',
          value: 30,
          isRequired: false,
          isActive: true
        },
        
        // Notifiche
        {
          id: 'email_notifications',
          name: 'Notifiche Email',
          description: 'Abilita invio notifiche via email',
          category: 'notifications',
          type: 'boolean',
          value: true,
          isRequired: false,
          isActive: true
        },
        {
          id: 'push_notifications',
          name: 'Notifiche Push',
          description: 'Abilita notifiche push per dispositivi mobili',
          category: 'notifications',
          type: 'boolean',
          value: false,
          isRequired: false,
          isActive: true
        },
        {
          id: 'notification_sound',
          name: 'Suono Notifiche',
          description: 'Abilita suono per le notifiche',
          category: 'notifications',
          type: 'boolean',
          value: true,
          isRequired: false,
          isActive: true
        },
        
        // Performance
        {
          id: 'cache_enabled',
          name: 'Cache Abilitata',
          description: 'Abilita sistema di cache per migliorare le performance',
          category: 'performance',
          type: 'boolean',
          value: true,
          isRequired: false,
          isActive: true
        },
        {
          id: 'cache_ttl',
          name: 'TTL Cache (secondi)',
          description: 'Tempo di vita della cache in secondi',
          category: 'performance',
          type: 'number',
          value: 3600,
          isRequired: false,
          isActive: true
        },
        {
          id: 'max_upload_size',
          name: 'Dimensione Max Upload (MB)',
          description: 'Dimensione massima per i file caricati',
          category: 'performance',
          type: 'number',
          value: 10,
          isRequired: false,
          isActive: true
        }
      ]
      
      setSettings(mockSettings)
      // Inizializza editedSettings con i valori correnti
      const initialEdited = mockSettings.reduce<Record<string, string | number | boolean>>((acc, setting) => {
        acc[setting.id] = setting.value
        return acc
      }, {})
      setEditedSettings(initialEdited)
    } catch (error) {
      console.error('Errore nel caricamento impostazioni:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Impostazioni', 'Errore nel caricamento impostazioni')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (settingId: string, value: string | number | boolean) => {
    setEditedSettings(prev => ({
      ...prev,
      [settingId]: value
    }))
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // Simula salvataggio
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Aggiorna le impostazioni
      setSettings(prev => prev.map(setting => ({
        ...setting,
        value: editedSettings[setting.id] !== undefined ? editedSettings[setting.id] : setting.value
      })))
      
      notifyCustom('SUCCESS', 'SYSTEM', 'Impostazioni', 'Impostazioni salvate con successo')
      logReadAction('settings_updated')
    } catch (error) {
      notifyCustom('ERROR', 'SYSTEM', 'Impostazioni', 'Errore nel salvataggio delle impostazioni')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettings = () => {
      const initialValues = settings.reduce<Record<string, string | number | boolean>>((acc, setting) => {
      acc[setting.id] = setting.value
      return acc
    }, {})
    setEditedSettings(initialValues)
    notifyCustom('INFO', 'SYSTEM', 'Impostazioni', 'Impostazioni ripristinate')
    logReadAction('settings_reset')
  }

  const filteredSettings = settings.filter(setting => {
    return categoryFilter === 'all' || setting.category === categoryFilter
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general': return '⚙️'
      case 'security': return '🔒'
      case 'backup': return '💾'
      case 'notifications': return '🔔'
      case 'performance': return '⚡'
      default: return '📋'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'general': return 'Generale'
      case 'security': return 'Sicurezza'
      case 'backup': return 'Backup'
      case 'notifications': return 'Notifiche'
      case 'performance': return 'Performance'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'general': return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'security': return 'bg-red-50 text-red-800 border-red-200'
      case 'backup': return 'bg-green-50 text-green-800 border-green-200'
      case 'notifications': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'performance': return 'bg-purple-50 text-purple-800 border-purple-200'
      default: return 'bg-gray-50 text-gray-800 border-gray-200'
    }
  }

  const hasChanges = settings.some(setting => {
    return editedSettings[setting.id] !== undefined && editedSettings[setting.id] !== setting.value
  })

  const categories = Array.from(new Set(settings.map(s => s.category))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <div className="text-xl text-gray-700">Caricamento impostazioni...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{settings.length}</div>
          <div className="text-sm text-blue-700">Impostazioni Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {settings.filter(s => s.isActive).length}
          </div>
          <div className="text-sm text-green-700">Attive</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {settings.filter(s => s.isRequired).length}
          </div>
          <div className="text-sm text-orange-700">Obbligatorie</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
          <div className="text-sm text-purple-700">Categorie</div>
        </div>
      </div>

      {/* Filtri e Azioni */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutte</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={handleSaveSettings}
              disabled={!hasChanges || saving}
              className={`flex-1 px-4 py-2 rounded-lg transition ${
                hasChanges && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? '⏳ Salvando...' : '💾 Salva Modifiche'}
            </button>
            
            <button
              onClick={handleResetSettings}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-lg transition ${
                hasChanges && !saving
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {hasChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm text-yellow-800">
                Hai modifiche non salvate. Ricordati di salvare prima di uscire.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lista Impostazioni */}
      <div className="space-y-6">
        {filteredSettings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">⚙️</div>
            <p className="text-gray-500">Nessuna impostazione trovata</p>
            <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
          </div>
        ) : (
          filteredSettings.map(setting => (
            <div key={setting.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{getCategoryIcon(setting.category)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{setting.name}</h3>
                      <p className="text-gray-600">{setting.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(setting.category)}`}>
                      {getCategoryLabel(setting.category)}
                    </span>
                    {setting.isRequired && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Obbligatorio
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    {setting.type === 'boolean' ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editedSettings[setting.id])}
                          onChange={(e) => handleSettingChange(setting.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {editedSettings[setting.id] ? 'Abilitato' : 'Disabilitato'}
                        </span>
                      </label>
                    ) : setting.type === 'select' ? (
                      <select
                        value={String(editedSettings[setting.id] ?? setting.value)}
                        onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {setting.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : setting.type === 'number' ? (
                      <input
                        type="number"
                        value={Number(editedSettings[setting.id] ?? setting.value)}
                        onChange={(e) => handleSettingChange(setting.id, Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(editedSettings[setting.id] ?? setting.value)}
                        onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
