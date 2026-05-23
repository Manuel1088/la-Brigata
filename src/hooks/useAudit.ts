'use client'

import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import type { ClientAuditPayload } from '@/lib/audit-types'

async function postAuditEntry(payload: ClientAuditPayload): Promise<void> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.warn(
        'Audit log non salvato:',
        (data as { error?: string }).error ?? res.statusText
      )
    }
  } catch (err) {
    console.warn('Audit log request failed:', err)
  }
}

function detailsJson(details?: unknown): string | undefined {
  if (details === undefined || details === null) return undefined
  return typeof details === 'string' ? details : JSON.stringify(details)
}

export function useAudit() {
  const { data: session } = useSession()

  const userId = session?.user?.id

  const logAction = useCallback(
    async (entry: ClientAuditPayload) => {
      if (!userId) return
      await postAuditEntry(entry)
    },
    [userId]
  )

  const logUserLogin = useCallback(async () => {
    if (!userId) return
    await postAuditEntry({ action: 'LOGIN', resource: 'auth' })
  }, [userId])

  const logUserLogout = useCallback(async () => {
    if (!userId) return
    await postAuditEntry({ action: 'LOGOUT', resource: 'auth' })
  }, [userId])

  const logCreateAction = useCallback(
    async (resource: string, resourceId: string, details?: unknown) => {
      if (!userId) return
      await postAuditEntry({
        action: 'CREATE',
        resource,
        resourceId,
        details: detailsJson(details),
      })
    },
    [userId]
  )

  const logUpdateAction = useCallback(
    async (resource: string, resourceId: string, details?: unknown) => {
      if (!userId) return
      await postAuditEntry({
        action: 'UPDATE',
        resource,
        resourceId,
        details: detailsJson(details),
      })
    },
    [userId]
  )

  const logDeleteAction = useCallback(
    async (resource: string, resourceId: string, details?: unknown) => {
      if (!userId) return
      await postAuditEntry({
        action: 'DELETE',
        resource,
        resourceId,
        details: detailsJson(details),
      })
    },
    [userId]
  )

  const logReadAction = useCallback(
    async (resource: string, resourceId?: string) => {
      if (!userId) return
      await postAuditEntry({
        action: 'READ',
        resource,
        resourceId,
      })
    },
    [userId]
  )

  const logExportAction = useCallback(
    async (resource: string, format: string, recordCount?: number) => {
      if (!userId) return
      await postAuditEntry({
        action: 'EXPORT',
        resource,
        details: JSON.stringify({ format, recordCount }),
      })
    },
    [userId]
  )

  const logApproveAction = useCallback(
    async (resource: string, resourceId: string, details?: unknown) => {
      if (!userId) return
      await postAuditEntry({
        action: 'APPROVE',
        resource,
        resourceId,
        details: detailsJson(details),
      })
    },
    [userId]
  )

  const logRejectAction = useCallback(
    async (resource: string, resourceId: string, details?: unknown) => {
      if (!userId) return
      await postAuditEntry({
        action: 'REJECT',
        resource,
        resourceId,
        details: detailsJson(details),
      })
    },
    [userId]
  )

  const getLogs = useCallback(
    async (filters?: {
      userId?: string
      action?: string
      resource?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    }) => {
      const params = new URLSearchParams()
      if (filters?.userId) params.set('userId', filters.userId)
      if (filters?.action) params.set('action', filters.action)
      if (filters?.limit) params.set('limit', String(filters.limit))
      const qs = params.toString()
      const res = await fetch(`/api/audit/logs${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      if (!res.ok) return []
      const data = (await res.json()) as { logs?: unknown[] }
      return data.logs ?? []
    },
    []
  )

  const getStats = useCallback(async () => {
    const logs = await getLogs({ limit: 500 })
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    type LogRow = { action?: string; userId?: string; resource?: string; timestamp?: string }
    const rows = logs as LogRow[]

    const parseTime = (ts?: string) => (ts ? new Date(ts).getTime() : 0)

    const logsToday = rows.filter(
      (l) => parseTime(l.timestamp) >= today.getTime()
    ).length
    const logsThisWeek = rows.filter(
      (l) => parseTime(l.timestamp) >= weekAgo.getTime()
    ).length
    const logsThisMonth = rows.filter(
      (l) => parseTime(l.timestamp) >= monthAgo.getTime()
    ).length

    const topN = (field: 'action' | 'userId' | 'resource') => {
      const counts: Record<string, number> = {}
      for (const row of rows) {
        const v = row[field]
        if (!v) continue
        counts[v] = (counts[v] ?? 0) + 1
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) =>
          field === 'action'
            ? { action: name, count }
            : field === 'userId'
              ? { userId: name, count }
              : { resource: name, count }
        )
    }

    return {
      totalLogs: rows.length,
      logsToday,
      logsThisWeek,
      logsThisMonth,
      topActions: topN('action') as { action: string; count: number }[],
      topUsers: topN('userId') as { userId: string; count: number }[],
      topResources: topN('resource') as { resource: string; count: number }[],
    }
  }, [getLogs])

  return {
    userId,
    isAuthenticated: !!session,

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

    getLogs,
    getStats,
  }
}
