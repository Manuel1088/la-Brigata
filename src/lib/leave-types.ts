/**
 * Fonte unica — tipi assenza (workflow ferie/permessi) e regole prodotto.
 *
 * Collegamenti (passo successivo): validations/leaves, form, overlay turni, mance, moda.
 *
 * RO (Recupero Ore) NON è un LeaveType: è solo un'etichetta turno manuale in calendario
 * ed entra nella divisione mance (statuto Mirabelle). NON confondere con RECUPERO_RIPOSO
 * (solo turno, escluso da mance e non previsto dalla moda).
 */

/** Valori enum Prisma LeaveType usati dall'app (richiedibili + legacy). */
export type LeaveTypeId =
  | 'VACATION'
  | 'ROL'
  | 'SICK_LEAVE'
  | 'SICK_LEAVE_CHILD'
  | 'PARENTAL_LEAVE'
  | 'UNION_LEAVE'
  | 'BLOOD_DONATION'
  | 'ELECTORAL_LEAVE'
  /** Deprecato in UI; può esistere in DB su richieste vecchie. */
  | 'PAID_LEAVE'

/**
 * Etichetta cella turno (Shift.time / decodeShiftTime).
 * Separata da LeaveTypeId: RO e riposi speciali esistono solo qui, non in ferie/permessi.
 */
export type ShiftAbsenceLabel =
  | 'FERIE'
  | 'ROL'
  | 'RO'
  | 'MALATTIA'
  | 'MALATTIA_BIMBO'
  | 'CONGEDO_PARENTALE'
  | 'CONGEDO_SINDACALE'
  | 'DONAZIONE_SANGUE'
  | 'PERMESSO_ELETTORALE'
  | 'PERMESSO_RETRO'
  | 'RIPOSO'
  | 'RIPOSO_ANTICIPATO'
  | 'RECUPERO_RIPOSO'

export type LeaveTypeDefinition = {
  id: LeaveTypeId
  label: string
  /** Valore scritto in calendario/Shift quando la richiesta è approvata (futuro hook). */
  shiftCell: ShiftAbsenceLabel
  /** Statuto mance Mirabelle: quota su FERIE, ROL, RO (turno); assenze da richiesta no. */
  includedInTips: boolean
  /** Se false, la moda ignora questo tipo nello storico (non propone mai l'assenza). */
  countsInModaVotes: boolean
  /** Mostrato nel form "Nuova richiesta" ferie/permessi. */
  requestable: boolean
  /** Aggiorna LeaveBalance all'approvazione. */
  tracksBalance?: boolean
  balanceUnit?: 'days' | 'hours'
}

/** Tipi richiedibili dal dipendente (nuova UI). */
export const LEAVE_TYPE_DEFINITIONS: readonly LeaveTypeDefinition[] = [
  {
    id: 'VACATION',
    label: 'Ferie',
    shiftCell: 'FERIE',
    includedInTips: true,
    countsInModaVotes: false,
    requestable: true,
    tracksBalance: true,
    balanceUnit: 'days',
  },
  {
    id: 'ROL',
    label: 'ROL',
    shiftCell: 'ROL',
    includedInTips: true,
    countsInModaVotes: false,
    requestable: true,
    tracksBalance: true,
    balanceUnit: 'hours',
  },
  {
    id: 'SICK_LEAVE',
    label: 'Malattia',
    shiftCell: 'MALATTIA',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: true,
    tracksBalance: true,
    balanceUnit: 'days',
  },
  {
    id: 'SICK_LEAVE_CHILD',
    label: 'Malattia bimbo',
    shiftCell: 'MALATTIA_BIMBO',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: true,
  },
  {
    id: 'PARENTAL_LEAVE',
    label: 'Congedo parentale',
    shiftCell: 'CONGEDO_PARENTALE',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: true,
    tracksBalance: true,
    balanceUnit: 'days',
  },
  {
    id: 'UNION_LEAVE',
    label: 'Congedo sindacale',
    shiftCell: 'CONGEDO_SINDACALE',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: true,
    tracksBalance: true,
    balanceUnit: 'days',
  },
  {
    id: 'BLOOD_DONATION',
    label: 'Donazione sangue',
    shiftCell: 'DONAZIONE_SANGUE',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: true,
  },
  {
    id: 'ELECTORAL_LEAVE',
    label: 'Permesso elettorale',
    shiftCell: 'PERMESSO_ELETTORALE',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: true,
  },
] as const

/**
 * PAID_LEAVE — deprecato dal form (sostituito da tipi specifici).
 * Resta in LEAVE_TYPE_BY_ID per label su richieste già salvate in DB.
 * shiftCell PERMESSO_RETRO: non è FERIE → non entra in mance; distinto da permesso elettorale.
 */
export const LEGACY_LEAVE_TYPE_DEFINITIONS: readonly LeaveTypeDefinition[] = [
  {
    id: 'PAID_LEAVE',
    label: 'Permesso retribuito',
    shiftCell: 'PERMESSO_RETRO',
    includedInTips: false,
    countsInModaVotes: false,
    requestable: false,
    tracksBalance: true,
    balanceUnit: 'days',
  },
] as const

const ALL_LEAVE_TYPE_DEFINITIONS: readonly LeaveTypeDefinition[] = [
  ...LEAVE_TYPE_DEFINITIONS,
  ...LEGACY_LEAVE_TYPE_DEFINITIONS,
]

export const LEAVE_TYPE_BY_ID: Readonly<Record<LeaveTypeId, LeaveTypeDefinition>> =
  Object.fromEntries(
    ALL_LEAVE_TYPE_DEFINITIONS.map((d) => [d.id, d])
  ) as Record<LeaveTypeId, LeaveTypeDefinition>

export const REQUESTABLE_LEAVE_TYPES = LEAVE_TYPE_DEFINITIONS.filter(
  (d) => d.requestable
).map((d) => d.id) as LeaveTypeId[]

/** Alias per Zod / API (solo tipi richiedibili). */
export const SUPPORTED_LEAVE_TYPES = REQUESTABLE_LEAVE_TYPES

export const LEAVE_TYPE_LABELS: Readonly<Record<string, string>> =
  Object.fromEntries(ALL_LEAVE_TYPE_DEFINITIONS.map((d) => [d.id, d.label]))

/** Celle turno che danno diritto alla quota mance (statuto: FERIE, ROL; RO è solo turno manuale). */
export const SHIFT_CELLS_INCLUDED_IN_TIPS: ReadonlySet<ShiftAbsenceLabel> = new Set(
  ALL_LEAVE_TYPE_DEFINITIONS.filter((d) => d.includedInTips).map((d) => d.shiftCell)
)

export function leaveTypeToShiftCell(id: LeaveTypeId): ShiftAbsenceLabel {
  const def = LEAVE_TYPE_BY_ID[id]
  if (!def) {
    throw new Error(`Tipo assenza sconosciuto: ${id}`)
  }
  return def.shiftCell
}

export function getLeaveTypeDefinition(id: string): LeaveTypeDefinition | undefined {
  return LEAVE_TYPE_BY_ID[id as LeaveTypeId]
}
