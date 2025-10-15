'use client'
import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { 
  logAuditAction, 
  logLogin, 
  logLogout, 
  logCreate, 
  logUpdate, 
  logDelete, 
  logRead, 
  logExport, 
  logApprove, 
  logReject,
  getAuditLogs,
  getAuditStats,
  AuditLogEntry
} from '@/lib/audit'

export function useAudit() {
  const { data: session } = useSession()
  
  const userId = session?.user?.id

  // Funzione base per loggare azioni
  const logAction = useCallback(async (entry: Omit<AuditLogEntry, 'userId'>) => {
    if (!userId) return
    
    await logAuditAction({
      ...entry,
      userId
    })
  }, [userId])

  // Funzioni di convenienza
  const logUserLogin = useCallback(async () => {
    if (!userId) return
    await logLogin(userId)
  }, [userId])

  const logUserLogout = useCallback(async () => {
    if (!userId) return
    await logLogout(userId)
  }, [userId])

  const logCreateAction = useCallback(async (resource: string, resourceId: string, details?: unknown) => {
    if (!userId) return
    await logCreate(userId, resource, resourceId, details)
  }, [userId])

  const logUpdateAction = useCallback(async (resource: string, resourceId: string, details?: unknown) => {
    if (!userId) return
    await logUpdate(userId, resource, resourceId, details)
  }, [userId])

  const logDeleteAction = useCallback(async (resource: string, resourceId: string, details?: unknown) => {
    if (!userId) return
    await logDelete(userId, resource, resourceId, details)
  }, [userId])

  const logReadAction = useCallback(async (resource: string, resourceId?: string) => {
    if (!userId) return
    await logRead(userId, resource, resourceId)
  }, [userId])

  const logExportAction = useCallback(async (resource: string, format: string, recordCount?: number) => {
    if (!userId) return
    await logExport(userId, resource, format, recordCount)
  }, [userId])

  const logApproveAction = useCallback(async (resource: string, resourceId: string, details?: unknown) => {
    if (!userId) return
    await logApprove(userId, resource, resourceId, details)
  }, [userId])

  const logRejectAction = useCallback(async (resource: string, resourceId: string, details?: unknown) => {
    if (!userId) return
    await logReject(userId, resource, resourceId, details)
  }, [userId])

  // Funzioni per recuperare dati
  const getLogs = useCallback(async (filters?: {
    userId?: string
    action?: string
    resource?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }) => {
    return await getAuditLogs(filters)
  }, [])

  const getStats = useCallback(async () => {
    return await getAuditStats()
  }, [])

  return {
    // Stato
    userId,
    isAuthenticated: !!session,
    
    // Funzioni di logging
    logAction,
    logUserLogin,
    logUserLogout,
    logCreateAction,
    logUpdateAction,
    logDeleteAction,
    logReadAction,
    logExportAction,
    logApproveAction,
    logRejectAction,
    
    // Funzioni di recupero dati
    getLogs,
    getStats
  }
}
