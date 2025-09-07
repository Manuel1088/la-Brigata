'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { 
  generateAISuggestions, 
  acceptAISuggestion, 
  modifyAISuggestion, 
  rejectAISuggestion,
  AISuggestion,
  Booking,
  CompanyEvent
} from '@/lib/aiShiftScheduler'
import { useState as useReactState } from 'react'

export default function AIShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null)
  const [modifications, setModifications] = useState<Partial<AISuggestion>>({})

  // Dati mock per demo
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [autoSchedule, setAutoSchedule] = useState<any>(null)

  // Carica dati
  useEffect(() => {
    loadMockData()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      generateSuggestions()
    }
  }, [selectedDate])

  const loadMockData = () => {
    // Dati mock per demo
    setBookings([
      {
        id: '1',
        date: selectedDate,
        time: '19:30',
        partySize: 4,
        status: 'confirmed'
      },
      {
        id: '2',
        date: selectedDate,
        time: '20:00',
        partySize: 2,
        status: 'confirmed'
      },
      {
        id: '3',
        date: selectedDate,
        time: '20:30',
        partySize: 6,
        status: 'confirmed'
      }
    ])

    setEvents([
      {
        id: '1',
        name: 'Evento Speciale',
        date: selectedDate,
        type: 'special',
        expectedCoversMultiplier: 1.5
      }
    ])
  }

  const generateSuggestions = async () => {
    setIsGenerating(true)
    try {
      // Simula delay per generazione AI
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newSuggestions = generateAISuggestions(selectedDate, bookings, events)
      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('Errore nella generazione suggerimenti:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAcceptSuggestion = (suggestionId: string) => {
    const success = acceptAISuggestion(suggestionId)
    if (success) {
      setSuggestions(suggestions.filter(s => s.id !== suggestionId))
      // In produzione, aggiornerebbe il database
    }
  }

  const handleModifySuggestion = (suggestion: AISuggestion) => {
    setSelectedSuggestion(suggestion)
    setModifications({
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      suggestedEmployee: suggestion.suggestedEmployee
    })
    setShowModifyModal(true)
  }

  const handleSaveModifications = () => {
    if (!selectedSuggestion) return
    
    const success = modifyAISuggestion(selectedSuggestion.id, modifications)
    if (success) {
      // Aggiorna il suggerimento nella lista
      setSuggestions(suggestions.map(s => 
        s.id === selectedSuggestion.id 
          ? { ...s, ...modifications }
          : s
      ))
      setShowModifyModal(false)
      setSelectedSuggestion(null)
      setModifications({})
    }
  }

  const handleRejectSuggestion = (suggestionId: string) => {
    const reason = prompt('Motivo del rifiuto:')
    if (reason) {
      const success = rejectAISuggestion(suggestionId, reason)
      if (success) {
        setSuggestions(suggestions.filter(s => s.id !== suggestionId))
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800'
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return 'Alta'
    if (confidence >= 60) return 'Media'
    return 'Bassa'
  }

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'Cucina':
        return 'bg-orange-100 text-orange-800'
      case 'Sala':
        return 'bg-green-100 text-green-800'
      case 'Bar':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalCovers = () => {
    return bookings.reduce((sum, booking) => sum + booking.partySize, 0)
  }

  const getSuggestionsByDepartment = () => {
    const grouped: { [key: string]: AISuggestion[] } = {}
    suggestions.forEach(suggestion => {
      if (!grouped[suggestion.department]) {
        grouped[suggestion.department] = []
      }
      grouped[suggestion.department].push(suggestion)
    })
    return grouped
  }

  return (
    <PermissionGuard permission="turni_manage">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                  🤖 AI Suggerimenti Turni
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/shifts')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  📅 Gestisci Turni
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Controlli */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={generateSuggestions}
                    disabled={isGenerating}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {isGenerating ? '🔄 Generando...' : '🤖 Genera Suggerimenti'}
                  </button>
                </div>
              </div>
            </div>

            {/* Statistiche */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📅</div>
                <h3 className="text-lg font-semibold mb-2">Data Selezionata</h3>
                <p className="text-2xl font-bold text-blue-600">{formatDate(selectedDate)}</p>
                <p className="text-sm text-gray-500">Giorno della settimana</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="text-lg font-semibold mb-2">Coperti Previsti</h3>
                <p className="text-2xl font-bold text-green-600">{getTotalCovers()}</p>
                <p className="text-sm text-gray-500">Basato su prenotazioni</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold mb-2">Suggerimenti</h3>
                <p className="text-2xl font-bold text-purple-600">{suggestions.length}</p>
                <p className="text-sm text-gray-500">Turni suggeriti</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">Confidenza Media</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {suggestions.length > 0 
                    ? Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500">Qualità suggerimenti</p>
              </div>
            </div>

            {/* Suggerimenti per Reparto */}
            {suggestions.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(getSuggestionsByDepartment()).map(([department, deptSuggestions]) => (
                  <div key={department} className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold flex items-center">
                        <span className={`px-2 py-1 rounded text-xs mr-2 ${getDepartmentColor(department)}`}>
                          {department}
                        </span>
                        {department} - {deptSuggestions.length} suggerimenti
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {deptSuggestions.map((suggestion) => (
                          <div key={suggestion.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-medium">
                                    {suggestion.suggestedEmployee.name}
                                  </h4>
                                  <span className={`px-2 py-1 rounded text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                                    {suggestion.confidence}% - {getConfidenceText(suggestion.confidence)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                  <div>
                                    <span className="font-medium">Orario:</span> {suggestion.startTime} - {suggestion.endTime}
                                  </div>
                                  <div>
                                    <span className="font-medium">Reparto:</span> {suggestion.department}
                                  </div>
                                  <div>
                                    <span className="font-medium">Tariffa:</span> €{suggestion.suggestedEmployee.hourlyRate}/h
                                  </div>
                                  <div>
                                    <span className="font-medium">Competenze:</span> {suggestion.suggestedEmployee.skills.join(', ')}
                                  </div>
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-3">
                                  <span className="font-medium">Motivazione:</span> {suggestion.reasoning}
                                </div>
                                
                                {suggestion.alternatives.length > 0 && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Alternative:</span> {suggestion.alternatives.map(alt => alt.name).join(', ')}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => handleAcceptSuggestion(suggestion.id)}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
                                >
                                  ✓ Accetta
                                </button>
                                <button
                                  onClick={() => handleModifySuggestion(suggestion)}
                                  className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition text-sm"
                                >
                                  ✏️ Modifica
                                </button>
                                <button
                                  onClick={() => handleRejectSuggestion(suggestion.id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
                                >
                                  ✗ Rifiuta
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nessun Suggerimento Disponibile
                </h3>
                <p className="text-gray-600 mb-6">
                  Clicca su "Genera Suggerimenti" per creare i turni AI per la data selezionata
                </p>
                <button
                  onClick={generateSuggestions}
                  disabled={isGenerating}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isGenerating ? '🔄 Generando...' : '🤖 Genera Suggerimenti AI'}
                </button>
                <div className="mt-4">
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/schedule/generate', { method: 'POST', body: JSON.stringify({ week: new Date() }) })
                      const data = await res.json()
                      setAutoSchedule(data)
                    }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                  >
                    🧠 AutoScheduler (beta)
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Modal Modifica Suggerimento */}
        {showModifyModal && selectedSuggestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">✏️ Modifica Suggerimento</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dipendente
                  </label>
                  <select
                    value={modifications.suggestedEmployee?.id || selectedSuggestion.suggestedEmployee.id}
                    onChange={(e) => {
                      const employee = selectedSuggestion.alternatives.find(alt => alt.id === e.target.value) || selectedSuggestion.suggestedEmployee
                      setModifications({...modifications, suggestedEmployee: employee})
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value={selectedSuggestion.suggestedEmployee.id}>
                      {selectedSuggestion.suggestedEmployee.name}
                    </option>
                    {selectedSuggestion.alternatives.map((alt) => (
                      <option key={alt.id} value={alt.id}>
                        {alt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Inizio
                    </label>
                    <input
                      type="time"
                      value={modifications.startTime || selectedSuggestion.startTime}
                      onChange={(e) => setModifications({...modifications, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Fine
                    </label>
                    <input
                      type="time"
                      value={modifications.endTime || selectedSuggestion.endTime}
                      onChange={(e) => setModifications({...modifications, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModifyModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveModifications}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}
        {autoSchedule && (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Anteprima Piano Settimanale</h3>
              <pre className="text-xs overflow-auto">{JSON.stringify(autoSchedule, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
