'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useAudit } from '@/hooks/useAudit'
import { 
  getAllCompanyEvents,
  addCompanyEvent,
  updateCompanyEvent,
  deleteCompanyEvent,
  CompanyEvent,
  getWeeklyForecast,
  calculateDailyForecast
} from '@/lib/breakEvenCalculator'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canViewReports } = usePermissions()
  const { logReadAction } = useAudit()
  
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [weeklyForecast, setWeeklyForecast] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null)
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    type: 'internal' as 'internal' | 'external' | 'holiday' | 'special',
    expectedCoversMultiplier: 1,
    description: '',
    isRecurring: false
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    logReadAction('calendar')
    loadData()
  }, [session, status, router, logReadAction])

  const loadData = () => {
    const allEvents = getAllCompanyEvents()
    const today = new Date().toISOString().split('T')[0]
    const weekly = getWeeklyForecast(today)
    
    setEvents(allEvents)
    setWeeklyForecast(weekly)
  }

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.date) return
    
    addCompanyEvent(newEvent)
    setNewEvent({
      name: '',
      date: '',
      type: 'internal',
      expectedCoversMultiplier: 1,
      description: '',
      isRecurring: false
    })
    setIsAddingEvent(false)
    loadData()
  }

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo evento?')) {
      deleteCompanyEvent(eventId)
      loadData()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-red-100 text-red-800 border-red-200'
      case 'internal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'external': return 'bg-green-100 text-green-800 border-green-200'
      case 'special': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'holiday': return '🎉'
      case 'internal': return '🏢'
      case 'external': return '🌍'
      case 'special': return '⭐'
      default: return '📅'
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <PermissionGuard permission="report_basic">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition text-lg"
                >
                  ←
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  📅 Calendario Aziendale
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsAddingEvent(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  ➕ Nuovo Evento
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Previsione settimanale */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">📊 Previsione Settimanale</h2>
                <p className="text-sm text-gray-600">Break-even point e previsioni per i prossimi 7 giorni</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weeklyForecast.map((day, index) => {
                    const isToday = day.date === new Date().toISOString().split('T')[0]
                    const isEventDay = day.isEventDay
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${
                          isToday 
                            ? 'bg-blue-50 border-blue-200' 
                            : isEventDay 
                            ? 'bg-yellow-50 border-yellow-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(day.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                          </div>
                          
                          {isEventDay && (
                            <div className="text-xs text-yellow-600 mb-2">
                              🎉 Evento
                            </div>
                          )}
                          
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="text-gray-600">Coperti:</span>
                              <span className={`font-medium ${
                                day.expectedCovers >= day.breakEvenCovers ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {day.expectedCovers}/{day.breakEvenCovers}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-600">Ricavi:</span>
                              <span className="font-medium">{formatCurrency(day.expectedRevenue)}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-600">Margine:</span>
                              <span className={`font-medium ${
                                day.profitMargin > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {day.profitMargin.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Lista eventi */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">📅 Eventi Aziendali</h2>
                <p className="text-sm text-gray-600">Gestisci eventi interni, festività e occasioni speciali</p>
              </div>
              
              <div className="p-6">
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun evento</h3>
                    <p className="text-gray-500 mb-4">Non ci sono eventi aziendali programmati</p>
                    <button
                      onClick={() => setIsAddingEvent(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      ➕ Primo Evento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getEventTypeIcon(event.type)}</span>
                            <div>
                              <h3 className="font-medium text-gray-900">{event.name}</h3>
                              <p className="text-sm text-gray-600">{event.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {new Date(event.date).toLocaleDateString('it-IT')}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}>
                                  {event.type}
                                </span>
                                {event.expectedCoversMultiplier !== 1 && (
                                  <span className="text-xs text-blue-600">
                                    {event.expectedCoversMultiplier}x coperti
                                  </span>
                                )}
                                {event.isRecurring && (
                                  <span className="text-xs text-green-600">🔄 Ricorrente</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              ✏️ Modifica
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              🗑️ Elimina
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modal Aggiungi Evento */}
        {isAddingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Nuovo Evento</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Evento *
                  </label>
                  <input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. Cena Aziendale"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="internal">🏢 Interno</option>
                    <option value="external">🌍 Esterno</option>
                    <option value="holiday">🎉 Festività</option>
                    <option value="special">⭐ Speciale</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moltiplicatore Coperti
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={newEvent.expectedCoversMultiplier}
                    onChange={(e) => setNewEvent({ ...newEvent, expectedCoversMultiplier: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1.0 = normale, 2.0 = doppio, 0.0 = chiusura
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrizione dell'evento..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={newEvent.isRecurring}
                    onChange={(e) => setNewEvent({ ...newEvent, isRecurring: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                    Evento ricorrente
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setIsAddingEvent(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddEvent}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Aggiungi Evento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
