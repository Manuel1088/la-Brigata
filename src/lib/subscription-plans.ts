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
  features: { icon: string; text: string; highlight?: boolean }[]
}

export const PAID_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: 'PREMIUM',
    name: 'Premium Dipendente',
    subtitle: 'Strumenti personali',
    monthlyPrice: 2.99,
    currency: '€',
    icon: '⭐',
    color: 'blue',
    description: 'Busta paga, 730 e export per ogni membro del team',
    scope: 'employee',
    audience: 'Tutti',
    features: [
      { icon: '📋', text: 'Analisi busta paga con CCNL', highlight: true },
      { icon: '🧾', text: 'Simulatore 730 per dichiarare le mance' },
      { icon: '📄', text: 'Export PDF storico mance annuale' },
      { icon: '🔔', text: 'Notifiche avanzate turni e mance' },
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

export function annualTotal(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT) * 100) / 100
}

/** Prezzo mensile equivalente con fatturazione annuale (−20%) */
export function annualMonthlyEquivalent(monthlyPrice: number): number {
  return Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100
}

export function formatPrice(amount: number): string {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)
}

/** @deprecated Usa PAID_SUBSCRIPTION_PLANS */
export const SUBSCRIPTION_PLANS = PAID_SUBSCRIPTION_PLANS
