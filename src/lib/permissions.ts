// Sistema di permessi granulari per La Brigata
// 25+ permessi organizzati per categoria

export interface Permission {
  id: string
  name: string
  description: string
  category: 'personale' | 'mance' | 'turni' | 'report' | 'admin' | 'ferie'
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
    level: 5
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
  }
}

// Configurazione permessi per ruolo
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  PROPRIETARIO: Object.keys(PERMISSIONS), // Tutti i permessi
  DIRETTORE: [
    'personale_view', 'personale_create', 'personale_edit', 'personale_activate', 'personale_export', 'personale_salary', 'personale_skills',
    'mance_view', 'mance_manage', 'mance_calculate', 'mance_approve', 'mance_history', 'mance_export',
    'turni_view', 'turni_manage', 'turni_assign', 'turni_approve', 'turni_export',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_view_all', 'ferie_export', 'ferie_calendar', 'ferie_balance',
    'report_basic', 'report_advanced', 'report_financial', 'report_export', 'report_schedule',
    'admin_audit'
  ],
  MANAGER: [
    'personale_view', 'personale_create', 'personale_edit', 'personale_activate', 'personale_export', 'personale_skills',
    'mance_view', 'mance_manage', 'mance_calculate', 'mance_approve', 'mance_history', 'mance_export',
    'turni_view', 'turni_manage', 'turni_assign', 'turni_approve', 'turni_export',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_view_all', 'ferie_export', 'ferie_calendar', 'ferie_balance',
    'report_basic', 'report_advanced', 'report_export'
  ],
  RESPONSABILE_SALA: [
    'personale_view', 'personale_export',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view', 'turni_manage', 'turni_assign',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_calendar',
    'report_basic', 'report_export'
  ],
  HEAD_CHEF: [
    'personale_view', 'personale_export',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view', 'turni_manage', 'turni_assign',
    'ferie_view', 'ferie_request', 'ferie_approve', 'ferie_calendar',
    'report_basic', 'report_export'
  ],
  CASSIERE: [
    'personale_view',
    'mance_view', 'mance_manage', 'mance_calculate',
    'turni_view',
    'ferie_view', 'ferie_request',
    'report_basic'
  ],
  DIPENDENTE: [
    'personale_view',
    'mance_view',
    'turni_view',
    'ferie_view', 'ferie_request'
  ]
}

// Funzioni di utilità per i permessi
export function hasPermission(userRole: string, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

export function hasAnyPermission(userRole: string, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: string, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

export function getUserPermissions(userRole: string): Permission[] {
  const permissionIds = ROLE_PERMISSIONS[userRole] || []
  return permissionIds.map(id => PERMISSIONS[id]).filter(Boolean)
}

export function getPermissionsByCategory(userRole: string, category: string): Permission[] {
  return getUserPermissions(userRole).filter(p => p.category === category)
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
  
  return hasPermission(userRole, permission) && hasMinimumLevel(userLevel, perm.level)
}
