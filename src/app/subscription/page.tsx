'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

// Piani secondo il Business Plan
const EMPLOYEE_PLAN = {
  id: 'premium_employee',
  name: 'Premium Employee',
  price: 2.99,
  currency: '€',
  billing: 'mese',
  type: 'individual',
  icon: '👤',
  features: [
    { icon: '🤖', text: 'AI Paycheck Advisor completo', highlight: true },
    { icon: '💬', text: 'Tax Coach Chatbot personale' },
    { icon: '🔔', text: 'Notifiche priority' },
    { icon: '📊', text: 'Statistiche personali avanzate' },
    { icon: '⭐', text: 'Badge "Premium" nel profilo' },
    { icon: '📈', text: 'Analytics performance dettagliate' },
    { icon: '💰', text: 'Suggerimenti risparmio fiscale' },
    { icon: '📱', text: 'Accesso mobile illimitato' }
  ],
  cta: 'Diventa Premium',
  color: 'blue'
}

const COMPANY_PLANS = [
  {
    id: 'brigata_light',
    name: 'Brigata Light',
    price: 29,
    employees: 10,
    currency: '€',
    billing: 'mese',
    icon: '🌱',
    popular: false,
    features: [
      { icon: '👥', text: 'Fino a 10 dipendenti' },
      { icon: '📅', text: 'Gestione turni base' },
      { icon: '💰', text: 'Sistema mance digitale' },
      { icon: '📊', text: 'Report mensili' },
      { icon: '✅', text: 'Compliance CCNL 2025' },
      { icon: '💬', text: 'Support email' }
    ],
    color: 'green'
  },
  {
    id: 'brigata_essentials',
    name: 'Brigata Essentials',
    price: 49,
    employees: 20,
    currency: '€',
    billing: 'mese',
    icon: '⚡',
    popular: true,
    features: [
      { icon: '👥', text: 'Fino a 20 dipendenti' },
      { icon: '🤖', text: 'AI Scheduling intelligente' },
      { icon: '💸', text: 'Mance multi-canale (carta/cash/estero)' },
      { icon: '📈', text: 'Analytics avanzate' },
      { icon: '🔔', text: 'Sistema notifiche' },
      { icon: '📋', text: 'Gestione ferie/permessi' },
      { icon: '💬', text: 'Support prioritario' },
      { icon: '🔒', text: 'Backup automatico' }
    ],
    color: 'orange'
  },
  {
    id: 'brigata_professional',
    name: 'Brigata Professional',
    price: 89,
    employees: 60,
    currency: '€',
    billing: 'mese',
    icon: '🏆',
    popular: false,
    features: [
      { icon: '👥', text: 'Fino a 60 dipendenti' },
      { icon: '🎯', text: 'Marketplace candidati' },
      { icon: '📊', text: 'Business intelligence' },
      { icon: '🤖', text: 'AI Paycheck Advisor per tutti' },
      { icon: '⚙️', text: 'Integrazioni API' },
      { icon: '🏢', text: 'Multi-ristorante' },
      { icon: '💼', text: 'Account manager dedicato' },
      { icon: '📞', text: 'Support 24/7' },
      { icon: '🔐', text: 'Sicurezza enterprise' }
    ],
    color: 'purple'
  },
  {
    id: 'brigata_master',
    name: 'Brigata Master',
    price: 169,
    employees: 999,
    currency: '€',
    billing: 'mese',
    icon: '👑',
    popular: false,
    features: [
      { icon: '♾️', text: 'Dipendenti illimitati' },
      { icon: '🏢', text: 'Multi-location illimitati' },
      { icon: '🎨', text: 'White-label options' },
      { icon: '🔧', text: 'Customizzazione completa' },
      { icon: '📊', text: 'Dashboard CEO' },
      { icon: '🤝', text: 'Partnership FIPE' },
      { icon: '👨‍💼', text: 'Success manager dedicato' },
      { icon: '🎓', text: 'Training on-site' },
      { icon: '⚡', text: 'SLA 99.9% garantito' }
    ],
    color: 'red'
  }
]

export default function SubscriptionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canManageCompany } = usePermissions()
  
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  
  // Determina automaticamente se è proprietario o dipendente
  const isCompanyOwner = canManageCompany()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
    
    // Carica piano corrente
    try {
      const saved = localStorage.getItem('current_subscription')
      if (saved) {
        const data = JSON.parse(saved)
        setCurrentPlan(data.planId)
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
    }
  }, [session, status, router])

  const handleUpgrade = (plan: any) => {
    setSelectedPlan(plan)
    setShowUpgradeModal(true)
  }

  const confirmUpgrade = async () => {
    if (!selectedPlan) return
    
    try {
      // TODO: Integrazione Stripe
      // const response = await fetch('/api/subscription/checkout', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     planId: selectedPlan.id,
      //     billingCycle
      //   })
      // })
      
      // Mock per ora
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Salva subscription
      localStorage.setItem('current_subscription', JSON.stringify({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        billingCycle,
        startDate: new Date().toISOString(),
        status: 'active'
      }))
      
      setCurrentPlan(selectedPlan.id)
      setShowUpgradeModal(false)
      
      alert(`✅ Upgrade a ${selectedPlan.name} completato con successo!`)
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('❌ Errore durante l\'upgrade. Riprova.')
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      blue: { 
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        text: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: { 
        bg: 'bg-green-50', 
        border: 'border-green-200', 
        text: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      },
      orange: { 
        bg: 'bg-orange-50', 
        border: 'border-orange-200', 
        text: 'text-orange-600',
        button: 'bg-orange-600 hover:bg-orange-700'
      },
      purple: { 
        bg: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      red: { 
        bg: 'bg-red-50', 
        border: 'border-red-200', 
        text: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700'
      }
    }
    return colors[color] || colors.blue
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
            >
              ←
            </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">💳 Abbonamenti</h1>
                <p className="text-gray-600 mt-2">
                  {isCompanyOwner 
                    ? 'Scegli il piano perfetto per la tua azienda'
                    : 'Potenzia la tua esperienza con il piano Premium'
                  }
                </p>
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Employee Plan - Solo se NON è proprietario */}
        {!isCompanyOwner && (
          <div className="max-w-md mx-auto">
            <div className={`bg-white rounded-2xl shadow-xl border-2 ${getColorClasses(EMPLOYEE_PLAN.color).border} overflow-hidden`}>
              {/* Header */}
              <div className={`${getColorClasses(EMPLOYEE_PLAN.color).bg} p-6 text-center`}>
                <div className="text-6xl mb-4">{EMPLOYEE_PLAN.icon}</div>
                <h2 className="text-2xl font-bold text-gray-900">{EMPLOYEE_PLAN.name}</h2>
                <p className="text-gray-600 mt-2">Potenzia la tua esperienza</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-gray-900">
                    {EMPLOYEE_PLAN.currency}{EMPLOYEE_PLAN.price}
                  </span>
                  <span className="text-gray-600">/{EMPLOYEE_PLAN.billing}</span>
                </div>
              </div>

              {/* Features */}
              <div className="p-6 space-y-4">
                {EMPLOYEE_PLAN.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                    <span className={`text-gray-700 ${feature.highlight ? 'font-semibold' : ''}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="p-6 pt-0">
                <button
                  onClick={() => handleUpgrade(EMPLOYEE_PLAN)}
                  disabled={currentPlan === EMPLOYEE_PLAN.id}
                  className={`w-full py-4 rounded-lg font-semibold text-white transition ${
                    currentPlan === EMPLOYEE_PLAN.id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : getColorClasses(EMPLOYEE_PLAN.color).button
                  }`}
                >
                  {currentPlan === EMPLOYEE_PLAN.id ? '✓ Piano Attivo' : EMPLOYEE_PLAN.cta}
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Cancella in qualsiasi momento
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Company Plans - Solo se è proprietario */}
        {isCompanyOwner && (
          <div>
            {/* Billing Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-lg shadow p-2 flex gap-2">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-lg font-medium transition ${
                    billingCycle === 'monthly'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Mensile
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-lg font-medium transition ${
                    billingCycle === 'yearly'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Annuale
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {COMPANY_PLANS.map((plan) => {
                const colors = getColorClasses(plan.color)
                const price = billingCycle === 'yearly' ? plan.price * 12 * 0.8 : plan.price
                
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-2xl shadow-xl border-2 ${colors.border} overflow-hidden ${
                      plan.popular ? 'ring-4 ring-orange-300 transform scale-105' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 text-sm font-semibold">
                        ⭐ PIÙ POPOLARE
                      </div>
                    )}

                    {/* Header */}
                    <div className={`${colors.bg} p-6 text-center`}>
                      <div className="text-5xl mb-3">{plan.icon}</div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {plan.employees === 999 ? 'Illimitati' : `Fino a ${plan.employees}`} dipendenti
                      </p>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.currency}{billingCycle === 'yearly' ? Math.round(price) : price}
                        </span>
                        <span className="text-gray-600">
                          /{billingCycle === 'yearly' ? 'anno' : 'mese'}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="p-6 space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-lg flex-shrink-0">{feature.icon}</span>
                          <span className="text-sm text-gray-700">{feature.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="p-6 pt-0">
                      <button
                        onClick={() => handleUpgrade(plan)}
                        disabled={currentPlan === plan.id}
                        className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                          currentPlan === plan.id
                            ? 'bg-gray-400 cursor-not-allowed'
                            : colors.button
                        }`}
                      >
                        {currentPlan === plan.id ? '✓ Piano Attivo' : 'Inizia Ora'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 bg-white rounded-2xl shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ❓ Domande Frequenti
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Posso cambiare piano in qualsiasi momento?</h3>
              <p className="text-gray-600 text-sm">
                Sì! Puoi fare upgrade o downgrade in qualsiasi momento. Il nuovo piano sarà attivo immediatamente.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Cosa succede se supero il numero di dipendenti?</h3>
              <p className="text-gray-600 text-sm">
                Riceverai una notifica automatica per fare upgrade al piano superiore. I nuovi dipendenti potranno essere aggiunti solo dopo l'upgrade.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">C'è un periodo di prova gratuito?</h3>
              <p className="text-gray-600 text-sm">
                Sì! 14 giorni di prova gratuita per tutti i piani azienda. Nessuna carta di credito richiesta.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Quali metodi di pagamento accettate?</h3>
              <p className="text-gray-600 text-sm">
                Accettiamo tutte le carte di credito/debito principali, bonifico bancario e SEPA Direct Debit.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{selectedPlan.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Conferma Upgrade
              </h2>
              <p className="text-gray-600">
                Stai per attivare il piano <strong>{selectedPlan.name}</strong>
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Piano:</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Costo:</span>
                <span className="font-semibold">
                  €{selectedPlan.price}/{billingCycle === 'yearly' ? 'anno' : 'mese'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fatturazione:</span>
                <span className="font-semibold">
                  {billingCycle === 'yearly' ? 'Annuale' : 'Mensile'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={confirmUpgrade}
                className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

