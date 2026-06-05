import { isWorkShiftTime, type ShiftGridCell } from '@/lib/shifts'

/** Turni di lavoro senza template (personalizzati, legacy pre-migrazione). */
export const DEFAULT_WORK_COLOR = '#64748B'

export type ShiftTemplateColorSource = {
  id: string
  startTime: string
  endTime: string
  color: string
  isActive?: boolean
}

/** Etichetta orario template: "HH:mm-HH:mm" (allineato a Calendar tplTime). */
export function templateTimeLabel(template: Pick<ShiftTemplateColorSource, 'startTime' | 'endTime'>): string {
  return `${template.startTime}-${template.endTime}`
}

/**
 * Cerca un template il cui intervallo coincide con `time` (match esatto sulla stringa).
 * Non gestisce turni spezzati con "/" — solo il formato singolo "12:00-15:00".
 */
export function matchTemplateByTime(
  time: string,
  templates: readonly ShiftTemplateColorSource[]
): ShiftTemplateColorSource | null {
  const normalized = time.trim()
  for (const tpl of templates) {
    if (tpl.isActive === false) continue
    if (templateTimeLabel(tpl) === normalized) return tpl
  }
  return null
}

/**
 * Colore hex per celle di lavoro nella griglia.
 *
 * Gerarchia:
 * 1. cell.displayColor — snapshot salvato sul turno (sopravvive a DELETE template)
 * 2. templatesMap[cell.shiftTemplateId].color — lookup live se c'è ancora il template
 * 3. DEFAULT_WORK_COLOR — personalizzati / legacy senza template
 *
 * Assenze (RIPOSO, FERIE, MALATTIA, …): null → shiftCellAppearance usa il suo switch.
 */
export function resolveShiftDisplayColor(
  cell: Pick<ShiftGridCell, 'time' | 'shiftTemplateId' | 'displayColor'>,
  templatesMap?: ReadonlyMap<string, Pick<ShiftTemplateColorSource, 'color'>>
): string | null {
  const time = cell.time
  if (!time || !isWorkShiftTime(time)) return null

  if (cell.displayColor) return cell.displayColor

  const templateId = cell.shiftTemplateId
  if (templateId && templatesMap) {
    const tpl = templatesMap.get(templateId)
    if (tpl?.color) return tpl.color
  }

  return DEFAULT_WORK_COLOR
}

/**
 * Campi colore per una cella completata dalla moda (solo turni di lavoro).
 * Assenze: oggetto vuoto — nessun shiftTemplateId/displayColor.
 */
export function resolveModaCompletedShiftColorFields(
  time: string,
  historicalCell: Pick<ShiftGridCell, 'shiftTemplateId' | 'displayColor'> | undefined,
  templates: readonly ShiftTemplateColorSource[]
): Pick<ShiftGridCell, 'shiftTemplateId' | 'displayColor'> | Record<string, never> {
  if (!isWorkShiftTime(time)) return {}

  if (historicalCell?.displayColor || historicalCell?.shiftTemplateId) {
    return {
      shiftTemplateId: historicalCell.shiftTemplateId ?? null,
      displayColor: historicalCell.displayColor ?? null,
    }
  }

  const matched = matchTemplateByTime(time, templates)
  if (matched) {
    return {
      shiftTemplateId: matched.id,
      displayColor: matched.color,
    }
  }

  return {
    shiftTemplateId: null,
    displayColor: DEFAULT_WORK_COLOR,
  }
}

/** Converte #RRGGBB in componenti RGB (0–255). */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([0-9A-Fa-f]{6})$/)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Sfondo colore a bassa opacità + testo a hex pieno (leggibile su template chiari/scuri). */
export function shiftCellWorkInlineStyle(hex: string): {
  backgroundColor: string
  color: string
} {
  const rgb = parseHexColor(hex)
  if (!rgb) {
    const fallback = parseHexColor(DEFAULT_WORK_COLOR)!
    return {
      backgroundColor: `rgba(${fallback.r}, ${fallback.g}, ${fallback.b}, 0.18)`,
      color: DEFAULT_WORK_COLOR,
    }
  }
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
    color: hex.startsWith('#') ? hex : `#${hex}`,
  }
}
