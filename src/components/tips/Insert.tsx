'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useCompanyData } from '@/hooks/useCompanyData'
import type { CompanyData } from '@/hooks/useCompanyData'

// Tipi di pagamento
const paymentTypes = [
  { id: 'cash', name: '💵 Contanti', color: 'green' },
  { id: 'card', name: '💳 Carta di Credito', color: 'blue' },
  { id: 'foreign', name: '🌍 Monete Estere', color: 'purple' }
]

export default function TipsInsert() {
  const { data: session } = useSession()
  
  // Stati del form
  const [amountCash, setAmountCash] = useState('')
  const [amountCard, setAmountCard] = useState('')
  const [amountForeign, setAmountForeign] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Carica sale esistenti dalla pagina /sale, scope per codice fiscale azienda (via hook condiviso)
  const { data: companyData } = useCompanyData(session?.user?.id)
  useEffect(() => {
    let cancelled = false
    const fiscal: string | undefined = (companyData as CompanyData | null | undefined)?.company?.fiscalCode
    if (!fiscal) return
    const key = `booking_areas_v1::${fiscal}`
    const load = () => {
      try {
        const raw = localStorage.getItem(key)
        const areas = (raw ? JSON.parse(raw) : []) as Array<{ id: string; name: string }>
        const locs = (areas || []).map((a) => ({ id: a.id, name: a.name }))
        if (!cancelled) {
          setLocations(locs)
          if (!selectedLocation && locs.length > 0) setSelectedLocation(locs[0].id)
        }
      } catch {
        if (!cancelled) setLocations([])
      }
    }
    load()
    const onUpdate = () => load()
    try { window.addEventListener('booking_areas_updated', onUpdate) } catch {}
    return () => { try { window.removeEventListener('booking_areas_updated', onUpdate) } catch {}; cancelled = true }
  }, [selectedLocation, companyData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const numCash = parseFloat(amountCash || '0') || 0
    const numCard = parseFloat(amountCard || '0') || 0
    const numForeign = parseFloat(amountForeign || '0') || 0
    const hasAnyAmount = numCash > 0 || numCard > 0 || numForeign > 0

    if (!hasAnyAmount || !selectedLocation) {
      setMessage('❌ Inserisci almeno un importo e seleziona la sala')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    
    try {
      // Determina la chiave per il ristorante
      const rid = session?.user?.restaurantId as string | undefined
      let tipsKey = ''
      if (rid) {
        tipsKey = `tipEntries_v1::${rid}`
      } else {
        const firstRest = (companyData as CompanyData | null | undefined)?.company?.restaurants?.[0]?.id as string | undefined
        if (firstRest) tipsKey = `tipEntries_v1::${firstRest}`
      }

      if (!tipsKey) {
        setMessage('❌ Errore: ristorante non trovato')
        setTimeout(() => setMessage(''), 3000)
        return
      }

      // Simula persistenza locale (tip entries database locale)
      const raw = localStorage.getItem(tipsKey)
      const arr: Array<{ id: string; date: string; location: string; type: 'cash'|'card'|'foreign'; amount: number; notes: string; createdAt: string }> = raw ? JSON.parse(raw) : []
      const locName = locations.find(l => l.id === selectedLocation)?.name || selectedLocation
      if (numCash > 0) {
        arr.push({ id: crypto.randomUUID(), date, location: locName, type: 'cash', amount: numCash, notes, createdAt: new Date().toISOString() })
      }
      if (numCard > 0) {
        arr.push({ id: crypto.randomUUID(), date, location: locName, type: 'card', amount: numCard, notes, createdAt: new Date().toISOString() })
      }
      if (numForeign > 0) {
        arr.push({ id: crypto.randomUUID(), date, location: locName, type: 'foreign', amount: numForeign, notes, createdAt: new Date().toISOString() })
      }
      localStorage.setItem(tipsKey, JSON.stringify(arr))
      try { window.dispatchEvent(new CustomEvent('tip_entries_updated')) } catch {}

      setMessage('✅ Mancia inserita con successo!')
      setTimeout(() => {
        setMessage('')
        // Reset form
        setAmountCash('')
        setAmountCard('')
        setAmountForeign('')
        setSelectedLocation('')
        setNotes('')
      }, 2000)
      
    } catch (error) {
      setMessage('❌ Errore durante il salvataggio')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const shiftDate = (delta: number) => {
    try {
      const d = new Date(date)
      d.setDate(d.getDate() + delta)
      const iso = d.toISOString().split('T')[0]
      setDate(iso)
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Messaggio di stato */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            📝 Nuova Mancia
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Inserisci i dettagli della mancia ricevuta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Data con frecce sinistra/destra e input centrato */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">📅 Data</label>
            <div className="grid grid-cols-3 items-center">
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  aria-label="Giorno precedente"
                  title="Giorno precedente"
                >
                  ←
                </button>
              </div>
              <div className="flex justify-center">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  aria-label="Giorno successivo"
                  title="Giorno successivo"
                >
                  →
                </button>
              </div>
            </div>
          </div>
          
          {/* Importi per tipo pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">💰 Importi</label>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-green-50">
                <div className="text-sm text-gray-700 mb-1">💵 Contanti</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountCash}
                  onChange={(e) => setAmountCash(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="0.00"
                />
              </div>
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="text-sm text-gray-700 mb-1">💳 Carta</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountCard}
                  onChange={(e) => setAmountCard(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="0.00"
                />
              </div>
              <div className="p-3 border rounded-lg bg-purple-50">
                <div className="text-sm text-gray-700 mb-1">🌍 Monete Estere</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountForeign}
                  onChange={(e) => setAmountForeign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Sala di Provenienza */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🏢 Sala di Provenienza
            </label>
            <div className="flex flex-wrap gap-3">
              {locations.map((loc) => (
                <label
                  key={loc.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition whitespace-nowrap ${
                    selectedLocation === loc.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="location"
                    value={loc.id}
                    checked={selectedLocation === loc.id}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      selectedLocation === loc.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}>
                      {selectedLocation === loc.id && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <span className="text-lg">{loc.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📝 Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Annotazioni utili (es. turno, evento, anomalie)"
            />
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Salvataggio...' : '💾 Salva Mancia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
