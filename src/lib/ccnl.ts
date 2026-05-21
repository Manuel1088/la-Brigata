/** Livelli CCNL Turismo — Pubblici Esercizi (allineati a schema Prisma). */
export type CCNLLevel =
  | 'QA'
  | 'QB'
  | 'LIVELLO_1'
  | 'LIVELLO_2'
  | 'LIVELLO_3'
  | 'LIVELLO_4'
  | 'LIVELLO_5'
  | 'LIVELLO_6'

export const CCNLLevel = {
  QA: 'QA',
  QB: 'QB',
  LIVELLO_1: 'LIVELLO_1',
  LIVELLO_2: 'LIVELLO_2',
  LIVELLO_3: 'LIVELLO_3',
  LIVELLO_4: 'LIVELLO_4',
  LIVELLO_5: 'LIVELLO_5',
  LIVELLO_6: 'LIVELLO_6',
} as const

export type CCCategory = 'QUADRI' | 'IMPIEGATI' | 'OPERAI'

export interface CCNLLevelInfo {
  level: CCNLLevel
  category: CCCategory
  code: string
  title: string
  description: string
  typicalRoles: string[]
  /** Retribuzione tabellare mensile lorda 2026 (€) */
  monthlyBase2026: number
  /** Gerarchia numerica (più alto = più senior) */
  hierarchy: number
  weeklyHours: number
  overtimeRate: number
  nightRate: number
  holidayRate: number
}

/** Ordine dal livello più alto al più basso. */
export const CCNL_LEVEL_ORDER: CCNLLevel[] = [
  CCNLLevel.QA,
  CCNLLevel.QB,
  CCNLLevel.LIVELLO_1,
  CCNLLevel.LIVELLO_2,
  CCNLLevel.LIVELLO_3,
  CCNLLevel.LIVELLO_4,
  CCNLLevel.LIVELLO_5,
  CCNLLevel.LIVELLO_6,
]

export const CCNL_LEVELS: Record<CCNLLevel, CCNLLevelInfo> = {
  [CCNLLevel.QA]: {
    level: CCNLLevel.QA,
    category: 'QUADRI',
    code: 'QA',
    title: 'Quadro Superiore',
    description: 'Direzione generale, P&L, strategia e governance',
    typicalRoles: [
      'Direttore generale',
      'Direttore operativo',
      'General manager',
    ],
    monthlyBase2026: 2874.0,
    hierarchy: 8,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.QB]: {
    level: CCNLLevel.QB,
    category: 'QUADRI',
    code: 'QB',
    title: 'Quadro',
    description: 'Coordinamento reparti, responsabilità operative e commerciali',
    typicalRoles: [
      'Responsabile area',
      'Responsabile reparto',
      'Capo sala senior',
    ],
    monthlyBase2026: 2528.0,
    hierarchy: 7,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_1]: {
    level: CCNLLevel.LIVELLO_1,
    category: 'IMPIEGATI',
    code: '1',
    title: 'Primo livello impiegati',
    description: 'Maître, responsabile sala, coordinamento servizio qualificato',
    typicalRoles: ['Maître', 'Responsabile sala', 'Sommelier senior'],
    monthlyBase2026: 2189.0,
    hierarchy: 6,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_2]: {
    level: CCNLLevel.LIVELLO_2,
    category: 'IMPIEGATI',
    code: '2',
    title: 'Secondo livello impiegati',
    description: 'Cameriere specializzato, barman qualificato, chef de rang',
    typicalRoles: [
      'Cameriere specializzato',
      'Barman qualificato',
      'Chef de rang senior',
    ],
    monthlyBase2026: 2012.0,
    hierarchy: 5,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_3]: {
    level: CCNLLevel.LIVELLO_3,
    category: 'IMPIEGATI',
    code: '3',
    title: 'Terzo livello impiegati',
    description: 'Cameriere, barista, addetto sala con autonomia operativa',
    typicalRoles: ['Cameriere', 'Barista', 'Addetto sala'],
    monthlyBase2026: 1868.0,
    hierarchy: 4,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_4]: {
    level: CCNLLevel.LIVELLO_4,
    category: 'OPERAI',
    code: '4',
    title: 'Quarto livello operai',
    description: 'Cuoco specializzato, chef de partie, pizzaiolo qualificato',
    typicalRoles: ['Cuoco specializzato', 'Chef de partie', 'Pizzaiolo'],
    monthlyBase2026: 1725.0,
    hierarchy: 3,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_5]: {
    level: CCNLLevel.LIVELLO_5,
    category: 'OPERAI',
    code: '5',
    title: 'Quinto livello operai',
    description: 'Cuoco, aiuto cuoco, commis con competenze consolidate',
    typicalRoles: ['Cuoco', 'Aiuto cuoco', 'Commis chef'],
    monthlyBase2026: 1589.0,
    hierarchy: 2,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_6]: {
    level: CCNLLevel.LIVELLO_6,
    category: 'OPERAI',
    code: '6',
    title: 'Sesto livello operai',
    description: 'Mansioni di base: runner, lavapiatti, supporto generale',
    typicalRoles: ['Runner', 'Lavapiatti', 'Addetto pulizie', 'Commis sala'],
    monthlyBase2026: 1465.0,
    hierarchy: 1,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
}

/** Compatibilità con componenti che usano CCNL_POSITIONS. */
export interface CCNLPosition {
  level: CCNLLevel
  category: CCCategory
  title: string
  description: string
  minSalary: number
  maxSalary: number
  weeklyHours: number
  overtimeRate: number
  nightRate: number
  holidayRate: number
}

export const CCNL_POSITIONS: Record<CCNLLevel, CCNLPosition> = Object.fromEntries(
  CCNL_LEVEL_ORDER.map((level) => {
    const info = CCNL_LEVELS[level]
    return [
      level,
      {
        level: info.level,
        category: info.category,
        title: info.title,
        description: info.description,
        minSalary: info.monthlyBase2026,
        maxSalary: Math.round(info.monthlyBase2026 * 1.08),
        weeklyHours: info.weeklyHours,
        overtimeRate: info.overtimeRate,
        nightRate: info.nightRate,
        holidayRate: info.holidayRate,
      },
    ]
  })
) as Record<CCNLLevel, CCNLPosition>

export const CCNL_LEVEL_OPTIONS = CCNL_LEVEL_ORDER.map((level) => {
  const info = CCNL_LEVELS[level]
  return {
    value: level,
    label: `${info.code} — ${info.title}`,
    monthlyBase: info.monthlyBase2026,
  }
})

export function isCcnlLevel(value: string | null | undefined): value is CCNLLevel {
  if (!value) return false
  return value in CCNL_LEVELS
}

export function getCcnlHierarchy(level: CCNLLevel | string): number {
  const key = String(level).toUpperCase() as CCNLLevel
  return CCNL_LEVELS[key]?.hierarchy ?? 0
}

export function getCcnlMonthlyBase(level: CCNLLevel | string | null | undefined): number {
  if (!level) return 0
  const key = String(level).toUpperCase() as CCNLLevel
  return CCNL_LEVELS[key]?.monthlyBase2026 ?? 0
}

export function formatCcnlLevelLabel(level: CCNLLevel | string | null | undefined): string {
  if (!level) return '—'
  const key = String(level).toUpperCase() as CCNLLevel
  const info = CCNL_LEVELS[key]
  if (!info) return String(level)
  return `${info.code} — ${info.title}`
}

export class CCNLCalculator {
  static getPositionInfo(level: CCNLLevel) {
    return CCNL_POSITIONS[level]
  }

  static calculateHourlyRate(baseSalary: number, weeklyHours: number = 40) {
    const monthlyHours = (weeklyHours * 52) / 12
    return baseSalary / monthlyHours
  }

  static calculateIRPEF(annualIncome: number): number {
    if (annualIncome <= 15000) return annualIncome * 0.23
    if (annualIncome <= 28000) return 3450 + (annualIncome - 15000) * 0.27
    if (annualIncome <= 55000) return 6960 + (annualIncome - 28000) * 0.38
    return annualIncome * 0.43
  }
}

// =====================
// CCNL TURISMO - MANSIONI DETTAGLIATE
// =====================

export enum JobRole {
  DIRETTORE_GENERALE = 'DIRETTORE_GENERALE',
  DIRETTORE_OPERATIVO = 'DIRETTORE_OPERATIVO',
  RESPONSABILE_AREA = 'RESPONSABILE_AREA',
  RESPONSABILE_REPARTO = 'RESPONSABILE_REPARTO',
  MAITRE = 'MAITRE',
  RESPONSABILE_SALA = 'RESPONSABILE_SALA',
  CHEF_DE_RANG_SENIOR = 'CHEF_DE_RANG_SENIOR',
  SOMMELIER = 'SOMMELIER',
  CAMERIERE_SPECIALIZZATO = 'CAMERIERE_SPECIALIZZATO',
  BARMAN_QUALIFICATO = 'BARMAN_QUALIFICATO',
  CASSIERE_PRINCIPALE = 'CASSIERE_PRINCIPALE',
  CAMERIERE = 'CAMERIERE',
  BARISTA = 'BARISTA',
  ADDETTO_SALA = 'ADDETTO_SALA',
  CHEF_EXECUTIVE = 'CHEF_EXECUTIVE',
  SOUS_CHEF = 'SOUS_CHEF',
  CHEF_DE_PARTIE = 'CHEF_DE_PARTIE',
  PIZZAIOLO_SPECIALIZZATO = 'PIZZAIOLO_SPECIALIZZATO',
  CUOCO_SPECIALIZZATO = 'CUOCO_SPECIALIZZATO',
  CUOCO = 'CUOCO',
  COMMIS_CHEF = 'COMMIS_CHEF',
  AIUTO_CUOCO = 'AIUTO_CUOCO',
  PIZZAIOLO = 'PIZZAIOLO',
  LAVAPIATTI = 'LAVAPIATTI',
  ADDETTO_PULIZIE = 'ADDETTO_PULIZIE',
  ADDETTO_SPOGLIATOI = 'ADDETTO_SPOGLIATOI',
  RUNNER = 'RUNNER',
}

export enum Department {
  DIREZIONE = 'DIREZIONE',
  SALA = 'SALA',
  BAR = 'BAR',
  CUCINA = 'CUCINA',
  PIZZERIA = 'PIZZERIA',
  PULIZIE = 'PULIZIE',
  SERVIZI = 'SERVIZI',
}

export interface JobDescription {
  role: JobRole
  ccnlLevel: CCNLLevel
  department: Department
  title: string
  description: string
  responsibilities: string[]
  skills: string[]
  canSupervise: JobRole[]
  canSubstitute: JobRole[]
  canBeCoveredBy: JobRole[]
  minExperience: number
  certifications?: string[]
  shiftCompatibility: {
    morning: boolean
    afternoon: boolean
    evening: boolean
    night: boolean
  }
}

export const JOB_DESCRIPTIONS: Partial<Record<JobRole, JobDescription>> = {
  [JobRole.DIRETTORE_GENERALE]: {
    role: JobRole.DIRETTORE_GENERALE,
    ccnlLevel: CCNLLevel.QA,
    department: Department.DIREZIONE,
    title: 'Direttore Generale',
    description: "Responsabilità complessiva dell'attività, definizione strategie, gestione P&L",
    responsibilities: [
      'Definizione strategia aziendale',
      'Gestione budget e P&L',
      'Supervisione generale operazioni',
      'Rapporti con proprietà/investitori',
      'Gestione crisi e situazioni critiche',
      'Approvazione assunzioni dirigenziali',
    ],
    skills: [
      'Leadership e gestione team',
      'Analisi finanziaria avanzata',
      'Conoscenza normative settore',
      'Competenze strategiche e commerciali',
    ],
    canSupervise: [JobRole.DIRETTORE_OPERATIVO, JobRole.RESPONSABILE_AREA],
    canSubstitute: [],
    canBeCoveredBy: [JobRole.DIRETTORE_OPERATIVO],
    minExperience: 10,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.DIRETTORE_OPERATIVO]: {
    role: JobRole.DIRETTORE_OPERATIVO,
    ccnlLevel: CCNLLevel.QA,
    department: Department.DIREZIONE,
    title: 'Direttore Operativo',
    description: 'Gestione operativa quotidiana, coordinamento tutti i reparti',
    responsibilities: [
      'Coordinamento operazioni giornaliere',
      'Supervisione responsabili reparto',
      'Controllo qualità servizio',
      'Gestione planning e scheduling',
      'Risoluzione problemi operativi',
      'Report direzione generale',
    ],
    skills: [
      'Gestione operazioni F&B',
      'Coordinamento multi-reparto',
      'Problem solving avanzato',
      'Controllo qualità e standard',
    ],
    canSupervise: [JobRole.RESPONSABILE_AREA, JobRole.RESPONSABILE_REPARTO, JobRole.MAITRE],
    canSubstitute: [JobRole.DIRETTORE_GENERALE],
    canBeCoveredBy: [JobRole.RESPONSABILE_AREA],
    minExperience: 8,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.RESPONSABILE_AREA]: {
    role: JobRole.RESPONSABILE_AREA,
    ccnlLevel: CCNLLevel.QB,
    department: Department.SALA,
    title: 'Responsabile Area Sala',
    description: 'Coordinamento area sala, gestione team, obiettivi commerciali',
    responsibilities: [
      'Gestione team sala completo',
      'Pianificazione turni area',
      'Controllo ricavi e obiettivi',
      'Formazione personale sala',
      'Gestione reclami clienti',
      'Report performance area',
    ],
    skills: [
      'Management team esteso',
      'Competenze commerciali',
      'Gestione budget area',
      'Formazione e sviluppo',
    ],
    canSupervise: [JobRole.MAITRE, JobRole.CAMERIERE_SPECIALIZZATO, JobRole.CAMERIERE],
    canSubstitute: [JobRole.DIRETTORE_OPERATIVO],
    canBeCoveredBy: [JobRole.MAITRE],
    minExperience: 6,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.RESPONSABILE_REPARTO]: {
    role: JobRole.RESPONSABILE_REPARTO,
    ccnlLevel: CCNLLevel.QB,
    department: Department.CUCINA,
    title: 'Responsabile Reparto Cucina',
    description: 'Coordinamento cucina, controllo costi, gestione brigade',
    responsibilities: [
      'Gestione brigade cucina',
      'Controllo food cost e sprechi',
      'Pianificazione menù e produzione',
      'Gestione fornitori e ordini',
      'Controllo qualità e HACCP',
      'Formazione staff cucina',
    ],
    skills: [
      'Gestione brigade professionale',
      'Controllo costi e margini',
      'Competenze HACCP avanzate',
      'Gestione acquisti e fornitori',
    ],
    canSupervise: [JobRole.CHEF_EXECUTIVE, JobRole.SOUS_CHEF, JobRole.CHEF_DE_PARTIE],
    canSubstitute: [JobRole.DIRETTORE_OPERATIVO],
    canBeCoveredBy: [JobRole.CHEF_EXECUTIVE],
    minExperience: 6,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.MAITRE]: {
    role: JobRole.MAITRE,
    ccnlLevel: CCNLLevel.LIVELLO_1,
    department: Department.SALA,
    title: 'Maître de Salle',
    description: 'Supervisione servizio sala, accoglienza VIP, coordinamento squadre',
    responsibilities: [
      'Supervisione servizio sala',
      'Accoglienza clienti VIP',
      'Coordinamento chef de rang',
      'Gestione prenotazioni speciali',
      'Controllo mise en place',
      'Risoluzione problemi servizio',
    ],
    skills: [
      'Eccellente conoscenza servizio',
      'Competenze enogastronomiche',
      'Leadership operativa',
      'Gestione clientela premium',
    ],
    canSupervise: [JobRole.CHEF_DE_RANG_SENIOR, JobRole.CAMERIERE_SPECIALIZZATO, JobRole.CAMERIERE],
    canSubstitute: [JobRole.RESPONSABILE_AREA],
    canBeCoveredBy: [JobRole.CHEF_DE_RANG_SENIOR],
    minExperience: 4,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.SOMMELIER]: {
    role: JobRole.SOMMELIER,
    ccnlLevel: CCNLLevel.LIVELLO_1,
    department: Department.SALA,
    title: 'Sommelier',
    description: 'Gestione cantina, consulenza vini, formazione staff su beverage',
    responsibilities: [
      'Gestione completa cantina',
      'Consulenza enologica clienti',
      'Creazione carta vini',
      'Formazione staff su beverage',
      'Controllo rotazione scorte',
      'Eventi degustazione',
    ],
    skills: [
      'Certificazione sommelier',
      'Conoscenza enologica approfondita',
      'Competenze sensoriali',
      'Capacità didattiche',
    ],
    canSupervise: [JobRole.BARMAN_QUALIFICATO, JobRole.CAMERIERE_SPECIALIZZATO],
    canSubstitute: [JobRole.MAITRE],
    canBeCoveredBy: [JobRole.BARMAN_QUALIFICATO],
    minExperience: 3,
    certifications: ['Certificazione AIS/FISAR', 'Corso HACCP'],
    shiftCompatibility: { morning: false, afternoon: true, evening: true, night: false },
  },

  [JobRole.CAMERIERE_SPECIALIZZATO]: {
    role: JobRole.CAMERIERE_SPECIALIZZATO,
    ccnlLevel: CCNLLevel.LIVELLO_2,
    department: Department.SALA,
    title: 'Cameriere Specializzato',
    description: 'Servizio qualificato, gestione tavoli VIP, competenze tecniche avanzate',
    responsibilities: [
      'Servizio tavoli premium',
      'Tecniche servizio avanzate',
      'Presentazione piatti e vini',
      'Gestione reclami clienti',
      'Affiancamento nuovi camerieri',
      'Controllo qualità servizio',
    ],
    skills: [
      'Tecniche servizio professionale',
      'Conoscenza menu approfondita',
      'Competenze enogastronomiche',
      'Gestione stress e multitasking',
    ],
    canSupervise: [JobRole.CAMERIERE, JobRole.ADDETTO_SALA],
    canSubstitute: [JobRole.CHEF_DE_RANG_SENIOR, JobRole.MAITRE],
    canBeCoveredBy: [JobRole.CAMERIERE],
    minExperience: 2,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: true },
  },

  [JobRole.BARMAN_QUALIFICATO]: {
    role: JobRole.BARMAN_QUALIFICATO,
    ccnlLevel: CCNLLevel.LIVELLO_2,
    department: Department.BAR,
    title: 'Barman Qualificato',
    description: 'Cocktail bar professionale, creazione drink, gestione banco bar',
    responsibilities: [
      'Preparazione cocktail complessi',
      'Creazione drink signature',
      'Gestione banco bar completo',
      'Controllo costi beverage',
      'Formazione baristi junior',
      'Gestione eventi bar',
    ],
    skills: [
      'Mixology professionale',
      'Conoscenza spirits e liquori',
      'Creatività e presentazione',
      'Gestione cassa bar',
    ],
    canSupervise: [JobRole.BARISTA],
    canSubstitute: [JobRole.SOMMELIER],
    canBeCoveredBy: [JobRole.BARISTA],
    minExperience: 2,
    shiftCompatibility: { morning: false, afternoon: true, evening: true, night: true },
  },

  [JobRole.CAMERIERE]: {
    role: JobRole.CAMERIERE,
    ccnlLevel: CCNLLevel.LIVELLO_3,
    department: Department.SALA,
    title: 'Cameriere',
    description: 'Servizio sala standard, presa ordini, servizio tavoli',
    responsibilities: [
      'Servizio tavoli assegnati',
      'Presa ordini e comande',
      'Servizio piatti e bevande',
      'Pulizia e riordino sala',
      'Assistenza clienti',
      'Gestione cassa semplice',
    ],
    skills: [
      'Tecniche base servizio',
      'Conoscenza menu base',
      'Uso POS e cassa',
      'Comunicazione clienti',
    ],
    canSupervise: [JobRole.RUNNER],
    canSubstitute: [JobRole.CAMERIERE_SPECIALIZZATO],
    canBeCoveredBy: [JobRole.ADDETTO_SALA],
    minExperience: 0,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: true },
  },

  [JobRole.BARISTA]: {
    role: JobRole.BARISTA,
    ccnlLevel: CCNLLevel.LIVELLO_3,
    department: Department.BAR,
    title: 'Barista',
    description: 'Preparazione caffetteria, bevande base, servizio bar',
    responsibilities: [
      'Preparazione caffè e cappuccini',
      'Bevande calde e fredde semplici',
      'Servizio banco bar',
      'Pulizia attrezzature bar',
      'Gestione cassa bar',
      'Riordino banco',
    ],
    skills: [
      'Uso macchina caffè professionale',
      'Preparazioni base bar',
      'Gestione cassa',
      'Igiene e pulizia',
    ],
    canSupervise: [],
    canSubstitute: [JobRole.BARMAN_QUALIFICATO],
    canBeCoveredBy: [JobRole.CAMERIERE],
    minExperience: 0,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.CHEF_EXECUTIVE]: {
    role: JobRole.CHEF_EXECUTIVE,
    ccnlLevel: CCNLLevel.LIVELLO_4,
    department: Department.CUCINA,
    title: 'Chef Executive',
    description: 'Direzione cucina, creazione menu, controllo qualità, gestione brigade',
    responsibilities: [
      'Direzione operativa cucina',
      'Creazione e sviluppo menu',
      'Controllo qualità produzione',
      'Gestione brigade cucina',
      'Controllo costi e sprechi',
      'Formazione staff cucina',
    ],
    skills: [
      'Competenze culinarie avanzate',
      'Gestione team cucina',
      'Creatività e innovazione',
      'Controllo costi food',
    ],
    canSupervise: [JobRole.SOUS_CHEF, JobRole.CHEF_DE_PARTIE, JobRole.CUOCO],
    canSubstitute: [JobRole.RESPONSABILE_REPARTO],
    canBeCoveredBy: [JobRole.SOUS_CHEF],
    minExperience: 5,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.PIZZAIOLO_SPECIALIZZATO]: {
    role: JobRole.PIZZAIOLO_SPECIALIZZATO,
    ccnlLevel: CCNLLevel.LIVELLO_4,
    department: Department.PIZZERIA,
    title: 'Pizzaiolo Specializzato',
    description: 'Gestione completa pizzeria, creazione impasti, cottura professionale',
    responsibilities: [
      'Gestione completa pizzeria',
      'Preparazione impasti e lievitazioni',
      'Cottura e presentazione pizze',
      'Controllo qualità prodotto',
      'Gestione scorte pizzeria',
      'Formazione aiuti pizzaiolo',
    ],
    skills: [
      'Tecniche impasto e lievitazione',
      'Gestione forno professionale',
      'Conoscenza ingredienti',
      'Precisione e velocità',
    ],
    canSupervise: [JobRole.PIZZAIOLO],
    canSubstitute: [JobRole.CHEF_DE_PARTIE],
    canBeCoveredBy: [JobRole.PIZZAIOLO],
    minExperience: 3,
    shiftCompatibility: { morning: false, afternoon: true, evening: true, night: true },
  },

  [JobRole.CUOCO]: {
    role: JobRole.CUOCO,
    ccnlLevel: CCNLLevel.LIVELLO_5,
    department: Department.CUCINA,
    title: 'Cuoco',
    description: 'Preparazioni culinarie, gestione postazione, supporto brigade',
    responsibilities: [
      'Preparazioni secondo ricettario',
      'Gestione postazione assegnata',
      'Controllo cotture e temperature',
      'Pulizia postazione lavoro',
      'Supporto altri reparti cucina',
      'Rispetto procedure HACCP',
    ],
    skills: [
      'Tecniche cottura base',
      'Conoscenza ingredienti',
      'Organizzazione lavoro',
      'Igiene e sicurezza',
    ],
    canSupervise: [JobRole.COMMIS_CHEF, JobRole.AIUTO_CUOCO],
    canSubstitute: [JobRole.CHEF_DE_PARTIE],
    canBeCoveredBy: [JobRole.COMMIS_CHEF],
    minExperience: 1,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },

  [JobRole.LAVAPIATTI]: {
    role: JobRole.LAVAPIATTI,
    ccnlLevel: CCNLLevel.LIVELLO_6,
    department: Department.CUCINA,
    title: 'Lavapiatti',
    description: 'Lavaggio stoviglie, pulizie cucina, supporto generale',
    responsibilities: [
      'Lavaggio stoviglie e pentolame',
      'Pulizia cucina e attrezzature',
      'Gestione rifiuti e differenziata',
      'Riordino magazzini',
      'Supporto scarico merci',
      'Pulizie straordinarie',
    ],
    skills: [
      'Uso lavastoviglie industriali',
      'Prodotti pulizia e igienizzanti',
      'Organizzazione spazi',
      'Resistenza fisica',
    ],
    canSupervise: [],
    canSubstitute: [],
    canBeCoveredBy: [JobRole.AIUTO_CUOCO],
    minExperience: 0,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: true },
  },

  [JobRole.RUNNER]: {
    role: JobRole.RUNNER,
    ccnlLevel: CCNLLevel.LIVELLO_6,
    department: Department.SALA,
    title: 'Runner/Porta Piatti',
    description: 'Trasporto piatti, supporto sala, pulizie generali',
    responsibilities: [
      'Trasporto piatti dalla cucina',
      'Supporto camerieri durante servizio',
      'Pulizia e riordino tavoli',
      'Rifornimento postazioni sala',
      'Gestione tovagliato sporco',
      'Piccole commissioni',
    ],
    skills: [
      'Rapidità e precisione',
      'Resistenza fisica',
      'Collaborazione team',
      'Attenzione igiene',
    ],
    canSupervise: [],
    canSubstitute: [],
    canBeCoveredBy: [JobRole.CAMERIERE],
    minExperience: 0,
    shiftCompatibility: { morning: true, afternoon: true, evening: true, night: false },
  },
}

export class JobMatcher {
  static canCoverShift(requiredRole: JobRole, availableEmployee: JobRole): boolean {
    const required = JOB_DESCRIPTIONS[requiredRole]
    const available = JOB_DESCRIPTIONS[availableEmployee]
    if (!required) return false
    if (requiredRole === availableEmployee) return true
    return !!available && required.canBeCoveredBy.includes(availableEmployee)
  }

  static getSuitableReplacements(targetRole: JobRole): JobRole[] {
    const target = JOB_DESCRIPTIONS[targetRole]
    return target?.canBeCoveredBy || []
  }

  static getShiftCompatibility(
    role: JobRole,
    shiftType: 'morning' | 'afternoon' | 'evening' | 'night'
  ): boolean {
    const job = JOB_DESCRIPTIONS[role]
    return job ? job.shiftCompatibility[shiftType] : false
  }

  static getDepartmentRoles(department: Department): JobRole[] {
    return Object.values(JOB_DESCRIPTIONS)
      .filter((job): job is JobDescription => !!job && job.department === department)
      .map((job) => job.role)
  }

  static getMinimumStaffByDepartment(department: Department): {
    morning: JobRole[]
    afternoon: JobRole[]
    evening: JobRole[]
    night: JobRole[]
  } {
    const roles = this.getDepartmentRoles(department)
    return {
      morning: roles.filter((role) => this.getShiftCompatibility(role, 'morning')),
      afternoon: roles.filter((role) => this.getShiftCompatibility(role, 'afternoon')),
      evening: roles.filter((role) => this.getShiftCompatibility(role, 'evening')),
      night: roles.filter((role) => this.getShiftCompatibility(role, 'night')),
    }
  }
}
