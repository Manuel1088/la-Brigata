'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import type { SubscriptionStatus } from '@prisma/client'
import {
  SUBSCRIPTION_PLANS,
  type CheckoutPlanId,
} from '@/lib/subscription-plans'

interface ColorClasses {
  bg: string
  border: string
  button: string
}

type EmployeePlanStatus = 'FREE' | 'PREMIUM' | 'EXPIRED'

function SubscriptionPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [restaurantPlan, setRestaurantPlan] =
    useState<SubscriptionStatus>('FREE')
  const [employeePlan, setEmployeePlan] = useState<EmployeePlanStatus>('FREE')
  const [restaurantPeriodEnd, setRestaurantPeriodEnd] = useState<Date | null>(
    null
  )
  const [employeePeriodEnd, setEmployeePeriodEnd] = useState<Date | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [canManageBilling, setCanManageBilling] = useState(false)
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
        setCanManageBilling(Boolean(data.canManageBilling))
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
    setCheckoutLoading(planId)
    setToast(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
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

  const getColorClasses = (color: string): ColorClasses => {
    const colors: Record<string, ColorClasses> = {
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        button: 'bg-green-600 hover:bg-green-700',
      },
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
        border: 'border-purple-200',
        button: 'bg-purple-600 hover:bg-purple-700',
      },
    }
    return colors[color] ?? colors.green
  }

  const isPlanActive = (planId: (typeof SUBSCRIPTION_PLANS)[number]['id']) => {
    if (planId === 'FREE') {
      return restaurantPlan === 'FREE' || restaurantPlan === 'EXPIRED'
    }
    if (planId === 'PREMIUM') {
      return employeePlan === 'PREMIUM'
    }
    if (planId === 'BASIC' || planId === 'PRO') {
      return restaurantPlan === planId
    }
    return false
  }

  const canSubscribe = (planId: (typeof SUBSCRIPTION_PLANS)[number]['id']) => {
    if (planId === 'FREE') return false
    if (planId === 'PREMIUM') return true
    return canManageBilling
  }

  const formatDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null

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
                Free per tutti · Premium personale · Piani ristorante per il
                team
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {toast && (
          <div className="mb-6 rounded-lg bg-white border border-orange-200 px-4 py-3 text-gray-800 shadow-sm">
            {toast}
          </div>
        )}

        {(restaurantPlan === 'EXPIRED' || employeePlan === 'EXPIRED') && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
            Un abbonamento è scaduto. Scegli un piano a pagamento per
            riattivare le funzioni premium.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const colors = getColorClasses(plan.color)
            const active = isPlanActive(plan.id)
            const showSubscribe = canSubscribe(plan.id)
            const isFree = plan.id === 'FREE'

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-xl border-2 ${colors.border} overflow-hidden flex flex-col ${
                  plan.id === 'PRO' ? 'ring-2 ring-purple-200' : ''
                }`}
              >
                <div className={`${colors.bg} p-5 text-center`}>
                  <span className="inline-block text-xs font-medium text-gray-600 bg-white/80 px-2 py-0.5 rounded-full mb-2">
                    {plan.audience}
                  </span>
                  <div className="text-5xl mb-2">{plan.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                  <div className="mt-3">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-gray-900">
                        Gratis
                      </span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">
                          {plan.currency}
                          {plan.price}
                        </span>
                        <span className="text-gray-600 text-sm">
                          /{plan.billing}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-2 flex-1">
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

                <div className="p-5 pt-0">
                  {isFree ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-lg font-semibold text-white bg-gray-400 cursor-not-allowed"
                    >
                      {active ? '✓ Piano base attivo' : 'Sempre incluso'}
                    </button>
                  ) : !showSubscribe ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-lg font-semibold text-gray-500 bg-gray-100 cursor-not-allowed text-sm"
                      title="Solo Manager, Titolare o Admin"
                    >
                      Solo Manager / Titolare
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id as CheckoutPlanId)}
                      disabled={active || checkoutLoading !== null}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                        active
                          ? 'bg-gray-400 cursor-not-allowed'
                          : checkoutLoading === plan.id
                            ? 'bg-gray-400 cursor-wait'
                            : colors.button
                      }`}
                    >
                      {checkoutLoading === plan.id
                        ? 'Reindirizzamento...'
                        : active
                          ? '✓ Piano attivo'
                          : 'Abbonati'}
                    </button>
                  )}
                  {plan.scope === 'employee' && (
                    <p className="text-center text-xs text-gray-500 mt-2">
                      Acquistabile da tutti
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
            Come funziona
          </h2>
          <ul className="text-sm text-gray-600 space-y-2 max-w-2xl mx-auto">
            <li>
              • <strong>Free</strong>: ogni ristorante parte gratis (max 10
              dipendenti).
            </li>
            <li>
              • <strong>Premium Dipendente</strong>: ogni persona può
              abbonarsi per strumenti personali (busta paga, 730, export PDF).
            </li>
            <li>
              • <strong>Basic / Pro Ristorante</strong>: solo chi gestisce il
              locale può acquistare per tutto il team.
            </li>
            <li>• Pagamento sicuro tramite Stripe Checkout.</li>
          </ul>
        </div>
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
