export type PlanScope = 'employee' | 'restaurant'

export type CheckoutPlanId = 'PREMIUM' | 'BASIC' | 'PRO'

export type BillingInterval = 'monthly' | 'annual'

/** Sconto sul totale annuale rispetto a 12 mesi interi */
export const ANNUAL_DISCOUNT = 0.2

export interface SubscriptionPlanDefinition {
  id: CheckoutPlanId
  name: string
  subtitle: string
  monthlyPrice: number
  currency: string
  icon: string
  color: string
  description: string
  scope: PlanScope
  audience: string
  recommended?: boolean
  /** Limite analisi AI gratuite al mese (solo piano dipendente Premium) */
  token_limit?: number
  /** Totale annuale (−20%) arrotondato per difetto all'euro intero */
  annualTotalFloorInteger?: boolean
  features: { icon: string; text: string; highlight?: boolean }[]
}

export const PAID_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: 'PREMIUM',
    name: 'Premium Dipendente',
    subtitle: 'Strumenti personali',
    monthlyPrice: 1.99,
    currency: '€',
    icon: '⭐',
    color: 'blue',
    description: 'Busta paga, 730 e export per ogni membro del team',
    scope: 'employee',
    audience: 'Tutti',
    token_limit: 10,
    annualTotalFloorInteger: true,
    features: [
      { icon: '🤖', text: '10 analisi AI incluse/mese', highlight: true },
      { icon: '📋', text: 'Analisi busta paga con CCNL' },
      { icon: '🧾', text: 'Simulatore 730 per dichiarare le mance' },
      { icon: '📄', text: 'Export PDF storico mance annuale' },
      { icon: '🔔', text: 'Notifiche avanzate turni e mance' },
      { icon: '➕', text: 'Pacchetti extra AI oltre il limite mensile' },
    ],
  },
  {
    id: 'BASIC',
    name: 'Prenotazioni',
    subtitle: 'Basic',
    monthlyPrice: 29,
    currency: '€',
    icon: '📅',
    color: 'orange',
    description: 'Gestione prenotazioni e sala per il ristorante',
    scope: 'restaurant',
    audience: 'Manager / Titolare',
    features: [
      { icon: '📅', text: 'Prenotazioni e walk-in', highlight: true },
      { icon: '🪑', text: 'Gestione sale e tavoli' },
      { icon: '👥', text: 'Dipendenti illimitati' },
      { icon: '📊', text: 'Report e analytics base' },
    ],
  },
  {
    id: 'PRO',
    name: 'Intelligence',
    subtitle: 'Pro',
    monthlyPrice: 59,
    currency: '€',
    icon: '🏆',
    color: 'purple',
    description: 'Automazioni, multi-sede e insight avanzati',
    scope: 'restaurant',
    audience: 'Manager / Titolare',
    recommended: true,
    features: [
      { icon: '✨', text: 'Tutto il piano Prenotazioni', highlight: true },
      { icon: '🤖', text: 'Auto-scheduler e previsioni AI' },
      { icon: '🏢', text: 'Multi-location' },
      { icon: '🔌', text: 'Integrazioni API' },
    ],
  },
]

function rawAnnualTotal(monthlyPrice: number): number {
  return monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT)
}

export function annualTotalForPlan(plan: SubscriptionPlanDefinition): number {
  const raw = rawAnnualTotal(plan.monthlyPrice)
  if (plan.annualTotalFloorInteger) {
    return Math.floor(raw)
  }
  return Math.round(raw * 100) / 100
}

/** Prezzo mensile equivalente con fatturazione annuale (−20%) */
export function annualMonthlyEquivalentForPlan(
  plan: SubscriptionPlanDefinition
): number {
  if (plan.annualTotalFloorInteger) {
    return Math.round((annualTotalForPlan(plan) / 12) * 100) / 100
  }
  return Math.round(plan.monthlyPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100
}

export function annualSavingsForPlan(plan: SubscriptionPlanDefinition): number {
  const fullYear = plan.monthlyPrice * 12
  return Math.round((fullYear - annualTotalForPlan(plan)) * 100) / 100
}

/** @deprecated Usa annualTotalForPlan */
export function annualTotal(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT) * 100) / 100
}

/** @deprecated Usa annualMonthlyEquivalentForPlan */
export function annualMonthlyEquivalent(monthlyPrice: number): number {
  return Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100
}

export function formatPrice(amount: number): string {
  const hasCents = Math.abs(amount - Math.round(amount)) > 0.001
  return amount.toLocaleString('it-IT', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })
}

export function formatPlanAmount(amount: number): string {
  const isInteger = Number.isInteger(amount)
  return amount.toLocaleString('it-IT', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: isInteger ? 0 : 2,
  })
}

/** @deprecated Usa PAID_SUBSCRIPTION_PLANS */
export const SUBSCRIPTION_PLANS = PAID_SUBSCRIPTION_PLANS
