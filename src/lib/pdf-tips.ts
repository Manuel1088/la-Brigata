/**
 * PDF generation utilities for tips exports.
 * Uses jsPDF (browser-only). Always import dynamically to avoid SSR issues.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type EmployeeExportData = {
  employee: { name: string }
  restaurantName: string
  period: { from: string; to: string; label: string }
  typeFilter: 'cash' | 'card' | 'foreign' | 'all'
  rows: Array<{
    date: string
    locationName: string
    amount: number
    cashShare: number
    cardShare: number
    foreignShare: number
  }>
  total: number
  byType: { cash: number; card: number; foreign: number }
}

export type OfficeExportData = {
  restaurantName: string
  monthLabel: string
  month: number
  year: number
  rows: Array<{ employeeName: string; total: number }>
  grandTotal: number
}

// ── Formatters ─────────────────────────────────────────────────────────────

function euro(n: number): string {
  return '€' + n.toFixed(2).replace('.', ',')
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function typeLabel(t: 'cash' | 'card' | 'foreign' | 'all'): string {
  if (t === 'cash') return 'Contanti'
  if (t === 'card') return 'Carta'
  if (t === 'foreign') return 'Valute estere'
  return 'Tutti'
}

// ── Employee PDF ───────────────────────────────────────────────────────────

export async function downloadEmployeePdf(data: EmployeeExportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 20
  const contentW = W - margin * 2

  let y = 20

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(data.restaurantName, W / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Riepilogo Mance Personali', W / 2, y, { align: 'center' })
  y += 10

  // separator line
  doc.setDrawColor(180)
  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Employee info ─────────────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Dipendente:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.employee.name, margin + 28, y)
  y += 5.5

  doc.setFont('helvetica', 'bold')
  doc.text('Periodo:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.period.label, margin + 28, y)
  y += 5.5

  doc.setFont('helvetica', 'bold')
  doc.text('Tipo:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(typeLabel(data.typeFilter), margin + 28, y)
  y += 5.5

  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Table header ──────────────────────────────────────────────────────────
  const col = { date: margin, loc: margin + 30, amount: W - margin }
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 4, contentW, 7, 'F')
  doc.text('Data', col.date, y)
  doc.text('Sala', col.loc, y)
  doc.text('Importo', col.amount, y, { align: 'right' })
  y += 7

  // ── Rows ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  let rowIndex = 0
  for (const row of data.rows) {
    if (y > 265) {
      doc.addPage()
      y = 20
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, y - 4, contentW, 6.5, 'F')
    }

    doc.setTextColor(60, 60, 60)
    doc.text(fmtDate(row.date), col.date, y)
    doc.text(row.locationName.slice(0, 22), col.loc, y)
    doc.setFont('helvetica', 'bold')
    doc.text(euro(row.amount), col.amount, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 6.5
    rowIndex++
  }

  if (data.rows.length === 0) {
    doc.setTextColor(150)
    doc.text('Nessuna distribuzione nel periodo selezionato.', margin, y)
    y += 8
  }

  // ── Total line ────────────────────────────────────────────────────────────
  doc.setDrawColor(100)
  doc.line(margin, y, W - margin, y)
  y += 6
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text('TOTALE', col.date, y)
  doc.text(euro(data.total), col.amount, y, { align: 'right' })
  y += 8

  // ── By-type breakdown ─────────────────────────────────────────────────────
  if (data.total > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    const breakdown: string[] = []
    if (data.byType.cash > 0) breakdown.push(`Contanti: ${euro(data.byType.cash)}`)
    if (data.byType.card > 0) breakdown.push(`Carta: ${euro(data.byType.card)}`)
    if (data.byType.foreign > 0) breakdown.push(`Estere: ${euro(data.byType.foreign)}`)
    if (breakdown.length > 0) {
      doc.text(breakdown.join('   |   '), margin, y)
      y += 6
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150)
  const today = new Date().toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  doc.text(`Generato il ${today}`, W / 2, 287, { align: 'center' })

  const safeName = data.employee.name.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`mance_${safeName}_${data.period.from}_${data.period.to}.pdf`)
}

// ── Office PDF ─────────────────────────────────────────────────────────────

export async function downloadOfficePdf(data: OfficeExportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 20
  const contentW = W - margin * 2

  let y = 20

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(data.restaurantName, W / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Riepilogo Mance — ${data.monthLabel.charAt(0).toUpperCase() + data.monthLabel.slice(1)}`, W / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Documento riservato — Ufficio Personale', W / 2, y, { align: 'center' })
  y += 8
  doc.setTextColor(0)

  doc.setDrawColor(150)
  doc.line(margin, y, W - margin, y)
  y += 7

  // ── Table header ──────────────────────────────────────────────────────────
  const col = { name: margin, total: W - margin }
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, y - 4.5, contentW, 7, 'F')
  doc.text('Dipendente', col.name, y)
  doc.text('Totale', col.total, y, { align: 'right' })
  y += 7

  // ── Rows ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i]
    if (y > 265) {
      doc.addPage()
      y = 20
    }

    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, y - 4.5, contentW, 7, 'F')
    }

    doc.setTextColor(40)
    doc.text(row.employeeName, col.name, y)
    doc.setFont('helvetica', 'bold')
    doc.text(euro(row.total), col.total, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 7
  }

  if (data.rows.length === 0) {
    doc.setTextColor(150)
    doc.setFontSize(9)
    doc.text('Nessuna distribuzione registrata per questo mese.', margin, y)
    y += 8
  }

  // ── Grand total ───────────────────────────────────────────────────────────
  doc.setDrawColor(80)
  doc.setLineWidth(0.5)
  doc.line(margin, y, W - margin, y)
  doc.setLineWidth(0.2)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text('TOTALE COMPLESSIVO', col.name, y)
  doc.setFontSize(13)
  doc.text(euro(data.grandTotal), col.total, y, { align: 'right' })
  y += 5

  doc.setDrawColor(80)
  doc.setLineWidth(0.5)
  doc.line(margin, y, W - margin, y)
  doc.setLineWidth(0.2)

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150)
  const today = new Date().toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  doc.text(`Generato il ${today} · ${data.rows.length} dipendenti`, W / 2, 287, { align: 'center' })

  const monthPad = String(data.month + 1).padStart(2, '0')
  doc.save(`riepilogo_mance_${data.year}_${monthPad}.pdf`)
}
