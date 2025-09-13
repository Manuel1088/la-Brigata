export enum CCNLLevel {
  LIVELLO_1Q = '1Q',
  LIVELLO_2Q = '2Q',
  LIVELLO_3 = '3',
  LIVELLO_4 = '4',
  LIVELLO_5 = '5',
  LIVELLO_6 = '6',
  LIVELLO_7 = '7',
  LIVELLO_8 = '8',
}

export type CCCategory = 'QUADRI' | 'IMPIEGATI' | 'OPERAI'

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

export const CCNL_POSITIONS: Record<CCNLLevel, CCNLPosition> = {
  [CCNLLevel.LIVELLO_1Q]: {
    level: CCNLLevel.LIVELLO_1Q,
    category: 'QUADRI',
    title: 'Direttore Generale',
    description: 'Direzione generale, coordinamento complessivo',
    minSalary: 2800,
    maxSalary: 3500,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_2Q]: {
    level: CCNLLevel.LIVELLO_2Q,
    category: 'QUADRI',
    title: 'Responsabile Area',
    description: 'Coordinamento settori, responsabilità operative',
    minSalary: 2200,
    maxSalary: 2800,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_3]: {
    level: CCNLLevel.LIVELLO_3,
    category: 'IMPIEGATI',
    title: 'Responsabile Sala/Maître',
    description: 'Coordinamento sala, supervisione servizio',
    minSalary: 1800,
    maxSalary: 2200,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_4]: {
    level: CCNLLevel.LIVELLO_4,
    category: 'IMPIEGATI',
    title: 'Cameriere Specializzato',
    description: 'Servizio qualificato, conoscenze tecniche',
    minSalary: 1600,
    maxSalary: 1900,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_5]: {
    level: CCNLLevel.LIVELLO_5,
    category: 'IMPIEGATI',
    title: 'Cameriere/Barista',
    description: 'Servizio standard, mansioni operative',
    minSalary: 1400,
    maxSalary: 1700,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_6]: {
    level: CCNLLevel.LIVELLO_6,
    category: 'OPERAI',
    title: 'Cuoco Specializzato',
    description: 'Preparazioni specializzate, competenze tecniche',
    minSalary: 1500,
    maxSalary: 1800,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_7]: {
    level: CCNLLevel.LIVELLO_7,
    category: 'OPERAI',
    title: 'Cuoco/Aiuto Cuoco',
    description: 'Preparazioni qualificate, supporto cucina',
    minSalary: 1300,
    maxSalary: 1600,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
  [CCNLLevel.LIVELLO_8]: {
    level: CCNLLevel.LIVELLO_8,
    category: 'OPERAI',
    title: 'Operaio Generico',
    description: 'Mansioni di base, supporto generale',
    minSalary: 1200,
    maxSalary: 1400,
    weeklyHours: 40,
    overtimeRate: 1.25,
    nightRate: 1.2,
    holidayRate: 1.5,
  },
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


