// Sistema di permessi granulari per La Brigata
// Fonte di verità: livello CCNL (mansione/ruolo indipendente dal livello)
import {
  CCNLLevel,
  CCNL_LEVEL_ORDER,
  isCcnlLevel,
  type CCNLLevel as CcnlLevelType,
} from '@/lib/ccnl'

export interface Permission {
  id: string
  name: string
  description: string
  category: 'personale' | 'mance' | 'turni' | 'report' | 'admin' | 'ferie' | 'payroll' | 'settings'
  level: number // Livello minimo richiesto
}

// Definizione completa dei permessi
export const PERMISSIONS: Record<string, Permission> = {
  // 👥 PERSONALE (8 permessi)
  PERSONALE_VIEW: {
    id: 'personale_view',
    name: 'Visualizza Dipendenti',
    description: 'Visualizzare la lista dei dipendenti',
    category: 'personale',
    level: 5
  },
  PERSONALE_CREATE: {
    id: 'personale_create',
    name: 'Creare Dipendenti',
    description: 'Aggiungere nuovi dipendenti al sistema',
    category: 'personale',
    level: 8
  },
  PERSONALE_EDIT: {
    id: 'personale_edit',
    name: 'Modificare Dipendenti',
    description: 'Modificare i dati dei dipendenti esistenti',
    category: 'personale',
    level: 8
  },
  PERSONALE_DELETE: {
    id: 'personale_delete',
    name: 'Eliminare Dipendenti',
    description: 'Rimuovere dipendenti dal sistema',
    category: 'personale',
    level: 9
  },
  PERSONALE_ACTIVATE: {
    id: 'personale_activate',
    name: 'Attivare/Disattivare Dipendenti',
    description: 'Cambiare lo status attivo/inattivo dei dipendenti',
    category: 'personale',
    level: 8
  },
  PERSONALE_EXPORT: {
    id: 'personale_export',
    name: 'Esportare Dati Dipendenti',
    description: 'Esportare i dati dei dipendenti in vari formati',
    category: 'personale',
    level: 7
  },
  PERSONALE_SALARY: {
    id: 'personale_salary',
    name: 'Gestire Stipendi',
    description: 'Visualizzare e modificare informazioni salariali',
    category: 'personale',
    level: 9
  },
  PERSONALE_SKILLS: {
    id: 'personale_skills',
    name: 'Gestire Competenze',
    description: 'Aggiungere e modificare le competenze dei dipendenti',
    category: 'personale',
    level: 7
  },

  // 💰 MANCE (7 permessi)
  MANCE_VIEW: {
    id: 'mance_view',
    name: 'Visualizzare Mance',
    description: 'Visualizzare le mance giornaliere e la distribuzione',
    category: 'mance',
    level: 5
  },
  MANCE_MANAGE: {
    id: 'mance_manage',
    name: 'Gestire Mance',
    description: 'Inserire e modificare le mance giornaliere',
    category: 'mance',
    level: 6
  },
  MANCE_CALCULATE: {
    id: 'mance_calculate',
    name: 'Calcolare Distribuzione',
    description: 'Calcolare la distribuzione delle mance tra i dipendenti',
    category: 'mance',
    level: 7
  },
  MANCE_APPROVE: {
    id: 'mance_approve',
    name: 'Approvare Distribuzione',
    description: 'Approvare la distribuzione finale delle mance',
    category: 'mance',
    level: 8
  },
  MANCE_HISTORY: {
    id: 'mance_history',
    name: 'Visualizzare Storico',
    description: 'Accedere allo storico completo delle mance',
    category: 'mance',
    level: 7
  },
  MANCE_SETTINGS: {
    id: 'mance_settings',
    name: 'Configurare Sistema Mance',
    description: 'Modificare le regole e i parametri del sistema mance',
    category: 'mance',
    level: 9
  },
  MANCE_EXPORT: {
    id: 'mance_export',
    name: 'Esportare Dati Mance',
    description: 'Esportare i dati delle mance per analisi esterne',
    category: 'mance',
    level: 8
  },

  // 📅 TURNI (5 permessi)
  TURNI_VIEW: {
    id: 'turni_view',
    name: 'Visualizzare Turni',
    description: 'Visualizzare i turni assegnati',
    category: 'turni',
    level: 5
  },
  TURNI_MANAGE: {
    id: 'turni_manage',
    name: 'Gestire Turni',
    description: 'Creare e modificare i turni di lavoro',
    category: 'turni',
    level: 7
  },
  TURNI_ASSIGN: {
    id: 'turni_assign',
    name: 'Assegnare Turni',
    description: 'Assegnare turni ai dipendenti',
    category: 'turni',
    level: 7
  },
  TURNI_APPROVE: {
    id: 'turni_approve',
    name: 'Approvare Turni',
    description: 'Approvare i turni e le richieste di modifica',
    category: 'turni',
    level: 8
  },
  TURNI_EXPORT: {
    id: 'turni_export',
    name: 'Esportare Turni',
    description: 'Esportare i dati dei turni',
    category: 'turni',
    level: 6
  },
  TURNI_SWAP_REQUEST: {
    id: 'turni_swap_request',
    name: 'Richiedere Cambi Turno',
    description: 'Inviare richieste di cambio turno',
    category: 'turni',
    level: 4
  },

  // 🏖️ FERIE (8 permessi)
  FERIE_VIEW: {
    id: 'ferie_view',
    name: 'Visualizzare Ferie',
    description: 'Visualizzare le proprie richieste di ferie e permessi',
    category: 'ferie',
    level: 1
  },
  FERIE_REQUEST: {
    id: 'ferie_request',
    name: 'Richiedere Ferie',
    description: 'Inviare richieste di ferie e permessi',
    category: 'ferie',
    level: 5
  },
  FERIE_APPROVE: {
    id: 'ferie_approve',
    name: 'Approvare Ferie',
    description: 'Approvare o rifiutare richieste di ferie del team',
    category: 'ferie',
    level: 7
  },
  FERIE_VIEW_ALL: {
    id: 'ferie_view_all',
    name: 'Visualizzare Tutte le Ferie',
    description: 'Visualizzare tutte le richieste di ferie dell\'azienda',
    category: 'ferie',
    level: 8
  },
  FERIE_MANAGE: {
    id: 'ferie_manage',
    name: 'Gestire Sistema Ferie',
    description: 'Configurare politiche e gestire il sistema ferie',
    category: 'ferie',
    level: 9
  },
  FERIE_EXPORT: {
    id: 'ferie_export',
    name: 'Esportare Dati Ferie',
    description: 'Esportare report e dati delle ferie',
    category: 'ferie',
    level: 7
  },
  FERIE_CALENDAR: {
    id: 'ferie_calendar',
    name: 'Visualizzare Calendario Ferie',
    description: 'Accedere al calendario delle assenze del team',
    category: 'ferie',
    level: 6
  },
  FERIE_BALANCE: {
    id: 'ferie_balance',
    name: 'Gestire Saldi Ferie',
    description: 'Visualizzare e gestire i saldi ferie dei dipendenti',
    category: 'ferie',
    level: 8
  },

  // 💰 BUSTA PAGA (3 permessi)
  PAYROLL_VIEW: {
    id: 'payroll_view',
    name: 'Visualizzare Buste Paga',
    description: 'Visualizzare le proprie buste paga e analisi',
    category: 'payroll',
    level: 1
  },
  PAYROLL_SCAN: {
    id: 'payroll_scan',
    name: 'Scansionare Buste Paga',
    description: 'Utilizzare la funzionalità di scansione AI per analisi buste paga',
    category: 'payroll',
    level: 3
  },
  PAYROLL_MANAGE: {
    id: 'payroll_manage',
    name: 'Gestire Buste Paga',
    description: 'Gestire e amministrare le buste paga del team',
    category: 'payroll',
    level: 8
  },

  // 📊 REPORT (5 permessi)
  REPORT_BASIC: {
    id: 'report_basic',
    name: 'Report Base',
    description: 'Visualizzare report di base e statistiche semplici',
    category: 'report',
    level: 6
  },
  REPORT_ADVANCED: {
    id: 'report_advanced',
    name: 'Report Avanzati',
    description: 'Accedere a report avanzati e analisi dettagliate',
    category: 'report',
    level: 8
  },
  REPORT_FINANCIAL: {
    id: 'report_financial',
    name: 'Report Finanziari',
    description: 'Visualizzare report finanziari e costi operativi',
    category: 'report',
    level: 9
  },
  REPORT_EXPORT: {
    id: 'report_export',
    name: 'Esportare Report',
    description: 'Esportare report in vari formati',
    category: 'report',
    level: 7
  },
  REPORT_SCHEDULE: {
    id: 'report_schedule',
    name: 'Programmare Report',
    description: 'Programmare l\'invio automatico di report',
    category: 'report',
    level: 9
  },

  // ⚙️ ADMIN (6 permessi)
  ADMIN_USERS: {
    id: 'admin_users',
    name: 'Gestire Utenti',
    description: 'Gestire gli account utente e le credenziali',
    category: 'admin',
    level: 10
  },
  ADMIN_ROLES: {
    id: 'admin_roles',
    name: 'Gestire Ruoli',
    description: 'Modificare i ruoli e i permessi degli utenti',
    category: 'admin',
    level: 10
  },
  ADMIN_SETTINGS: {
    id: 'admin_settings',
    name: 'Impostazioni Sistema',
    description: 'Modificare le impostazioni globali del sistema',
    category: 'admin',
    level: 10
  },
  ADMIN_AUDIT: {
    id: 'admin_audit',
    name: 'Visualizzare Audit',
    description: 'Accedere ai log di audit e tracciamento',
    category: 'admin',
    level: 9
  },
  ADMIN_BACKUP: {
    id: 'admin_backup',
    name: 'Gestire Backup',
    description: 'Creare e gestire i backup del sistema',
    category: 'admin',
    level: 10
  },
  ADMIN_MAINTENANCE: {
    id: 'admin_maintenance',
    name: 'Manutenzione Sistema',
    description: 'Eseguire operazioni di manutenzione del sistema',
    category: 'admin',
    level: 10
  },
  ADMIN_COMPANIES: {
    id: 'admin_companies',
    name: 'Gestire Aziende',
    description: 'Gestire le aziende registrate nel sistema',
    category: 'admin',
    level: 10
  },
  ADMIN_CANDIDATES: {
    id: 'admin_candidates',
    name: 'Gestire Candidati',
    description: 'Gestire le candidature e gli utenti in attesa',
    category: 'admin',
    level: 10
  },
  ADMIN_CCNL: {
    id: 'admin_ccnl',
    name: 'Gestire CCNL',
    description: 'Configurare le regole CCNL del sistema',
    category: 'admin',
    level: 10
  },
  ADMIN_ACCESS: {
    id: 'admin_access',
    name: 'Accesso amministrazione team',
    description: 'Gestire accessi e permessi del personale del ristorante',
    category: 'admin',
    level: 8
  },
  
  // 🛡️ SUPER ADMIN - Funzioni Esclusive (livello 11)
  SUPER_ADMIN_DELETE_COMPANY: {
    id: 'super_admin_delete_company',
    name: 'Eliminare Aziende',
    description: 'SOLO ADMIN: Eliminare aziende dal sistema',
    category: 'admin',
    level: 11
  },
  SUPER_ADMIN_SYSTEM_CONFIG: {
    id: 'super_admin_system_config',
    name: 'Configurazione Sistema',
    description: 'SOLO ADMIN: Modificare configurazioni critiche del sistema',
    category: 'admin',
    level: 11
  },
  SUPER_ADMIN_DATABASE_ACCESS: {
    id: 'super_admin_database_access',
    name: 'Accesso Database',
    description: 'SOLO ADMIN: Accesso diretto al database',
    category: 'admin',
    level: 11
  },
  SUPER_ADMIN_FULL_AUDIT: {
    id: 'super_admin_full_audit',
    name: 'Audit Completo Multi-Azienda',
    description: 'SOLO ADMIN: Visualizzare audit di tutte le aziende',
    category: 'admin',
    level: 11
  },
  SUPER_ADMIN_OVERRIDE_PERMISSIONS: {
    id: 'super_admin_override_permissions',
    name: 'Override Permessi',
    description: 'SOLO ADMIN: Modificare permessi di qualsiasi utente',
    category: 'admin',
    level: 11
  },
  
  // ⚙️ IMPOSTAZIONI (2 permessi)
  EDIT_PERSONAL_INFO: {
    id: 'edit_personal_info',
    name: 'Modificare Informazioni Personali',
    description: 'Modificare le proprie informazioni personali e preferenze',
    category: 'settings',
    level: 1
  },
  MANAGE_COMPANY_SETTINGS: {
    id: 'manage_company_settings',
    name: 'Gestire Impostazioni Azienda',
    description: 'Modificare le impostazioni aziendali e configurazioni',
    category: 'settings',
    level: 8
  }
}

// Permessi aggiuntivi per pagine/azioni
PERMISSIONS['bookings_view'] = {
  id: 'bookings_view',
  name: 'Visualizzare Prenotazioni',
  description: 'Accedere alla pagina prenotazioni',
  category: 'report',
  level: 5
}
PERMISSIONS['bookings_manage'] = {
  id: 'bookings_manage',
  name: 'Gestire Prenotazioni',
  description: 'Creare, modificare, confermare e cancellare prenotazioni',
  category: 'report',
  level: 7
}
PERMISSIONS['areas_manage'] = {
  id: 'areas_manage',
  name: 'Gestire Sale',
  description: 'Creare e modificare aree/sale',
  category: 'admin',
  level: 8
}
PERMISSIONS['customers_view'] = {
  id: 'customers_view',
  name: 'Visualizzare Clienti',
  description: 'Accedere alla lista clienti',
  category: 'report',
  level: 6
}
PERMISSIONS['customers_manage'] = {
  id: 'customers_manage',
  name: 'Gestire Clienti',
  description: 'Modificare dettagli e cancellare clienti',
  category: 'report',
  level: 7
}

// Configurazione permessi per ruolo
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: Object.keys(PERMISSIONS), // ADMIN: TUTTI i permessi (inclusi livello 11)
  PROPRIETARIO: Object.keys(PERMISSIONS).filter(key => {
    // PROPRIETARIO: Tutti i permessi ECCETTO quelli di livello 11 (Super Admin)
    const perm = PERMISSIONS[key as keyof typeof PERMISSIONS]
    return !perm || perm.level !== 11
  }),
  DIRETTORE: [
    'personale_view', 'personale_create', 'personale_edit', 'personale_activate', 'personale_export', 'personale_salary', 'personale_skills',
    'mance_view', 'mance_manage', 'mance_calculate', 'mance_approve', 'mance_history', 'mance_export',
    'turni_view', 'turni_manage', 'turni_assign', 'turni_approve', 'turni_export',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_view_all', 'ferie_export', 'ferie_calendar', 'ferie_balance',
    'report_basic', 'report_advanced', 'report_financial', 'report_export', 'report_schedule',
    'admin_audit', 'admin_access', 'manage_company_settings',
    'bookings_view','bookings_manage','areas_manage','customers_view','customers_manage'
  ],
  MANAGER: [
    'personale_view', 'personale_create', 'personale_edit', 'personale_activate', 'personale_export', 'personale_skills',
    'mance_view', 'mance_manage', 'mance_calculate', 'mance_approve', 'mance_history', 'mance_export',
    'turni_view', 'turni_manage', 'turni_assign', 'turni_approve', 'turni_export',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_view_all', 'ferie_export', 'ferie_calendar', 'ferie_balance',
    'payroll_view', 'payroll_scan', 'payroll_manage',
    'report_basic', 'report_advanced', 'report_export',
    'admin_access', 'manage_company_settings',
    'bookings_view','bookings_manage','areas_manage','customers_view','customers_manage'
  ],
  RESPONSABILE_SALA: [
    'personale_view', 'personale_export',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view', 'turni_manage', 'turni_assign',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_calendar',
    'report_basic', 'report_export',
    'bookings_view','bookings_manage','customers_view'
  ],
  HEAD_CHEF: [
    'personale_view', 'personale_export',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view', 'turni_manage', 'turni_assign',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_calendar',
    'report_basic', 'report_export',
    'bookings_view','customers_view'
  ],
  HEAD_BARMAN: [
    'personale_view', 'personale_export',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view', 'turni_manage', 'turni_assign',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_calendar',
    'report_basic', 'report_export',
    'bookings_view','customers_view'
  ],
  HEAD_SOMMELIER: [
    'personale_view', 'personale_export',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view', 'turni_manage', 'turni_assign',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_calendar',
    'report_basic', 'report_export',
    'bookings_view','customers_view'
  ],
  CASSIERE: [
    'personale_view',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view',
    'ferie_view', 'ferie_request',
    'report_basic',
    'bookings_view','customers_view'
  ],
  DIPENDENTE: [
    'personale_view',
    'mance_view',
    'turni_view',
    'ferie_view', 'ferie_request',
    'payroll_view', 'payroll_scan',
    'bookings_view'
  ]
}

// Alias ruoli granulari -> set permessi esistenti
ROLE_PERMISSIONS['DIRETTORE_GENERALE'] = ROLE_PERMISSIONS['DIRETTORE']
ROLE_PERMISSIONS['PROPRIETARIO_OPERATIVO'] = ROLE_PERMISSIONS['PROPRIETARIO']
ROLE_PERMISSIONS['VICE_DIRETTORE'] = ROLE_PERMISSIONS['DIRETTORE']
ROLE_PERMISSIONS['RESTAURANT_MANAGER'] = ROLE_PERMISSIONS['MANAGER']
ROLE_PERMISSIONS['EXECUTIVE_CHEF'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['SOUS_CHEF'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['ASSISTANT_MANAGER'] = ROLE_PERMISSIONS['MANAGER']
ROLE_PERMISSIONS['EXEC_SOUS_CHEF'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['CHEF_DE_CUISINE'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['CHEF_DE_PARTIE'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['CHEF'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['CAPO_PARTITA'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['PIZZAIOLO_SPECIALIZZATO'] = ROLE_PERMISSIONS['HEAD_CHEF']
ROLE_PERMISSIONS['MAITRE'] = ROLE_PERMISSIONS['RESPONSABILE_SALA']
ROLE_PERMISSIONS['SOMMELIER'] = ROLE_PERMISSIONS['HEAD_SOMMELIER']
ROLE_PERMISSIONS['BARMAN_SENIOR'] = ROLE_PERMISSIONS['HEAD_BARMAN']
ROLE_PERMISSIONS['CAMERIERE_SENIOR'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['CUOCO_QUALIFICATO'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['BARMAN'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['CAMERIERE_QUALIFICATO'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['CAMERIERE'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['COMMIS_DE_CUISINE'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['COMMIS_DE_CUISINE_SENIOR'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['DEMI_CHEF_DE_PARTIE'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['AIUTO_CUOCO'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['COMMIS_DI_SALA'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['RUNNER'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['LAVAPIATTI'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['DIPENDENTE_SALA'] = ROLE_PERMISSIONS['DIPENDENTE']
ROLE_PERMISSIONS['DIPENDENTE_BAR'] = ROLE_PERMISSIONS['DIPENDENTE']

/** Permessi riservati alla piattaforma (solo ADMIN creatore). */
const PLATFORM_ONLY_PERMISSION_IDS = new Set([
  'admin_users',
  'admin_roles',
  'admin_settings',
  'admin_backup',
  'admin_companies',
  'admin_candidates',
  'admin_ccnl',
  'super_admin_delete_company',
  'super_admin_system_config',
  'super_admin_database_access',
  'super_admin_full_audit',
  'super_admin_override_permissions',
])

const ALL_PERMISSION_IDS = Object.values(PERMISSIONS).map((p) => p.id)

/** QA / QB — massimi permessi ristorante (no gestione piattaforma). */
const RESTAURANT_FULL_PERMISSION_IDS = ALL_PERMISSION_IDS.filter(
  (id) => !PLATFORM_ONLY_PERMISSION_IDS.has(id)
)

/** Incrementi per livello operativo (L6 → L1). */
const CCNL_L6 = ['edit_personal_info', 'turni_view', 'mance_view'] as const
const CCNL_L5_ADD = ['ferie_view', 'ferie_request', 'payroll_view'] as const
const CCNL_L4_ADD = ['turni_swap_request'] as const
const CCNL_L3_ADD = ['personale_view'] as const
const CCNL_L2_ADD = [
  'ferie_approve',
  'ferie_calendar',
  'turni_manage',
  'turni_assign',
  'turni_approve',
  'mance_manage',
  'mance_calculate',
] as const
const CCNL_L1_ADD = [
  'ferie_view_all',
  'report_basic',
  'report_advanced',
  'report_export',
  'bookings_view',
  'customers_view',
] as const

function unionSets(...groups: readonly (readonly string[])[]): string[] {
  return [...new Set(groups.flat())]
}

const CCNL_PERMISSIONS_BY_LEVEL: Record<CcnlLevelType, string[]> = {
  [CCNLLevel.LIVELLO_6]: [...CCNL_L6],
  [CCNLLevel.LIVELLO_5]: unionSets(CCNL_L6, CCNL_L5_ADD),
  [CCNLLevel.LIVELLO_4]: unionSets(CCNL_L6, CCNL_L5_ADD, CCNL_L4_ADD),
  [CCNLLevel.LIVELLO_3]: unionSets(CCNL_L6, CCNL_L5_ADD, CCNL_L4_ADD, CCNL_L3_ADD),
  [CCNLLevel.LIVELLO_2]: unionSets(CCNL_L6, CCNL_L5_ADD, CCNL_L4_ADD, CCNL_L3_ADD, CCNL_L2_ADD),
  [CCNLLevel.LIVELLO_1]: unionSets(
    CCNL_L6,
    CCNL_L5_ADD,
    CCNL_L4_ADD,
    CCNL_L3_ADD,
    CCNL_L2_ADD,
    CCNL_L1_ADD
  ),
  [CCNLLevel.QB]: [...RESTAURANT_FULL_PERMISSION_IDS],
  [CCNLLevel.QA]: [...RESTAURANT_FULL_PERMISSION_IDS],
}

/** Permessi QA/QB aggiuntivi rispetto a L1 (gestione completa ristorante). */
const QA_QB_EXTRA = RESTAURANT_FULL_PERMISSION_IDS.filter(
  (id) => !CCNL_PERMISSIONS_BY_LEVEL[CCNLLevel.LIVELLO_1].includes(id)
)

// Funzioni di utilità per i permessi
function normalizeRole(role: string): string {
  return (role || '').toString().toUpperCase()
}

export function normalizeCcnlLevel(level: string | null | undefined): CcnlLevelType | null {
  if (!level) return null
  const key = String(level).toUpperCase()
  return isCcnlLevel(key) ? key : null
}

/** Indice gerarchico CCNL (0 = QA, più alto = livello più basso). */
export function ccnlRank(level: CcnlLevelType | string): number {
  const normalized = normalizeCcnlLevel(level)
  if (!normalized) return 999
  const idx = CCNL_LEVEL_ORDER.indexOf(normalized)
  return idx === -1 ? 999 : idx
}

/** true se userLevel è almeno minimumLevel (QA ≥ QB ≥ L1 ≥ … ≥ L6). */
export function ccnlMeetsMinimum(
  userLevel: CcnlLevelType | string | null | undefined,
  minimumLevel: CcnlLevelType | string
): boolean {
  const min = normalizeCcnlLevel(minimumLevel)
  const user = normalizeCcnlLevel(userLevel)
  if (!min || !user) return false
  return ccnlRank(user) <= ccnlRank(min)
}

/**
 * Permessi effettivi da livello CCNL (fonte di verità).
 * ADMIN è gestito a parte in hasPermission / canAccess.
 */
export function getCcnlPermissions(ccnlLevel: CcnlLevelType): string[] {
  return [...(CCNL_PERMISSIONS_BY_LEVEL[ccnlLevel] ?? [])]
}

/** Lista permessi effettivi: CCNL se presente, altrimenti fallback legacy per ruolo. */
export function getEffectivePermissionIds(
  userRole: string,
  ccnlLevel?: string | null
): string[] {
  if (normalizeRole(userRole) === 'ADMIN') {
    return [...ALL_PERMISSION_IDS]
  }
  const level = normalizeCcnlLevel(ccnlLevel)
  if (level) return getCcnlPermissions(level)
  return [...(ROLE_PERMISSIONS[normalizeRole(userRole)] ?? [])]
}

export function hasPermission(
  userRole: string,
  permission: string,
  ccnlLevel?: string | null
): boolean {
  if (normalizeRole(userRole) === 'ADMIN') return true
  return getEffectivePermissionIds(userRole, ccnlLevel).includes(permission)
}

export function hasAnyPermission(
  userRole: string,
  permissions: string[],
  ccnlLevel?: string | null
): boolean {
  return permissions.some((p) => hasPermission(userRole, p, ccnlLevel))
}

export function hasAllPermissions(
  userRole: string,
  permissions: string[],
  ccnlLevel?: string | null
): boolean {
  return permissions.every((p) => hasPermission(userRole, p, ccnlLevel))
}

export function getUserPermissions(
  userRole: string,
  ccnlLevel?: string | null
): Permission[] {
  const permissionIds = getEffectivePermissionIds(userRole, ccnlLevel)
  return permissionIds.map((id) => PERMISSIONS[id]).filter(Boolean)
}

export function getPermissionsByCategory(
  userRole: string,
  category: string,
  ccnlLevel?: string | null
): Permission[] {
  return getUserPermissions(userRole, ccnlLevel).filter((p) => p.category === category)
}

/** @deprecated Usare ccnlMeetsMinimum; mantenuto per compatibilità hierarchyLevel numerico. */
export function hasMinimumLevel(userLevel: number, requiredLevel: number): boolean {
  return userLevel >= requiredLevel
}

/** Verifica accesso: ADMIN totale; altrimenti permessi da CCNL. */
export function canAccess(
  userRole: string,
  _userLevel: number,
  permission: string,
  ccnlLevel?: string | null
): boolean {
  return hasPermission(userRole, permission, ccnlLevel)
}

/** Sidebar / sezioni UI */
export function canSeeTeamSection(
  ccnlLevel?: string | null,
  userRole?: string | null
): boolean {
  if (normalizeRole(userRole ?? '') === 'ADMIN') return false
  return ccnlMeetsMinimum(ccnlLevel, CCNLLevel.LIVELLO_2)
}

export function canSeeGestioneSection(
  ccnlLevel?: string | null,
  userRole?: string | null
): boolean {
  if (normalizeRole(userRole ?? '') === 'ADMIN') return false
  return ccnlMeetsMinimum(ccnlLevel, CCNLLevel.LIVELLO_1)
}

