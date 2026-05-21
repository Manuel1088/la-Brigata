export type PlanScope = 'all' | 'employee' | 'restaurant'

export type CheckoutPlanId = 'PREMIUM' | 'BASIC' | 'PRO'

export interface SubscriptionPlanDefinition {
  id: 'FREE' | CheckoutPlanId
  name: string
  price: number | null
  currency: string
  billing: string
  icon: string
  color: string
  description: string
  scope: PlanScope
  audience: string
  features: { icon: string; text: string; highlight?: boolean }[]
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: '€',
    billing: 'sempre',
    icon: '🌱',
    color: 'green',
    description: 'Per tutti, senza costi',
    scope: 'all',
    audience: 'Ristorante',
    features: [
      { icon: '💰', text: 'Mance, turni, ferie base' },
      { icon: '👥', text: 'Max 10 dipendenti per ristorante' },
      { icon: '✅', text: 'Funzioni essenziali incluse' },
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium Dipendente',
    price: 2.99,
    currency: '€',
    billing: 'mese',
    icon: '⭐',
    color: 'blue',
    description: 'Strumenti personali avanzati',
    scope: 'employee',
    audience: 'Personale',
    features: [
      { icon: '📋', text: 'Analisi busta paga con CCNL', highlight: true },
      { icon: '🧾', text: 'Simulatore 730 per dichiarare le mance' },
      { icon: '📄', text: 'Export PDF storico mance annuale' },
      { icon: '🔔', text: 'Notifiche avanzate turni e mance' },
    ],
  },
  {
    id: 'BASIC',
    name: 'Basic Ristorante',
    price: 29,
    currency: '€',
    billing: 'mese',
    icon: '⚡',
    color: 'orange',
    description: 'Gestione team senza limiti',
    scope: 'restaurant',
    audience: 'Manager / Titolare',
    features: [
      { icon: '👥', text: 'Dipendenti illimitati', highlight: true },
      { icon: '📊', text: 'Report avanzati' },
      { icon: '📈', text: 'Analytics' },
      { icon: '💰', text: 'Tutto il piano Free ristorante' },
    ],
  },
  {
    id: 'PRO',
    name: 'Pro Ristorante',
    price: 59,
    currency: '€',
    billing: 'mese',
    icon: '🏆',
    color: 'purple',
    description: 'Multi-sede e automazioni',
    scope: 'restaurant',
    audience: 'Manager / Titolare',
    features: [
      { icon: '✨', text: 'Tutto Basic Ristorante', highlight: true },
      { icon: '🏢', text: 'Multi-location' },
      { icon: '🤖', text: 'Auto-scheduler AI' },
      { icon: '🔌', text: 'Integrazioni API' },
    ],
  },
]
