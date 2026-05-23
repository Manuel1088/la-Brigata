/** Tipi condivisi audit (safe per import client). */

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'

export interface AuditLogEntry {
  id?: string
  userId: string
  action: AuditAction
  resource: string
  resourceId?: string
  details?: string
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export type ClientAuditPayload = Omit<
  AuditLogEntry,
  'userId' | 'id' | 'timestamp'
>
