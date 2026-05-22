import { formatEuro } from '@/lib/utils'

/**
 * Utility per formattazione sicura dei numeri
 * Previene errori NaN e gestisce tutti i casi edge
 */

/**
 * Formatta un numero in modo sicuro, prevenendo errori NaN
 * @param value - Il valore da formattare (può essere number, undefined, null, string)
 * @param options - Opzioni di formattazione
 * @returns Stringa formattata o '0' se il valore non è valido
 */
export const formatNumber = (
  value: number | string | undefined | null,
  options: {
    decimals?: number
    fallback?: string
    round?: boolean
  } = {}
): string => {
  const { decimals = 0, fallback = '0', round = true } = options

  // Controlla se il valore è null o undefined
  if (value == null) {
    return fallback
  }

  // Converte in numero se è una stringa
  let numValue: number
  if (typeof value === 'string') {
    numValue = parseFloat(value)
  } else {
    numValue = value
  }

  // Controlla se il numero è valido e finito
  if (!isFinite(numValue) || isNaN(numValue)) {
    return fallback
  }

  // Arrotonda se richiesto
  const finalValue = round ? Math.round(numValue) : numValue

  // Formatta con decimali se richiesti
  if (decimals > 0) {
    return finalValue.toFixed(decimals)
  }

  return finalValue.toString()
}

/**
 * Formatta un numero come percentuale
 * @param value - Il valore da formattare (0-1 o 0-100)
 * @param options - Opzioni di formattazione
 * @returns Stringa formattata come percentuale
 */
export const formatPercentage = (
  value: number | string | undefined | null,
  options: {
    decimals?: number
    fallback?: string
    isDecimal?: boolean // true se il valore è già in decimali (0.5 = 50%)
  } = {}
): string => {
  const { decimals = 1, fallback = '0%', isDecimal = true } = options

  const formatted = formatNumber(value, { fallback: '0' })
  if (formatted === fallback) return fallback

  const numValue = parseFloat(formatted)
  const percentage = isDecimal ? numValue * 100 : numValue

  return `${formatNumber(percentage, { decimals })}%`
}

/**
 * Formatta un numero come valuta
 * @param value - Il valore da formattare
 * @param options - Opzioni di formattazione
 * @returns Stringa formattata come valuta
 */
/** @deprecated Preferire formatEuro da @/lib/utils per valori in EUR */
export const formatCurrency = (
  value: number | string | undefined | null,
  options: {
    currency?: string
    decimals?: number
    fallback?: string
  } = {}
): string => {
  const { currency = 'EUR', decimals = 2, fallback = '€0' } = options

  if (currency === 'EUR') {
    const n =
      value == null || value === ''
        ? NaN
        : typeof value === 'string'
          ? Number(value)
          : value
    if (!Number.isFinite(n)) return fallback
    return formatEuro(n)
  }

  const formatted = formatNumber(value, { decimals, fallback: '0' })
  if (formatted === '0') return fallback

  return `${currency}${formatted}`
}

/**
 * Formatta un numero con separatori delle migliaia
 * @param value - Il valore da formattare
 * @param options - Opzioni di formattazione
 * @returns Stringa formattata con separatori
 */
export const formatNumberWithSeparators = (
  value: number | string | undefined | null,
  options: {
    decimals?: number
    fallback?: string
  } = {}
): string => {
  const { decimals = 0, fallback = '0' } = options

  const formatted = formatNumber(value, { decimals, fallback })
  if (formatted === fallback) return fallback

  const numValue = parseFloat(formatted)
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue)
}

/**
 * Utility per calcoli sicuri che previene NaN
 * @param values - Array di valori da sommare
 * @returns Somma sicura o 0
 */
export const safeSum = (...values: (number | string | undefined | null)[]): number => {
  if (values.length === 0) return 0
  
  return values.reduce((sum: number, value) => {
    const num = parseFloat(formatNumber(value, { fallback: '0' }))
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
}

/**
 * Utility per calcoli di media sicura
 * @param values - Array di valori per la media
 * @returns Media sicura o 0
 */
export const safeAverage = (values: (number | string | undefined | null)[]): number => {
  const validValues = values.filter(v => v != null && !isNaN(Number(v)))
  if (validValues.length === 0) return 0
  
  const sum = safeSum(...validValues)
  return sum / validValues.length
}

/**
 * Formatta una data in modo sicuro
 * @param dateString - Stringa data da formattare
 * @param options - Opzioni di formattazione
 * @returns Data formattata o stringa originale come fallback
 */
export const safeFormatDate = (
  dateString: string | Date | undefined | null,
  options: {
    locale?: string
    weekday?: 'long' | 'short' | 'narrow'
    day?: 'numeric' | '2-digit'
    month?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    year?: 'numeric' | '2-digit'
    fallback?: string
  } = {}
): string => {
  const { 
    locale = 'it-IT', 
    weekday = 'long',
    day = 'numeric',
    month = 'short',
    year = 'numeric',
    fallback = 'Data non disponibile'
  } = options

  if (!dateString) return fallback

  try {
    const date = new Date(dateString)
    
    // Verifica che la data sia valida
    if (isNaN(date.getTime())) {
      return fallback
    }

    return date.toLocaleDateString(locale, { 
      weekday, 
      day, 
      month, 
      year 
    })
  } catch (error) {
    console.warn('Errore nella formattazione data:', error)
    return fallback
  }
}
