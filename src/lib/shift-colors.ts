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
