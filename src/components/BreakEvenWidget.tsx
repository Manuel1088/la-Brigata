'use client'
import { useState, useMemo, useCallback } from 'react'

interface BreakEvenData {
  fixedCosts: number
  variableCostPerUnit: number
  pricePerUnit: number
}

// Validazione input sicura
const validateNumber = (value: string, min: number = 0, max: number = 1000000): number => {
  const num = parseFloat(value)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

// Formattazione valuta sicura
const formatCurrency = (amount: number | undefined): string => {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) return '€0,00'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Formattazione numero unità
const formatUnits = (units: number | undefined): string => {
  if (typeof units !== 'number' || isNaN(units) || !isFinite(units)) return '0'
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(units)
}

export default function BreakEvenWidget() {
  const [data, setData] = useState<BreakEvenData>({
    fixedCosts: 5000,
    variableCostPerUnit: 8,
    pricePerUnit: 20
  })
  
  const [showInfo, setShowInfo] = useState(false)

  // Calcoli break-even memoizzati con validazione completa
  const calculations = useMemo(() => {
    const { fixedCosts, variableCostPerUnit, pricePerUnit } = data
    
    // Validazione input
    const fc = validateNumber(String(fixedCosts), 0)
    const vc = validateNumber(String(variableCostPerUnit), 0)
    const p = validateNumber(String(pricePerUnit), 0)
    
    // Margine di contribuzione
    const contributionMargin = p - vc
    
    // Prevenzione divisione per zero
    if (contributionMargin <= 0) {
      return {
        breakEvenUnits: 0,
        breakEvenRevenue: 0,
        contributionMargin: 0,
        contributionMarginPercent: 0,
        isValid: false,
        errorMessage: 'Il prezzo deve essere superiore al costo variabile'
      }
    }
    
    // Calcolo unità break-even
    const breakEvenUnits = fc / contributionMargin
    
    // Validazione risultato
    if (!isFinite(breakEvenUnits) || isNaN(breakEvenUnits)) {
      return {
        breakEvenUnits: 0,
        breakEvenRevenue: 0,
        contributionMargin: 0,
        contributionMarginPercent: 0,
        isValid: false,
        errorMessage: 'Errore nel calcolo. Verifica i valori inseriti.'
      }
    }
    
    // Calcolo ricavo break-even
    const breakEvenRevenue = breakEvenUnits * p
    
    // Percentuale margine di contribuzione
    const contributionMarginPercent = (contributionMargin / p) * 100
    
    return {
      breakEvenUnits,
      breakEvenRevenue,
      contributionMargin,
      contributionMarginPercent,
      isValid: true,
      errorMessage: null
    }
  }, [data])

  // Handler aggiornamento input
  const handleInputChange = useCallback((field: keyof BreakEvenData, value: string) => {
    const numValue = validateNumber(value, 0, 1000000)
    setData(prev => ({ ...prev, [field]: numValue }))
  }, [])

  // Simulazione profitto/perdita
  const profitAtUnits = useCallback((units: number) => {
    const revenue = units * data.pricePerUnit
    const totalCosts = data.fixedCosts + (units * data.variableCostPerUnit)
    const profit = revenue - totalCosts
    
    return {
      revenue,
      totalCosts,
      profit,
      isProfit: profit >= 0
    }
  }, [data])

  // Esempi di simulazione
  const simulations = useMemo(() => {
    if (!calculations.isValid) return []
    
    const beUnits = Math.ceil(calculations.breakEvenUnits)
    
    return [
      { units: Math.floor(beUnits * 0.5), label: '50% BE' },
      { units: beUnits, label: 'Break-Even' },
      { units: Math.ceil(beUnits * 1.5), label: '150% BE' },
      { units: Math.ceil(beUnits * 2), label: '200% BE' }
    ].map(sim => ({
      ...sim,
      ...profitAtUnits(sim.units)
    }))
  }, [calculations, profitAtUnits])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📈 Break-Even Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">
            Calcola il punto di pareggio del tuo business
          </p>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {showInfo ? '✕ Chiudi' : 'ℹ️ Info'}
        </button>
      </div>

      {/* Pannello informativo */}
      {showInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Come funziona?</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Break-Even Point:</strong> Il punto in cui i ricavi totali eguagliano i costi totali.
            </p>
            <p>
              <strong>Formula:</strong> BE = Costi Fissi / (Prezzo - Costi Variabili)
            </p>
            <p>
              <strong>Margine di Contribuzione:</strong> Quanto ogni unità venduta contribuisce a coprire i costi fissi.
            </p>
          </div>
        </div>
      )}

      {/* Form di input */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💰 Costi Fissi (€/mese)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={data.fixedCosts}
            onChange={(e) => handleInputChange('fixedCosts', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="es. 5000"
          />
          <p className="text-xs text-gray-500 mt-1">Affitto, stipendi fissi, utenze</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📦 Costo Variabile per Unità (€)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={data.variableCostPerUnit}
            onChange={(e) => handleInputChange('variableCostPerUnit', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="es. 8"
          />
          <p className="text-xs text-gray-500 mt-1">Materie prime, packaging</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💵 Prezzo di Vendita (€)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={data.pricePerUnit}
            onChange={(e) => handleInputChange('pricePerUnit', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="es. 20"
          />
          <p className="text-xs text-gray-500 mt-1">Prezzo al cliente finale</p>
        </div>
      </div>

      {/* Messaggio errore */}
      {!calculations.isValid && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-red-800 font-medium">{calculations.errorMessage}</span>
          </div>
        </div>
      )}

      {/* Risultati principali */}
      {calculations.isValid && (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Break-Even Point */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <h3 className="text-sm font-medium opacity-90">Break-Even Point</h3>
                  <p className="text-xs opacity-75">Unità da vendere per pareggiare</p>
                </div>
              </div>
              <div className="text-4xl font-bold">
                {formatUnits(calculations.breakEvenUnits)}
              </div>
              <div className="mt-2 text-sm opacity-90">
                unità
              </div>
            </div>

            {/* Ricavo Break-Even */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">💰</span>
                <div>
                  <h3 className="text-sm font-medium opacity-90">Ricavo Break-Even</h3>
                  <p className="text-xs opacity-75">Fatturato necessario</p>
                </div>
              </div>
              <div className="text-4xl font-bold">
                {formatCurrency(calculations.breakEvenRevenue)}
              </div>
              <div className="mt-2 text-sm opacity-90">
                al mese
              </div>
            </div>
          </div>

          {/* Metriche secondarie */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Margine di Contribuzione</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(calculations.contributionMargin)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">per unità</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {calculations.contributionMarginPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Vendite Giornaliere</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatUnits(calculations.breakEvenUnits / 30)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">unità/giorno</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {formatCurrency((calculations.breakEvenRevenue / 30))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Simulazioni Profitto/Perdita */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Simulazione Profitto/Perdita
            </h3>
            
            <div className="space-y-3">
              {simulations.map((sim, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border-2 transition ${
                    sim.isProfit 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {sim.isProfit ? '✅' : '❌'}
                      </span>
                      <div>
                        <span className="font-semibold text-gray-900">
                          {formatUnits(sim.units)} unità
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({sim.label})
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        sim.isProfit ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {sim.isProfit ? '+' : ''}{formatCurrency(sim.profit)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Ricavi: </span>
                      <span className="font-medium">{formatCurrency(sim.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Costi Totali: </span>
                      <span className="font-medium">{formatCurrency(sim.totalCosts)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grafico visuale semplice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              📈 Break-Even Chart
            </h4>
            <div className="relative h-40">
              {/* Asse Y */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>
              {/* Asse X */}
              <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-300"></div>
              
              {/* Punto Break-Even */}
              <div 
                className="absolute bottom-0 w-1 bg-blue-600"
                style={{ 
                  left: '50%', 
                  height: '50%',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                  BE: {formatUnits(calculations.breakEvenUnits)}
                </div>
              </div>
              
              {/* Zona perdita */}
              <div 
                className="absolute left-0 bottom-0 bg-red-100 opacity-50"
                style={{ width: '50%', height: '100%' }}
              >
                <span className="absolute top-2 left-2 text-xs text-red-600 font-medium">
                  Perdita
                </span>
              </div>
              
              {/* Zona profitto */}
              <div 
                className="absolute right-0 bottom-0 bg-green-100 opacity-50"
                style={{ width: '50%', height: '100%' }}
              >
                <span className="absolute top-2 right-2 text-xs text-green-600 font-medium">
                  Profitto
                </span>
              </div>
            </div>
            
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>0 unità</span>
              <span>{formatUnits(calculations.breakEvenUnits * 2)} unità</span>
            </div>
          </div>

          {/* Suggerimenti */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Suggerimenti</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {calculations.contributionMarginPercent < 30 && (
                <li>⚠️ Il margine è basso ({calculations.contributionMarginPercent.toFixed(1)}%). Considera di aumentare il prezzo o ridurre i costi variabili.</li>
              )}
              {calculations.breakEvenUnits > 1000 && (
                <li>⚠️ Serve vendere {formatUnits(calculations.breakEvenUnits)} unità. Verifica se è un volume realistico per il tuo mercato.</li>
              )}
              {calculations.contributionMarginPercent >= 50 && (
                <li>✅ Ottimo margine di contribuzione! Hai spazio per competere sul prezzo o investire in marketing.</li>
              )}
              <li>
                📌 Ogni unità venduta oltre il break-even genera {formatCurrency(calculations.contributionMargin)} di profitto.
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center">
        <p className="text-xs text-gray-500">
          💡 Usa questo strumento per pianificare prezzi, budget e obiettivi di vendita
        </p>
      </div>
    </div>
  )
}