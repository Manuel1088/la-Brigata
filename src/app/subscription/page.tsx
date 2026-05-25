'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import type { SubscriptionStatus } from '@prisma/client'
import {
  ANNUAL_DISCOUNT,
  PAID_SUBSCRIPTION_PLANS,
  annualMonthlyEquivalent,
  annualTotal,
  formatPrice,
  type BillingInterval,
  type CheckoutPlanId,
} from '@/lib/subscription-plans'
import { canManageBilling } from '@/lib/roles'

interface ColorClasses {
  bg: string
  border: string
  button: string
  ring?: string
}

type EmployeePlanStatus = 'FREE' | 'PREMIUM' | 'EXPIRED'

function SubscriptionPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly')
  const [restaurantPlan, setRestaurantPlan] =
    useState<SubscriptionStatus>('FREE')
  const [employeePlan, setEmployeePlan] = useState<EmployeePlanStatus>('FREE')
  const [restaurantPeriodEnd, setRestaurantPeriodEnd] = useState<Date | null>(
    null
  )
  const [employeePeriodEnd, setEmployeePeriodEnd] = useState<Date | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [canManageBillingFromApi, setCanManageBillingFromApi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/subscription', {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setRestaurantPlan(data.restaurant?.status ?? 'FREE')
        setRestaurantPeriodEnd(
          data.restaurant?.periodEnd
            ? new Date(data.restaurant.periodEnd)
            : null
        )
        setRestaurantName(data.restaurant?.restaurantName ?? null)
        setEmployeePlan(data.employee?.status ?? 'FREE')
        setEmployeePeriodEnd(
          data.employee?.periodEnd ? new Date(data.employee.periodEnd) : null
        )
        setCanManageBillingFromApi(Boolean(data.canManageBilling))
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    loadSubscription()
  }, [session, status, router, loadSubscription])

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      const scope = searchParams.get('scope')
      setToast(
        scope === 'employee'
          ? '✅ Premium Dipendente attivato!'
          : '✅ Abbonamento ristorante attivato!'
      )
      loadSubscription()
    }
    if (searchParams.get('canceled') === '1') {
      setToast('Checkout annullato.')
    }
  }, [searchParams, loadSubscription])

  const handleSubscribe = async (planId: CheckoutPlanId) => {
    const loadingKey = `${planId}-${billingInterval}`
    setCheckoutLoading(loadingKey)
    setToast(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: billingInterval }),
      })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setToast(data.error ?? 'Errore durante il checkout')
        return
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      setToast('Errore di connessione durante il checkout')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const getColorClasses = (color: string, recommended?: boolean): ColorClasses => {
    const colors: Record<string, ColorClasses> = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700',
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        button: 'bg-orange-600 hover:bg-orange-700',
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-300',
        button: 'bg-purple-600 hover:bg-purple-700',
        ring: recommended ? 'ring-2 ring-purple-400 ring-offset-2' : undefined,
      },
    }
    return colors[color] ?? colors.blue
  }

  const isPlanActive = (planId: CheckoutPlanId) => {
    if (planId === 'PREMIUM') return employeePlan === 'PREMIUM'
    if (planId === 'BASIC' || planId === 'PRO') return restaurantPlan === planId
    return false
  }

  const billingAllowed =
    canManageBilling(session?.user?.role) || canManageBillingFromApi

  const canSubscribe = (planId: CheckoutPlanId) => {
    if (planId === 'PREMIUM') return true
    return billingAllowed
  }

  const formatDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null

  const formatPlanPrice = (amount: number) =>
    amount.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const annualSavings = (monthlyPrice: number) => {
    const fullYear = monthlyPrice * 12
    return Math.round((fullYear - annualTotal(monthlyPrice)) * 100) / 100
  }

  if (status === 'loading' || loading) {
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💳 Abbonamenti</h1>
            <p className="text-gray-600 mt-2">
              Scegli un piano premium — mance, turni e ferie restano sempre
              gratuiti
            </p>
            {restaurantName && (
              <p className="text-sm text-gray-500 mt-1">
                Ristorante: {restaurantName}
                {restaurantPlan !== 'FREE' &&
                  restaurantPeriodEnd &&
                  ` · rinnovo ${formatDate(restaurantPeriodEnd)}`}
                {employeePlan === 'PREMIUM' &&
                  employeePeriodEnd &&
                  ` · Premium personale fino al ${formatDate(employeePeriodEnd)}`}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {toast && (
          <div className="mb-6 rounded-lg bg-white border border-orange-200 px-4 py-3 text-gray-800 shadow-sm">
            {toast}
          </div>
        )}

        {(restaurantPlan === 'EXPIRED' || employeePlan === 'EXPIRED') && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
            Un abbonamento è scaduto. Scegli un piano a pagamento per riattivare
            le funzioni premium.
          </div>
        )}

        {/* Toggle mensile / annuale */}
        <div className="flex flex-col items-center mb-10">
          <div className="inline-flex items-center gap-3 bg-white rounded-full p-1.5 shadow-md border border-gray-200">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                billingInterval === 'monthly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensile
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('annual')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                billingInterval === 'annual'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annuale
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  billingInterval === 'annual'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                −{Math.round(ANNUAL_DISCOUNT * 100)}%
              </span>
            </button>
          </div>
          {billingInterval === 'annual' && (
            <p className="text-sm text-gray-600 mt-3 text-center">
              Risparmia il {Math.round(ANNUAL_DISCOUNT * 100)}% rispetto a 12
              mesi singoli
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PAID_SUBSCRIPTION_PLANS.map((plan) => {
            const colors = getColorClasses(plan.color, plan.recommended)
            const active = isPlanActive(plan.id)
            const showSubscribe = canSubscribe(plan.id)
            const loadingKey = `${plan.id}-${billingInterval}`
            const isLoading = checkoutLoading === loadingKey

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-xl border-2 ${colors.border} overflow-hidden flex flex-col ${colors.ring ?? ''} ${
                  plan.recommended ? 'md:scale-[1.02] md:-mt-1' : ''
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white text-center text-xs font-bold py-1.5 tracking-wide">
                    CONSIGLIATO
                  </div>
                )}

                <div
                  className={`${colors.bg} p-6 text-center ${plan.recommended ? 'pt-9' : ''}`}
                >
                  <span className="inline-block text-xs font-medium text-gray-600 bg-white/80 px-2 py-0.5 rounded-full mb-2">
                    {plan.audience}
                  </span>
                  <div className="text-5xl mb-2">{plan.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  {plan.subtitle && plan.subtitle !== plan.name && (
                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                      {plan.subtitle}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">{plan.description}</p>

                  <div className="mt-4">
                    {billingInterval === 'monthly' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.currency}
                          {formatPrice(plan.monthlyPrice)}
                        </span>
                        <span className="text-gray-600 text-sm">/mese</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.currency}
                          {formatPlanPrice(
                            annualMonthlyEquivalent(plan.monthlyPrice)
                          )}
                        </span>
                        <span className="text-gray-600 text-sm">/mese</span>
                        <p className="text-xs text-gray-500 mt-1">
                          fatturato {plan.currency}
                          {formatPlanPrice(annualTotal(plan.monthlyPrice))}/anno
                        </p>
                        <p className="text-xs text-green-700 font-medium mt-0.5">
                          Risparmi {plan.currency}
                          {formatPlanPrice(annualSavings(plan.monthlyPrice))}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-2.5 flex-1">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0">
                        {feature.icon}
                      </span>
                      <span
                        className={`text-sm text-gray-700 ${
                          feature.highlight ? 'font-semibold' : ''
                        }`}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-6 pt-0">
                  {!showSubscribe ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-lg font-semibold text-gray-500 bg-gray-100 cursor-not-allowed text-sm"
                      title="Solo Manager o Titolare"
                    >
                      Solo Manager / Titolare
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={active || checkoutLoading !== null}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                        active
                          ? 'bg-gray-400 cursor-not-allowed'
                          : isLoading
                            ? 'bg-gray-400 cursor-wait'
                            : colors.button
                      }`}
                    >
                      {isLoading
                        ? 'Reindirizzamento...'
                        : active
                          ? '✓ Piano attivo'
                          : billingInterval === 'annual'
                            ? 'Abbonati (annuale)'
                            : 'Abbonati'}
                    </button>
                  )}
                  {plan.scope === 'employee' && (
                    <p className="text-center text-xs text-gray-500 mt-2">
                      Acquistabile da tutti i dipendenti
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-12 text-center text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
          Le funzioni base (mance, turni, ferie) sono sempre gratuite per te e il
          tuo team — nessuna carta richiesta.
        </p>
      </main>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Caricamento...</div>
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  )
}
