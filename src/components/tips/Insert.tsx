'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatEuro } from '@/lib/utils'

export default function TipsInsert() {
  const { data: session } = useSession()
  const { restaurant } = useDashboardData()

  const [amountCash, setAmountCash] = useState('')
  const [amountCard, setAmountCard] = useState('')
  const [amountForeign, setAmountForeign] = useState('')
  // Carta lordo/netto
  const [cardGross, setCardGross] = useState('')
  const [cardNet, setCardNet] = useState('')
  const [useGrossNet, setUseGrossNet] = useState(false)

  const [selectedLocation, setSelectedLocation] = useState('')
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [message, setMessage] = useState('')

  const restaurantId =
    (session?.user?.restaurantId as string | undefined) ?? restaurant?.id

  // Rettifica carta fine mese
  const now = new Date()
  const [adjMonth, setAdjMonth] = useState(String(now.getMonth() + 1))
  const [adjYear, setAdjYear] = useState(String(now.getFullYear()))
  const [adjGross, setAdjGross] = useState('')
  const [adjNet, setAdjNet] = useState('')
  const [adjLoading, setAdjLoading] = useState(false)
  const [adjResult, setAdjResult] = useState<{
    taxDifference: number
    updatedDays: number
    updatedEmployees: number
    avgAmountPerPoint: number
  } | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false
    const load = async () => {
      setIsLoadingLocations(true)
      try {
        const params = restaurantId ? new URLSearchParams({ restaurantId }) : ''
        const url = params ? `/api/tips?${params}` : '/api/tips'
        const res = await fetch(url, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || 'Caricamento location fallito')
        }
        const locs = (data.locations ?? []) as Array<{ id: string; name: string }>
        if (!cancelled) {
          setLocations(locs)
          if (locs.length > 0) setSelectedLocation((prev) => prev || locs[0].id)
        }
      } catch (err) {
        if (!cancelled) {
          setLocations([])
          const msg = err instanceof Error ? err.message : 'Errore caricamento'
          setMessage(`❌ ${msg}`)
          setTimeout(() => setMessage(''), 4000)
        }
      } finally {
        if (!cancelled) setIsLoadingLocations(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [session?.user?.id, restaurantId])

  // Calcola differenza tasse per rettifica mensile
  const adjTaxDiff = useMemo(() => {
    const g = parseFloat(adjGross || '0') || 0
    const n = parseFloat(adjNet || '0') || 0
    if (g <= 0 || n <= 0 || n > g) return null
    return g - n
  }, [adjGross, adjNet])

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    const g = parseFloat(adjGross || '0') || 0
    const n = parseFloat(adjNet || '0') || 0
    if (g <= 0 || n <= 0) {
      alert('Inserisci importo lordo e netto validi')
      return
    }
    if (!restaurantId) {
      alert('Ristorante non configurato')
      return
    }
    setAdjLoading(true)
    setAdjResult(null)
    try {
      const res = await fetch('/api/tips/card-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
          month: Number(adjMonth),
          year: Number(adjYear),
          grossAmount: g,
          netAmount: n,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Errore applicazione rettifica')
      setAdjResult({
        taxDifference: (data as { adjustment: { taxDifference: number } }).adjustment.taxDifference,
        updatedDays: (data as { updatedDays: number }).updatedDays,
        updatedEmployees: (data as { updatedEmployees: number }).updatedEmployees,
        avgAmountPerPoint: (data as { avgAmountPerPoint: number }).avgAmountPerPoint,
      })
      setAdjGross('')
      setAdjNet('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setAdjLoading(false)
    }
  }

  // Calcola differenza tasse carta
  const cardTaxDiff = useMemo(() => {
    if (!useGrossNet) return null
    const g = parseFloat(cardGross || '0') || 0
    const n = parseFloat(cardNet || '0') || 0
    if (g <= 0 || n <= 0) return null
    return Math.max(0, g - n)
  }, [useGrossNet, cardGross, cardNet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numCash = parseFloat(amountCash || '0') || 0
    const numForeign = parseFloat(amountForeign || '0') || 0

    // Carta: usa lordo/netto se attivi, altrimenti importo semplice
    const numCardGross = useGrossNet ? (parseFloat(cardGross || '0') || 0) : 0
    const numCardNet = useGrossNet ? (parseFloat(cardNet || '0') || 0) : 0
    const numCardSimple = parseFloat(amountCard || '0') || 0
    const numCard = useGrossNet ? numCardNet : numCardSimple

    const hasAnyAmount = numCash > 0 || numCard > 0 || numForeign > 0

    if (!hasAnyAmount || !selectedLocation) {
      setMessage('❌ Inserisci almeno un importo e seleziona la sala')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (!restaurantId) {
      setMessage('❌ Ristorante non configurato per il tuo account')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
          locationId: selectedLocation,
          date,
          amounts: {
            cash: numCash,
            card: useGrossNet ? undefined : numCardSimple,
            foreign: numForeign,
            ...(useGrossNet && numCardGross > 0
              ? { cardGrossAmount: numCardGross, cardNetAmount: numCardNet }
              : {}),
          },
          notes: notes || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(data.error || 'Salvataggio fallito')

      const warning = data.warning as string | undefined
      setMessage(
        warning
          ? `✅ Mancia salvata. ${warning}`
          : `✅ Mancia salvata e distribuita a ${data.distributions?.length ?? 0} dipendenti`
      )

      try { window.dispatchEvent(new CustomEvent('tip_entries_updated')) } catch {}

      setTimeout(() => {
        setMessage('')
        setAmountCash('')
        setAmountCard('')
        setAmountForeign('')
        setCardGross('')
        setCardNet('')
        setNotes('')
      }, 3500)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore durante il salvataggio'
      setMessage(`❌ ${msg}`)
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setIsLoading(false)
    }
  }

  const shiftDate = (delta: number) => {
    try {
      const d = new Date(date)
      d.setDate(d.getDate() + delta)
      setDate(d.toISOString().split('T')[0])
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto">
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">📝 Nuova Mancia</h2>
          <p className="text-sm text-gray-600 mt-1">
            Salvataggio su database con distribuzione automatica
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Data */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">📅 Data</label>
            <div className="grid grid-cols-3 items-center">
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  aria-label="Giorno precedente"
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
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Importi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">💰 Importi</label>
            <div className="grid md:grid-cols-3 gap-3">
              {/* Contanti */}
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

              {/* Carta */}
              <div className="p-3 border rounded-lg bg-blue-50 col-span-1 md:col-span-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-gray-700">💳 Carta</div>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useGrossNet}
                      onChange={(e) => {
                        setUseGrossNet(e.target.checked)
                        if (!e.target.checked) { setCardGross(''); setCardNet('') }
                        else setAmountCard('')
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500"
                    />
                    <span className="text-xs text-blue-700">Lordo/Netto</span>
                  </label>
                </div>

                {!useGrossNet ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountCard}
                    onChange={(e) => setAmountCard(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Importo lordo</div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cardGross}
                        onChange={(e) => setCardGross(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Importo netto</div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cardNet}
                        onChange={(e) => setCardNet(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    {cardTaxDiff !== null && (
                      <div className="text-xs text-orange-600 font-medium bg-orange-50 rounded px-2 py-1">
                        Commissioni: −€{cardTaxDiff.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Monete estere */}
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

          {/* Sala */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🏢 Sala di Provenienza
            </label>
            {isLoadingLocations ? (
              <p className="text-sm text-gray-500">Caricamento sale...</p>
            ) : locations.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Nessuna location trovata per questo ristorante.
              </p>
            ) : (
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
                      <div
                        className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedLocation === loc.id
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedLocation === loc.id && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                        )}
                      </div>
                      <span className="text-lg">{loc.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Note (opzionale)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Annotazioni utili (es. turno, evento, anomalie)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading || isLoadingLocations || locations.length === 0}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Salvataggio...' : '💾 Salva Mancia'}
            </button>
          </div>
        </form>
      </div>

      {/* Rettifica carta fine mese */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">💳 Rettifica carta fine mese</h2>
          <p className="text-sm text-gray-600 mt-1">
            Applica la differenza tra lordo incassato e netto ricevuto dall&apos;ufficio su tutto il mese
          </p>
        </div>

        <form onSubmit={handleAdjustment} className="p-6 space-y-5">
          {/* Mese e anno */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mese</label>
              <select
                value={adjMonth}
                onChange={(e) => { setAdjMonth(e.target.value); setAdjResult(null) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                {[
                  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
                ].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anno</label>
              <select
                value={adjYear}
                onChange={(e) => { setAdjYear(e.target.value); setAdjResult(null) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Importi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo lordo totale</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={adjGross}
                onChange={(e) => { setAdjGross(e.target.value); setAdjResult(null) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Netto ricevuto dall&apos;ufficio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={adjNet}
                onChange={(e) => { setAdjNet(e.target.value); setAdjResult(null) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Differenza tasse live */}
          {adjTaxDiff !== null && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-sm text-orange-700 font-medium">
                Differenza tasse: −{formatEuro(adjTaxDiff)}
              </span>
              <span className="text-xs text-orange-500">
                ({((adjTaxDiff / (parseFloat(adjGross) || 1)) * 100).toFixed(2)}% del lordo)
              </span>
            </div>
          )}

          {/* Risultato dopo applicazione */}
          {adjResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
              <p className="text-sm font-semibold text-green-800">✅ Rettifica applicata</p>
              <p className="text-sm text-green-700">
                Differenza dedotta: {formatEuro(adjResult.taxDifference)}
              </p>
              <p className="text-sm text-green-700">
                Giorni ricalcolati: {adjResult.updatedDays} · Dipendenti aggiornati: {adjResult.updatedEmployees}
              </p>
              {adjResult.avgAmountPerPoint > 0 && (
                <p className="text-sm text-green-700">
                  Importo medio per punto: {formatEuro(adjResult.avgAmountPerPoint)}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={adjLoading || !adjGross || !adjNet}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              {adjLoading ? 'Applicazione...' : 'Applica rettifica'}
            </button>
          </div>

          <p className="text-xs text-gray-400 italic">
            In futuro collegando il POS le commissioni saranno dedotte automaticamente su ogni transazione.
          </p>
        </form>
      </div>
    </div>
  )
}
