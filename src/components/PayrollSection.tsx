'use client'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatEuro } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

type Anomaly = {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  suggestion: string
}

type Recommendation = {
  category: 'deduction' | 'bonus' | 'optimization' | 'seniority' | 'fiscal'
  title: string
  description: string
  potentialSavings: number
}

type CcnlComparison = {
  theoreticalBase: number
  actualBase: number
  delta: number
  deltaPercent: number
  overtimeCorrect: boolean
  overtimeNote: string
  seniority: {
    yearsMatured: number
    expectedMonthlyScatto: number
    scattoApplied: boolean
    nextScattoDate: string
  }
}

type FiscalAnalysis = {
  bonus100Eligible: boolean
  bonus100Note: string
  tratIntegrativo: number
  tratIntegrativoNote: string
  figlioDetrazioni: number
  coniugeDetrazioni: number
  detrazioniMancanti: string
  stima730: {
    estimatedRefundOrDebt: number
    confidence: 'low' | 'medium' | 'high'
    note: string
  }
}

type Extraction = {
  month: string
  year: string
  grossAmount: number
  netAmount: number
  inpsTax: number
  irpefTax: number
  overtimeHours: number
  overtimePay: number
  nightPay: number
  holidayPay: number
  manceDichiarate: number
  bonuses: Array<{ type: string; amount: number }>
  deductions: Array<{ type: string; amount: number; description: string }>
}

type AiAnalysis = {
  extraction: Extraction
  ccnlComparison: CcnlComparison
  fiscalAnalysis: FiscalAnalysis
  anomalies: Anomaly[]
  recommendations: Recommendation[]
}

type PayslipRecord = {
  id: string
  month: number
  year: number
  fileName: string
  netAmount: number
  grossAmount: number
  aiAnalysis: AiAnalysis
  anomalies: Anomaly[]
  ccnlComparison: CcnlComparison
  fiscalAnalysis: FiscalAnalysis
  createdAt: string
}

type SubscriptionInfo = {
  status: 'FREE' | 'PREMIUM' | 'EXPIRED'
  periodEnd: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function semaphore(severity: 'error' | 'warning' | 'info') {
  if (severity === 'error') return '🔴'
  if (severity === 'warning') return '🟡'
  return '🟢'
}

function deltaColor(delta: number) {
  if (delta < -10) return 'text-red-600'
  if (delta < 0) return 'text-orange-500'
  return 'text-green-600'
}

function stima730Color(amount: number) {
  if (amount > 0) return 'text-green-700'
  if (amount < 0) return 'text-red-600'
  return 'text-gray-600'
}

const CATEGORY_ICON: Record<string, string> = {
  deduction: '📋',
  bonus: '💰',
  optimization: '⚡',
  seniority: '📈',
  fiscal: '🧾',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  file,
}: {
  onFile: (f: File) => void
  file: File | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition ${
        dragging ? 'border-orange-400 bg-orange-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      {file ? (
        <div>
          <p className="text-2xl mb-2">📄</p>
          <p className="font-semibold text-green-700">{file.name}</p>
          <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB · clicca per cambiare</p>
        </div>
      ) : (
        <div>
          <p className="text-4xl mb-3">📤</p>
          <p className="font-semibold text-gray-700">Trascina o clicca per caricare la busta paga</p>
          <p className="text-sm text-gray-400 mt-1">PDF, JPG o PNG · max 8 MB</p>
        </div>
      )}
    </div>
  )
}

function PremiumBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
      <div className="flex items-start gap-4">
        <span className="text-4xl">⭐</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1">Piano Premium richiesto</h3>
          <p className="text-blue-100 text-sm mb-4">
            L'analisi AI della busta paga con confronto CCNL è disponibile solo per gli abbonati Premium.
            Attiva il piano per €1,99/mese e ottieni 10 analisi mensili, confronto CCNL, ottimizzazioni fiscali e stima 730.
          </p>
          <a
            href="/subscription"
            className="inline-block bg-white text-blue-700 font-semibold px-5 py-2 rounded-lg hover:bg-blue-50 transition text-sm"
          >
            Attiva Premium →
          </a>
        </div>
      </div>
    </div>
  )
}

function AnalysisResult({ record }: { record: PayslipRecord }) {
  const ai = record.aiAnalysis
  const ext = ai?.extraction
  const ccnl = record.ccnlComparison ?? ai?.ccnlComparison
  const fiscal = record.fiscalAnalysis ?? ai?.fiscalAnalysis
  const anomalies = (record.anomalies ?? ai?.anomalies ?? []) as Anomaly[]
  const recommendations = (ai?.recommendations ?? []) as Recommendation[]

  const errors = anomalies.filter((a) => a.severity === 'error')
  const warnings = anomalies.filter((a) => a.severity === 'warning')
  const infos = anomalies.filter((a) => a.severity === 'info')

  const overallStatus =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info'

  return (
    <div className="space-y-5">
      {/* ── Summary header ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {ext?.month} {ext?.year ?? record.year}
            </h3>
            <p className="text-sm text-gray-400">{record.fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{semaphore(overallStatus)}</span>
            <span className={`text-sm font-medium ${
              overallStatus === 'error' ? 'text-red-600' : overallStatus === 'warning' ? 'text-orange-500' : 'text-green-600'
            }`}>
              {overallStatus === 'error' ? `${errors.length} errori` : overallStatus === 'warning' ? `${warnings.length} avvisi` : 'OK'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Lordo</p>
            <p className="text-lg font-bold text-gray-900">{formatEuro(record.grossAmount || ext?.grossAmount || 0)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Netto</p>
            <p className="text-lg font-bold text-green-700">{formatEuro(record.netAmount || ext?.netAmount || 0)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">INPS</p>
            <p className="text-lg font-bold text-blue-700">{formatEuro(ext?.inpsTax ?? 0)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">IRPEF</p>
            <p className="text-lg font-bold text-purple-700">{formatEuro(ext?.irpefTax ?? 0)}</p>
          </div>
        </div>

        {/* Extra voci */}
        {((ext?.overtimePay ?? 0) > 0 || (ext?.nightPay ?? 0) > 0 || (ext?.manceDichiarate ?? 0) > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(ext?.overtimePay ?? 0) > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                Straordinari {formatEuro(ext!.overtimePay)} ({ext?.overtimeHours}h)
              </span>
            )}
            {(ext?.nightPay ?? 0) > 0 && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                Notturno {formatEuro(ext!.nightPay)}
              </span>
            )}
            {(ext?.manceDichiarate ?? 0) > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                Mance dichiarate {formatEuro(ext!.manceDichiarate)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Anomalies ─────────────────────────────────────────────────── */}
      {anomalies.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <h4 className="font-semibold text-red-700">Anomalie rilevate ({anomalies.length})</h4>
          </div>
          <div className="divide-y">
            {anomalies.map((a, i) => (
              <div key={i} className="px-5 py-4 flex gap-3">
                <span className="text-xl flex-shrink-0">{semaphore(a.severity)}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.message}</p>
                  {a.suggestion && (
                    <p className="text-sm text-gray-500 mt-0.5">→ {a.suggestion}</p>
                  )}
                  <span className="inline-block mt-1 text-xs text-gray-400 font-mono">{a.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CCNL comparison ───────────────────────────────────────────── */}
      {ccnl && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <h4 className="font-semibold text-gray-800">Confronto CCNL Turismo 2026</h4>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Tabellare teorico</p>
                <p className="text-base font-bold text-gray-700">{formatEuro(ccnl.theoreticalBase)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Base effettiva</p>
                <p className="text-base font-bold text-gray-700">{formatEuro(ccnl.actualBase)}</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${ccnl.delta < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Differenza</p>
                <p className={`text-base font-bold ${deltaColor(ccnl.delta)}`}>
                  {ccnl.delta >= 0 ? '+' : ''}{formatEuro(ccnl.delta)}
                  <span className="text-xs ml-1">({ccnl.deltaPercent >= 0 ? '+' : ''}{ccnl.deltaPercent.toFixed(1)}%)</span>
                </p>
              </div>
            </div>

            {/* Straordinari */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${ccnl.overtimeCorrect ? 'bg-green-50' : 'bg-amber-50'}`}>
              <span>{ccnl.overtimeCorrect ? '🟢' : '🟡'}</span>
              <span className="text-sm">Straordinari: {ccnl.overtimeNote || (ccnl.overtimeCorrect ? 'Corretti' : 'Da verificare')}</span>
            </div>

            {/* Scatti anzianità */}
            {ccnl.seniority && (
              <div className={`p-3 rounded-lg ${ccnl.seniority.scattoApplied ? 'bg-green-50' : ccnl.seniority.expectedMonthlyScatto > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className="text-sm font-medium text-gray-800">
                  {ccnl.seniority.scattoApplied ? '🟢' : ccnl.seniority.expectedMonthlyScatto > 0 ? '🔴' : '🟢'}{' '}
                  Anzianità: {ccnl.seniority.yearsMatured} anni maturati
                </p>
                {ccnl.seniority.expectedMonthlyScatto > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Scatto atteso: {formatEuro(ccnl.seniority.expectedMonthlyScatto)}/mese
                    {!ccnl.seniority.scattoApplied && ' — non applicato in busta'}
                    {ccnl.seniority.nextScattoDate && ` · Prossimo: ${ccnl.seniority.nextScattoDate}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fiscal analysis ───────────────────────────────────────────── */}
      {fiscal && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <h4 className="font-semibold text-gray-800">Analisi fiscale e detrazioni</h4>
          </div>
          <div className="p-5 space-y-3">
            {/* Bonus 100€ */}
            <div className={`flex items-start gap-3 p-3 rounded-lg ${fiscal.bonus100Eligible ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
              <span>{fiscal.bonus100Eligible ? '🟡' : '🟢'}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Bonus 100€ (ex tredicesima)</p>
                <p className="text-xs text-gray-500 mt-0.5">{fiscal.bonus100Note}</p>
              </div>
            </div>

            {/* Trattamento integrativo */}
            <div className={`flex items-start gap-3 p-3 rounded-lg ${fiscal.tratIntegrativo > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <span>{fiscal.tratIntegrativo > 0 ? '🟢' : '🟡'}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Trattamento integrativo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fiscal.tratIntegrativo > 0 ? `${formatEuro(fiscal.tratIntegrativo)}/mese applicato · ` : ''}{fiscal.tratIntegrativoNote}
                </p>
              </div>
            </div>

            {/* Detrazioni figli/coniuge */}
            {(fiscal.figlioDetrazioni > 0 || fiscal.coniugeDetrazioni > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {fiscal.figlioDetrazioni > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Detr. figli a carico</p>
                    <p className="font-bold text-blue-700">{formatEuro(fiscal.figlioDetrazioni)}/mese</p>
                  </div>
                )}
                {fiscal.coniugeDetrazioni > 0 && (
                  <div className="p-3 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Detr. coniuge a carico</p>
                    <p className="font-bold text-pink-700">{formatEuro(fiscal.coniugeDetrazioni)}/mese</p>
                  </div>
                )}
              </div>
            )}

            {/* Detrazioni mancanti */}
            {fiscal.detrazioniMancanti && fiscal.detrazioniMancanti !== 'non determinato' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-medium text-yellow-800">⚠️ Detrazioni non applicate o da verificare:</p>
                <p className="text-xs text-yellow-700 mt-0.5">{fiscal.detrazioniMancanti}</p>
              </div>
            )}

            {/* Stima 730 */}
            {fiscal.stima730 && (
              <div className={`p-4 rounded-xl border-2 ${fiscal.stima730.estimatedRefundOrDebt >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {fiscal.stima730.estimatedRefundOrDebt >= 0 ? '🧾 Stima rimborso 730' : '🧾 Stima debito 730'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Affidabilità: {fiscal.stima730.confidence}</p>
                  </div>
                  <p className={`text-2xl font-bold ${stima730Color(fiscal.stima730.estimatedRefundOrDebt)}`}>
                    {fiscal.stima730.estimatedRefundOrDebt >= 0 ? '+' : ''}{formatEuro(fiscal.stima730.estimatedRefundOrDebt)}
                  </p>
                </div>
                {fiscal.stima730.note && (
                  <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-current/20">{fiscal.stima730.note}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recommendations ───────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <h4 className="font-semibold text-gray-800">Ottimizzazioni consigliate</h4>
          </div>
          <div className="divide-y">
            {recommendations.map((r, i) => (
              <div key={i} className="px-5 py-4 flex gap-3">
                <span className="text-xl flex-shrink-0">{CATEGORY_ICON[r.category] ?? '💡'}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                    {r.potentialSavings > 0 && (
                      <span className="text-green-600 text-sm font-bold flex-shrink-0">
                        +{formatEuro(r.potentialSavings)}/anno
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PayrollSection() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [usedThisMonth, setUsedThisMonth] = useState(0)
  const [remainingThisMonth, setRemainingThisMonth] = useState(10)
  const [selectedTab, setSelectedTab] = useState<'scan' | 'history'>('scan')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<PayslipRecord | null>(null)
  const [history, setHistory] = useState<PayslipRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  const isPremium = subscription?.status === 'PREMIUM'

  // ── Load subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/stripe/subscription', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.employee) {
          setSubscription({ status: data.employee.status, periodEnd: data.employee.periodEnd ?? null })
        } else {
          setSubscription({ status: 'FREE', periodEnd: null })
        }
      })
      .catch(() => setSubscription({ status: 'FREE', periodEnd: null }))
  }, [session?.user?.id])

  // ── Load history ───────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/payslip/history', { credentials: 'include' })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as {
        analyses: PayslipRecord[]
        usedThisMonth: number
        remainingThisMonth: number
      }
      setHistory(data.analyses)
      setUsedThisMonth(data.usedThisMonth)
      setRemainingThisMonth(data.remainingThisMonth)
    } catch {
      // silence — history is non-critical
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // ── Analyze ────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!uploadedFile) return
    setIsAnalyzing(true)
    setError(null)
    setCurrentAnalysis(null)
    try {
      const fileBase64 = await fileToBase64(uploadedFile)
      const res = await fetch('/api/payslip/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileBase64,
          fileName: uploadedFile.name,
          mimeType: uploadedFile.type || 'application/pdf',
        }),
      })
      const data = (await res.json()) as {
        error?: string
        code?: string
        upgradeUrl?: string
        analysis?: PayslipRecord
        usedThisMonth?: number
        remainingThisMonth?: number
      }
      if (!res.ok) {
        if (data.code === 'NOT_PREMIUM' || data.code === 'EXPIRED') {
          setSubscription({ status: 'FREE', periodEnd: null })
        }
        throw new Error(data.error ?? 'Errore analisi')
      }
      if (data.analysis) {
        setCurrentAnalysis(data.analysis)
        setUsedThisMonth(data.usedThisMonth ?? usedThisMonth + 1)
        setRemainingThisMonth(data.remainingThisMonth ?? Math.max(0, remainingThisMonth - 1))
        void loadHistory()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buste Paga</h1>
          <p className="text-sm text-gray-500 mt-1">Analisi AI con confronto CCNL Turismo</p>
        </div>
        {isPremium && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Analisi questo mese</p>
            <p className="text-sm font-semibold text-gray-700">
              {usedThisMonth} / 10 usate · <span className="text-green-600">{remainingThisMonth} rimaste</span>
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b flex">
          {(['scan', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                selectedTab === tab
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'scan' ? '🤖 Analisi AI' : '📋 Storico'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── SCAN TAB ─────────────────────────────────────────────── */}
          {selectedTab === 'scan' && (
            <div className="space-y-5">
              {!isPremium && subscription !== null && <PremiumBanner />}

              {isPremium && remainingThisMonth === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  ⚠️ Hai esaurito le 10 analisi mensili incluse nel piano Premium. Le analisi si ricaricano il 1° del mese.
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  🔴 {error}
                </div>
              )}

              {!currentAnalysis && (
                <div className="space-y-4">
                  <UploadZone onFile={(f) => { setUploadedFile(f); setError(null) }} file={uploadedFile} />

                  {uploadedFile && (
                    <button
                      type="button"
                      onClick={() => void handleAnalyze()}
                      disabled={isAnalyzing || !isPremium || remainingThisMonth === 0}
                      className="w-full py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Analisi in corso con Claude AI…
                        </>
                      ) : (
                        '🤖 Avvia analisi AI'
                      )}
                    </button>
                  )}
                </div>
              )}

              {currentAnalysis && (
                <div>
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={() => { setCurrentAnalysis(null); setUploadedFile(null) }}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      + Analizza un'altra busta
                    </button>
                  </div>
                  <AnalysisResult record={currentAnalysis} />
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ──────────────────────────────────────────── */}
          {selectedTab === 'history' && (
            <div className="space-y-4">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-lg font-medium text-gray-500">Nessuna analisi salvata</p>
                  <p className="text-sm mt-1">Le analisi vengono salvate automaticamente dopo ogni scansione</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">{history.length} analisi salvate</p>
                  {history.map((record) => {
                    const anomalies = (record.anomalies ?? []) as Anomaly[]
                    const errors = anomalies.filter((a) => a.severity === 'error').length
                    const warnings = anomalies.filter((a) => a.severity === 'warning').length
                    const status = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'info'

                    return (
                      <details key={record.id} className="bg-white border rounded-xl overflow-hidden group">
                        <summary className="px-5 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition list-none">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{semaphore(status)}</span>
                            <div>
                              <p className="font-medium text-gray-900">
                                {MONTH_NAMES[(record.month ?? 1) - 1]} {record.year}
                              </p>
                              <p className="text-xs text-gray-400">{record.fileName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">{formatEuro(record.netAmount)}</p>
                              <p className="text-xs text-gray-400">netto</p>
                            </div>
                            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                          </div>
                        </summary>
                        <div className="border-t px-5 py-5">
                          <AnalysisResult record={record} />
                        </div>
                      </details>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
