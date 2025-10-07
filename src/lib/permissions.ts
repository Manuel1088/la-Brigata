// Sistema di permessi granulari per La Brigata
// 25+ permessi organizzati per categoria

export interface Permission {
  id: string
  name: string
  description: string
  category: 'personale' | 'mance' | 'turni' | 'report' | 'admin' | 'ferie' | 'payroll'
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
  PROPRIETARIO: Object.keys(PERMISSIONS), // Tutti i permessi
  ADMIN: Object.keys(PERMISSIONS),
  DIRETTORE: [
    'personale_view', 'personale_create', 'personale_edit', 'personale_activate', 'personale_export', 'personale_salary', 'personale_skills',
    'mance_view', 'mance_manage', 'mance_calculate', 'mance_approve', 'mance_history', 'mance_export',
    'turni_view', 'turni_manage', 'turni_assign', 'turni_approve', 'turni_export',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_view_all', 'ferie_export', 'ferie_calendar', 'ferie_balance',
    'report_basic', 'report_advanced', 'report_financial', 'report_export', 'report_schedule',
    'admin_audit',
    'bookings_view','bookings_manage','areas_manage','customers_view','customers_manage'
  ],
  MANAGER: [
    'personale_view', 'personale_create', 'personale_edit', 'personale_activate', 'personale_export', 'personale_skills',
    'mance_view', 'mance_manage', 'mance_calculate', 'mance_approve', 'mance_history', 'mance_export',
    'turni_view', 'turni_manage', 'turni_assign', 'turni_approve', 'turni_export',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_view_all', 'ferie_export', 'ferie_calendar', 'ferie_balance',
    'payroll_view', 'payroll_scan', 'payroll_manage',
    'report_basic', 'report_advanced', 'report_export',
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

// Funzioni di utilità per i permessi
function normalizeRole(role: string): string {
  return (role || '').toString().toUpperCase()
}

export function hasPermission(userRole: string, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[normalizeRole(userRole)] || []
  return rolePermissions.includes(permission)
}

export function hasAnyPermission(userRole: string, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(normalizeRole(userRole), permission))
}

export function hasAllPermissions(userRole: string, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(normalizeRole(userRole), permission))
}

export function getUserPermissions(userRole: string): Permission[] {
  const permissionIds = ROLE_PERMISSIONS[normalizeRole(userRole)] || []
  return permissionIds.map(id => PERMISSIONS[id]).filter(Boolean)
}

export function getPermissionsByCategory(userRole: string, category: string): Permission[] {
  return getUserPermissions(normalizeRole(userRole)).filter(p => p.category === category)
}

// Controllo livello minimo
export function hasMinimumLevel(userLevel: number, requiredLevel: number): boolean {
  return userLevel >= requiredLevel
}

// Verifica combinata livello + permesso
export function canAccess(userRole: string, userLevel: number, permission: string): boolean {
  // Trova il permesso nel PERMISSIONS usando l'id
  const perm = Object.values(PERMISSIONS).find(p => p.id === permission)
  if (!perm) return false
  
  const role = normalizeRole(userRole)
  // Superuser: ADMIN o PROPRIETARIO hanno sempre accesso
  if (role === 'ADMIN' || role === 'PROPRIETARIO') return true
  return hasPermission(role, permission) && hasMinimumLevel(userLevel, perm.level)
}
