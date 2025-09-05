// Sistema di Gestione Ferie e Permessi per La Brigata
// Business logic completa per 8 tipologie di richieste

export interface LeaveTypeConfig {
  id: string
  name: string
  icon: string
  maxDays: number
  noticeDays: number
  autoApprove: boolean
  requiresAttachment: boolean
  description: string
  color: string
}

export interface LeaveBalance {
  type: string
  total: number
  used: number
  remaining: number
  percentage: number
}

export interface LeaveRequest {
  id: string
  userId: string
  startDate: Date
  endDate: Date
  type: string
  reason?: string
  status: string
  isUrgent: boolean
  attachment?: string
  createdAt: Date
  approvedBy?: string
  approvedAt?: Date
  rejectedBy?: string
  rejectedAt?: Date
  rejectionReason?: string
}

// Configurazione delle 8 tipologie di ferie/permessi
export const LEAVE_TYPES: Record<string, LeaveTypeConfig> = {
  VACATION: {
    id: 'VACATION',
    name: 'Ferie',
    icon: '🏖️',
    maxDays: 26,
    noticeDays: 15,
    autoApprove: false,
    requiresAttachment: false,
    description: 'Ferie annuali retribuite (26 giorni/anno)',
    color: 'blue'
  },
  SICK_LEAVE: {
    id: 'SICK_LEAVE',
    name: 'Malattia',
    icon: '🤒',
    maxDays: 180,
    noticeDays: 0,
    autoApprove: true,
    requiresAttachment: true,
    description: 'Assenza per malattia con certificato medico',
    color: 'red'
  },
  ROL: {
    id: 'ROL',
    name: 'ROL',
    icon: '⏰',
    maxDays: 32,
    noticeDays: 7,
    autoApprove: false,
    requiresAttachment: false,
    description: 'Recupero ore lavorative (32 ore accumulate)',
    color: 'green'
  },
  PAID_LEAVE: {
    id: 'PAID_LEAVE',
    name: 'Permessi Retribuiti',
    icon: '📅',
    maxDays: 3,
    noticeDays: 3,
    autoApprove: false,
    requiresAttachment: false,
    description: 'Permessi retribuiti per motivi personali',
    color: 'purple'
  },
  UNPAID_LEAVE: {
    id: 'UNPAID_LEAVE',
    name: 'Permessi Non Retribuiti',
    icon: '📋',
    maxDays: 30,
    noticeDays: 15,
    autoApprove: false,
    requiresAttachment: false,
    description: 'Permessi non retribuiti per motivi personali',
    color: 'gray'
  },
  PARENTAL_LEAVE: {
    id: 'PARENTAL_LEAVE',
    name: 'Congedo Parentale',
    icon: '👶',
    maxDays: 180,
    noticeDays: 30,
    autoApprove: false,
    requiresAttachment: true,
    description: 'Congedo per nascita/adozione di figlio',
    color: 'pink'
  },
  STUDY_LEAVE: {
    id: 'STUDY_LEAVE',
    name: 'Permesso Studio',
    icon: '📚',
    maxDays: 150,
    noticeDays: 30,
    autoApprove: false,
    requiresAttachment: true,
    description: 'Permesso per attività di studio/formazione',
    color: 'indigo'
  },
  UNION_LEAVE: {
    id: 'UNION_LEAVE',
    name: 'Permesso Sindacale',
    icon: '🤝',
    maxDays: 8,
    noticeDays: 7,
    autoApprove: false,
    requiresAttachment: false,
    description: 'Permesso per attività sindacali',
    color: 'orange'
  }
}

// Mock data per saldi dipendenti (in produzione verrà dal database)
const mockLeaveBalances: Record<string, LeaveBalance[]> = {
  '1': [ // Admin Proprietario
    { type: 'VACATION', total: 26, used: 5, remaining: 21, percentage: 19 },
    { type: 'ROL', total: 32, used: 8, remaining: 24, percentage: 25 },
    { type: 'PAID_LEAVE', total: 3, used: 1, remaining: 2, percentage: 33 },
    { type: 'UNPAID_LEAVE', total: 30, used: 0, remaining: 30, percentage: 0 },
    { type: 'SICK_LEAVE', total: 180, used: 2, remaining: 178, percentage: 1 },
    { type: 'PARENTAL_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'STUDY_LEAVE', total: 150, used: 0, remaining: 150, percentage: 0 },
    { type: 'UNION_LEAVE', total: 8, used: 0, remaining: 8, percentage: 0 }
  ],
  '2': [ // Marco Direttore
    { type: 'VACATION', total: 26, used: 12, remaining: 14, percentage: 46 },
    { type: 'ROL', total: 32, used: 16, remaining: 16, percentage: 50 },
    { type: 'PAID_LEAVE', total: 3, used: 2, remaining: 1, percentage: 67 },
    { type: 'UNPAID_LEAVE', total: 30, used: 0, remaining: 30, percentage: 0 },
    { type: 'SICK_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'PARENTAL_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'STUDY_LEAVE', total: 150, used: 0, remaining: 150, percentage: 0 },
    { type: 'UNION_LEAVE', total: 8, used: 0, remaining: 8, percentage: 0 }
  ],
  '3': [ // Anna Manager
    { type: 'VACATION', total: 26, used: 8, remaining: 18, percentage: 31 },
    { type: 'ROL', total: 32, used: 12, remaining: 20, percentage: 38 },
    { type: 'PAID_LEAVE', total: 3, used: 0, remaining: 3, percentage: 0 },
    { type: 'UNPAID_LEAVE', total: 30, used: 0, remaining: 30, percentage: 0 },
    { type: 'SICK_LEAVE', total: 180, used: 1, remaining: 179, percentage: 1 },
    { type: 'PARENTAL_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'STUDY_LEAVE', total: 150, used: 0, remaining: 150, percentage: 0 },
    { type: 'UNION_LEAVE', total: 8, used: 0, remaining: 8, percentage: 0 }
  ],
  '4': [ // Luca Cassiere
    { type: 'VACATION', total: 26, used: 15, remaining: 11, percentage: 58 },
    { type: 'ROL', total: 32, used: 20, remaining: 12, percentage: 63 },
    { type: 'PAID_LEAVE', total: 3, used: 3, remaining: 0, percentage: 100 },
    { type: 'UNPAID_LEAVE', total: 30, used: 0, remaining: 30, percentage: 0 },
    { type: 'SICK_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'PARENTAL_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'STUDY_LEAVE', total: 150, used: 0, remaining: 150, percentage: 0 },
    { type: 'UNION_LEAVE', total: 8, used: 0, remaining: 8, percentage: 0 }
  ],
  '5': [ // Sofia Dipendente
    { type: 'VACATION', total: 26, used: 3, remaining: 23, percentage: 12 },
    { type: 'ROL', total: 32, used: 4, remaining: 28, percentage: 13 },
    { type: 'PAID_LEAVE', total: 3, used: 0, remaining: 3, percentage: 0 },
    { type: 'UNPAID_LEAVE', total: 30, used: 0, remaining: 30, percentage: 0 },
    { type: 'SICK_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'PARENTAL_LEAVE', total: 180, used: 0, remaining: 180, percentage: 0 },
    { type: 'STUDY_LEAVE', total: 150, used: 0, remaining: 150, percentage: 0 },
    { type: 'UNION_LEAVE', total: 8, used: 0, remaining: 8, percentage: 0 }
  ]
}

// Mock data per richieste ferie (in produzione verrà dal database)
const mockLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    userId: '2',
    startDate: new Date('2024-12-23'),
    endDate: new Date('2024-12-27'),
    type: 'VACATION',
    reason: 'Vacanze di Natale',
    status: 'APPROVED',
    isUrgent: false,
    createdAt: new Date('2024-12-01'),
    approvedBy: '1',
    approvedAt: new Date('2024-12-02')
  },
  {
    id: '2',
    userId: '3',
    startDate: new Date('2024-12-20'),
    endDate: new Date('2024-12-20'),
    type: 'SICK_LEAVE',
    reason: 'Influenza',
    status: 'APPROVED',
    isUrgent: true,
    attachment: '/certificates/cert-001.pdf',
    createdAt: new Date('2024-12-20'),
    approvedBy: '1',
    approvedAt: new Date('2024-12-20')
  },
  {
    id: '3',
    userId: '4',
    startDate: new Date('2024-12-30'),
    endDate: new Date('2024-12-31'),
    type: 'ROL',
    reason: 'Recupero ore straordinarie',
    status: 'PENDING',
    isUrgent: false,
    createdAt: new Date('2024-12-15')
  }
]

// Funzioni di utilità
export function getLeaveTypeConfig(type: string): LeaveTypeConfig {
  return LEAVE_TYPES[type] || LEAVE_TYPES.VACATION
}

export function getLeaveBalances(userId: string): LeaveBalance[] {
  return mockLeaveBalances[userId] || []
}

export function getLeaveRequests(userId?: string): LeaveRequest[] {
  if (userId) {
    return mockLeaveRequests.filter(req => req.userId === userId)
  }
  return mockLeaveRequests
}

export function getLeaveRequestsByStatus(status: string): LeaveRequest[] {
  return mockLeaveRequests.filter(req => req.status === status)
}

// Calcolo giorni lavorativi (esclusi weekend)
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Non domenica (0) e non sabato (6)
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

// Validazioni business logic
export function validateLeaveRequest(
  userId: string,
  type: string,
  startDate: Date,
  endDate: Date,
  isUrgent: boolean = false
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const config = getLeaveTypeConfig(type)
  const balances = getLeaveBalances(userId)
  const balance = balances.find(b => b.type === type)
  
  // Calcola giorni richiesti
  const requestedDays = calculateWorkingDays(startDate, endDate)
  
  // Verifica giorni disponibili
  if (balance && requestedDays > balance.remaining) {
    errors.push(`Giorni richiesti (${requestedDays}) superiori a quelli disponibili (${balance.remaining})`)
  }
  
  // Verifica preavviso minimo (tranne per urgenze)
  if (!isUrgent && config.noticeDays > 0) {
    const today = new Date()
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilStart < config.noticeDays) {
      errors.push(`Preavviso minimo richiesto: ${config.noticeDays} giorni`)
    }
  }
  
  // Verifica sovrapposizioni
  const existingRequests = getLeaveRequests(userId).filter(req => 
    req.status === 'APPROVED' || req.status === 'PENDING'
  )
  
  for (const existing of existingRequests) {
    if (
      (startDate >= existing.startDate && startDate <= existing.endDate) ||
      (endDate >= existing.startDate && endDate <= existing.endDate) ||
      (startDate <= existing.startDate && endDate >= existing.endDate)
    ) {
      errors.push(`Sovrapposizione con richiesta esistente dal ${existing.startDate.toLocaleDateString('it-IT')} al ${existing.endDate.toLocaleDateString('it-IT')}`)
      break
    }
  }
  
  // Verifica periodi blackout (es. Natale)
  const blackoutPeriods = [
    { start: new Date('2024-12-24'), end: new Date('2024-12-26') },
    { start: new Date('2024-12-31'), end: new Date('2025-01-01') }
  ]
  
  for (const blackout of blackoutPeriods) {
    if (
      (startDate >= blackout.start && startDate <= blackout.end) ||
      (endDate >= blackout.start && endDate <= blackout.end) ||
      (startDate <= blackout.start && endDate >= blackout.end)
    ) {
      errors.push(`Periodo non disponibile: ${blackout.start.toLocaleDateString('it-IT')} - ${blackout.end.toLocaleDateString('it-IT')}`)
      break
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Statistiche per dashboard
export function getLeaveStats(): {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  urgentRequests: number
  requestsByType: Record<string, number>
  requestsByStatus: Record<string, number>
} {
  const requests = getLeaveRequests()
  
  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'PENDING').length,
    approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
    rejectedRequests: requests.filter(r => r.status === 'REJECTED').length,
    urgentRequests: requests.filter(r => r.isUrgent).length,
    requestsByType: {} as Record<string, number>,
    requestsByStatus: {} as Record<string, number>
  }
  
  // Conta per tipo
  Object.keys(LEAVE_TYPES).forEach(type => {
    stats.requestsByType[type] = requests.filter(r => r.type === type).length
  })
  
  // Conta per status
  const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED']
  statuses.forEach(status => {
    stats.requestsByStatus[status] = requests.filter(r => r.status === status).length
  })
  
  return stats
}

// Funzione per creare una nuova richiesta
export function createLeaveRequest(
  userId: string,
  type: string,
  startDate: Date,
  endDate: Date,
  reason?: string,
  isUrgent: boolean = false,
  attachment?: string
): { success: boolean; requestId?: string; errors?: string[] } {
  const validation = validateLeaveRequest(userId, type, startDate, endDate, isUrgent)
  
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors
    }
  }
  
  // In produzione, salvare nel database
  const newRequest: LeaveRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    startDate,
    endDate,
    type,
    reason,
    status: 'PENDING',
    isUrgent,
    attachment,
    createdAt: new Date()
  }
  
  // Aggiungi alla lista mock
  mockLeaveRequests.push(newRequest)
  
  return {
    success: true,
    requestId: newRequest.id
  }
}

// Funzione per approvare/rifiutare una richiesta
export function updateLeaveRequestStatus(
  requestId: string,
  status: 'APPROVED' | 'REJECTED',
  approverId: string,
  comment?: string
): { success: boolean; error?: string } {
  const request = mockLeaveRequests.find(req => req.id === requestId)
  
  if (!request) {
    return {
      success: false,
      error: 'Richiesta non trovata'
    }
  }
  
  if (request.status !== 'PENDING') {
    return {
      success: false,
      error: 'Richiesta già processata'
    }
  }
  
  // Aggiorna status
  request.status = status
  if (status === 'APPROVED') {
    request.approvedBy = approverId
    request.approvedAt = new Date()
  } else {
    request.rejectedBy = approverId
    request.rejectedAt = new Date()
    request.rejectionReason = comment
  }
  
  return {
    success: true
  }
}
