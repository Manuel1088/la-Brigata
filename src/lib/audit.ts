// Sistema di Audit Trail per La Brigata
// Traccia tutte le azioni degli utenti per sicurezza e compliance

export interface AuditLogEntry {
  id?: string
  userId: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'REJECT'
  resource: string // users, tips, shifts, reports, etc.
  resourceId?: string
  details?: string // JSON con dettagli dell'azione
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

// Mock database per audit logs (in produzione sarà un database reale)
let auditLogs: AuditLogEntry[] = []

// Funzione per loggare un'azione
export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
  const auditEntry: AuditLogEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  }

  // In produzione, salvare nel database
  auditLogs.push(auditEntry)
  
  // Log anche in console per debug
  console.log('🔍 AUDIT LOG:', {
    user: entry.userId,
    action: entry.action,
    resource: entry.resource,
    timestamp: auditEntry.timestamp
  })
}

// Funzioni di convenienza per azioni comuni
export async function logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditAction({
    userId,
    action: 'LOGIN',
    resource: 'auth',
    ipAddress,
    userAgent
  })
}

export async function logLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditAction({
    userId,
    action: 'LOGOUT',
    resource: 'auth',
    ipAddress,
    userAgent
  })
}

export async function logCreate(userId: string, resource: string, resourceId: string, details?: any): Promise<void> {
  await logAuditAction({
    userId,
    action: 'CREATE',
    resource,
    resourceId,
    details: details ? JSON.stringify(details) : undefined
  })
}

export async function logUpdate(userId: string, resource: string, resourceId: string, details?: any): Promise<void> {
  await logAuditAction({
    userId,
    action: 'UPDATE',
    resource,
    resourceId,
    details: details ? JSON.stringify(details) : undefined
  })
}

export async function logDelete(userId: string, resource: string, resourceId: string, details?: any): Promise<void> {
  await logAuditAction({
    userId,
    action: 'DELETE',
    resource,
    resourceId,
    details: details ? JSON.stringify(details) : undefined
  })
}

export async function logRead(userId: string, resource: string, resourceId?: string): Promise<void> {
  await logAuditAction({
    userId,
    action: 'READ',
    resource,
    resourceId
  })
}

export async function logExport(userId: string, resource: string, format: string, recordCount?: number): Promise<void> {
  await logAuditAction({
    userId,
    action: 'EXPORT',
    resource,
    details: JSON.stringify({ format, recordCount })
  })
}

export async function logApprove(userId: string, resource: string, resourceId: string, details?: any): Promise<void> {
  await logAuditAction({
    userId,
    action: 'APPROVE',
    resource,
    resourceId,
    details: details ? JSON.stringify(details) : undefined
  })
}

export async function logReject(userId: string, resource: string, resourceId: string, details?: any): Promise<void> {
  await logAuditAction({
    userId,
    action: 'REJECT',
    resource,
    resourceId,
    details: details ? JSON.stringify(details) : undefined
  })
}

// Funzioni per recuperare i log
export async function getAuditLogs(filters?: {
  userId?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<AuditLogEntry[]> {
  let filteredLogs = [...auditLogs]

  if (filters) {
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
    }
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action)
    }
    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource)
    }
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp && log.timestamp >= filters.startDate!
      )
    }
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp && log.timestamp <= filters.endDate!
      )
    }
  }

  // Ordina per timestamp decrescente
  filteredLogs.sort((a, b) => 
    (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
  )

  if (filters?.limit) {
    filteredLogs = filteredLogs.slice(0, filters.limit)
  }

  return filteredLogs
}

// Statistiche audit
export async function getAuditStats(): Promise<{
  totalLogs: number
  logsToday: number
  logsThisWeek: number
  logsThisMonth: number
  topActions: { action: string, count: number }[]
  topUsers: { userId: string, count: number }[]
  topResources: { resource: string, count: number }[]
}> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const logsToday = auditLogs.filter(log => 
    log.timestamp && log.timestamp >= today
  ).length

  const logsThisWeek = auditLogs.filter(log => 
    log.timestamp && log.timestamp >= weekAgo
  ).length

  const logsThisMonth = auditLogs.filter(log => 
    log.timestamp && log.timestamp >= monthAgo
  ).length

  // Top actions
  const actionCounts: Record<string, number> = {}
  auditLogs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
  })
  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Top users
  const userCounts: Record<string, number> = {}
  auditLogs.forEach(log => {
    userCounts[log.userId] = (userCounts[log.userId] || 0) + 1
  })
  const topUsers = Object.entries(userCounts)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Top resources
  const resourceCounts: Record<string, number> = {}
  auditLogs.forEach(log => {
    resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
  })
  const topResources = Object.entries(resourceCounts)
    .map(([resource, count]) => ({ resource, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalLogs: auditLogs.length,
    logsToday,
    logsThisWeek,
    logsThisMonth,
    topActions,
    topUsers,
    topResources
  }
}

// Funzione per ottenere informazioni utente per i log
export function getUserDisplayInfo(userId: string): { name: string, role: string, avatar: string } {
  // Mock data - in produzione verrà dal database
  const userMap: Record<string, { name: string, role: string, avatar: string }> = {
    '1': { name: 'Admin Proprietario', role: 'PROPRIETARIO', avatar: '👑' },
    '2': { name: 'Marco Direttore', role: 'DIRETTORE', avatar: '👔' },
    '3': { name: 'Anna Manager', role: 'MANAGER', avatar: '📊' },
    '4': { name: 'Luca Cassiere', role: 'CASSIERE', avatar: '💰' },
    '5': { name: 'Sofia Dipendente', role: 'DIPENDENTE', avatar: '👤' }
  }
  
  return userMap[userId] || { name: 'Utente Sconosciuto', role: 'UNKNOWN', avatar: '👤' }
}
