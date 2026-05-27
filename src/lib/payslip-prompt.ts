/**
 * System prompt builder per l'analisi buste paga con Claude.
 * Incorpora tutti i dati CCNL e contrattuali del dipendente.
 */
import { CCNL_LEVELS, isCcnlLevel } from '@/lib/ccnl'

export type EmployeeContext = {
  name: string
  ccnlLevel: string | null
  baseSalary: number | null
  weeklyHours: number | null
  contractType: string | null
  contractTypeEnum: string | null
  startDate: Date | null
  maritalStatus: string | null
  childrenCount: number | null
  position: string | null
}

/** JSON schema che Claude DEVE restituire. */
export const PAYSLIP_JSON_SCHEMA = `{
  "extraction": {
    "month": "string (nome mese in italiano, es. Marzo)",
    "year": "string (anno, es. 2026)",
    "grossAmount": "number (lordo mensile in €)",
    "netAmount": "number (netto mensile in €)",
    "inpsTax": "number (contributi INPS trattenuti €)",
    "irpefTax": "number (IRPEF trattenuta €)",
    "overtimeHours": "number",
    "overtimePay": "number (compenso straordinari €)",
    "nightPay": "number (indennità notturna €)",
    "holidayPay": "number (indennità festiva €)",
    "manceDichiarate": "number (mance dichiarate in busta €, 0 se assenti)",
    "bonuses": [{"type": "string", "amount": "number"}],
    "deductions": [{"type": "string", "amount": "number", "description": "string"}]
  },
  "ccnlComparison": {
    "theoreticalBase": "number (base CCNL teorica per il livello €)",
    "actualBase": "number (base effettiva in busta €)",
    "delta": "number (differenza: effettivo - teorico, negativo = sottopagato)",
    "deltaPercent": "number (% scostamento)",
    "overtimeCorrect": "boolean",
    "overtimeNote": "string (breve spiegazione)",
    "seniority": {
      "yearsMatured": "number (anni di anzianità maturati)",
      "expectedMonthlyScatto": "number (importo scatto anzianità mensile atteso €)",
      "scattoApplied": "boolean (lo scatto è visibile in busta?)",
      "nextScattoDate": "string (data prossimo scatto, es. 2027-01)"
    }
  },
  "fiscalAnalysis": {
    "bonus100Eligible": "boolean (dipendente potrebbe avere bonus 100€?)",
    "bonus100Note": "string",
    "tratIntegrativo": "number (trattamento integrativo ex bonus Renzi presente in busta €, 0 se assente)",
    "tratIntegrativoNote": "string",
    "figlioDetrazioni": "number (detrazioni figli a carico mensili attese €)",
    "coniugeDetrazioni": "number (detrazioni coniuge a carico mensili attese €)",
    "detrazioniMancanti": "string (eventuali detrazioni non applicate)",
    "stima730": {
      "estimatedRefundOrDebt": "number (+ rimborso / - debito stimato per dichiarazione annuale €)",
      "confidence": "low|medium|high",
      "note": "string (breve spiegazione calcolo)"
    }
  },
  "anomalies": [
    {
      "severity": "error|warning|info",
      "code": "string (codice breve, es. BASE_BASSA, IRPEF_ALTA)",
      "message": "string (descrizione anomalia chiara in italiano)",
      "suggestion": "string (cosa fare)"
    }
  ],
  "recommendations": [
    {
      "category": "deduction|bonus|optimization|seniority|fiscal",
      "title": "string",
      "description": "string",
      "potentialSavings": "number (risparmio/recupero stimato € annuale, 0 se non quantificabile)"
    }
  ]
}`

function yearsMonths(startDate: Date | null): string {
  if (!startDate) return 'non disponibile'
  const now = new Date()
  const years = now.getFullYear() - startDate.getFullYear()
  const months = now.getMonth() - startDate.getMonth()
  const totalMonths = years * 12 + months
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  return `${y} anni e ${m} mesi`
}

export function buildSystemPrompt(emp: EmployeeContext): string {
  const ccnlInfo = isCcnlLevel(emp.ccnlLevel) ? CCNL_LEVELS[emp.ccnlLevel] : null

  const ccnlSection = ccnlInfo
    ? `
DATI CCNL TURISMO — PUBBLICI ESERCIZI (anno 2026):
- Livello contrattuale: ${ccnlInfo.code} — ${ccnlInfo.title}
- Categoria: ${ccnlInfo.category}
- Retribuzione tabellare mensile lorda 2026: €${ccnlInfo.monthlyBase2026.toFixed(2)}
- Orario contrattuale settimanale: ${ccnlInfo.weeklyHours}h
- Paga oraria teorica: €${(ccnlInfo.monthlyBase2026 / ((ccnlInfo.weeklyHours * 52) / 12)).toFixed(4)}
- Maggiorazione straordinario: ${Math.round((ccnlInfo.overtimeRate - 1) * 100)}% in più
- Maggiorazione notturno: ${Math.round((ccnlInfo.nightRate - 1) * 100)}% in più
- Maggiorazione festivo: ${Math.round((ccnlInfo.holidayRate - 1) * 100)}% in più
- Scatti di anzianità CCNL Turismo: ogni 2 anni di servizio, il dipendente matura uno scatto pari al 6% della retribuzione tabellare del proprio livello
  → Scatto biennale atteso per questo livello: €${(ccnlInfo.monthlyBase2026 * 0.06).toFixed(2)}/mese`
    : `Livello CCNL del dipendente: non specificato nel profilo.`

  const personalSection = `
PROFILO DIPENDENTE (dal database aziendale):
- Nome: ${emp.name}
- Livello CCNL: ${emp.ccnlLevel ?? 'non specificato'}
- Mansione: ${emp.position ?? 'non specificata'}
- Tipo contratto: ${emp.contractTypeEnum ?? emp.contractType ?? 'non specificato'}
- Ore settimanali contratto: ${emp.weeklyHours ?? 40}h
- Data inizio rapporto: ${emp.startDate ? emp.startDate.toISOString().split('T')[0] : 'non disponibile'}
- Anzianità maturata: ${yearsMonths(emp.startDate)}
- Paga base nel profilo: ${emp.baseSalary ? `€${Number(emp.baseSalary).toFixed(2)}` : 'non specificata'}
- Stato civile: ${emp.maritalStatus ?? 'non specificato'}
- Figli a carico: ${emp.childrenCount ?? 0}`

  return `Sei un esperto consulente del lavoro italiano specializzato nel CCNL Turismo — Pubblici Esercizi.
Il tuo compito è analizzare la busta paga allegata in modo preciso e professionale.
${personalSection}
${ccnlSection}

ISTRUZIONI ANALISI:
1. ESTRAZIONE: Leggi con precisione tutti i valori numerici dalla busta paga (lordo, netto, INPS, IRPEF, voci straordinarie, mance, bonus, detrazioni).
2. CONFRONTO CCNL: Verifica che la base retributiva corrisponda alla tabella CCNL 2026 per il livello indicato. Considera eventuali scatti di anzianità già maturati. Segnala discrepanze.
3. FISCALE: Verifica se sono applicate correttamente le detrazioni per lavoro dipendente, per figli a carico, per coniuge a carico. Valuta l'idoneità al bonus 100€ (reddito ≤ €28.000 annui) e al trattamento integrativo (reddito ≤ €15.000). Stima l'impatto sul 730 annuale.
4. ANOMALIE: Identifica errori (busta non corretta), avvisi (da verificare) e note informative. Usa il campo "severity": "error" per errori certi, "warning" per sospetti, "info" per informazioni utili.
5. RACCOMANDAZIONI: Suggerisci azioni concrete (es. chiedere conguaglio, richiedere detrazione, applicare scatto anzianità).

FORMATO RISPOSTA: Rispondi ESCLUSIVAMENTE con un oggetto JSON valido che segue ESATTAMENTE questo schema (nessun testo prima o dopo il JSON):

${PAYSLIP_JSON_SCHEMA}

Se un valore numerico non è applicabile o non trovato in busta, usa 0.
Se una stringa non è determinabile, usa "non determinato".
`
}
