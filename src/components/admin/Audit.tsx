'use client'
import { useEffect, useState } from 'react'
import { useAudit } from '@/hooks/useAudit'

interface AuditLog {
  id: string
  action: string
  user: string
  userId: string
  timestamp: Date
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

interface AuditStats {
  totalLogs: number
  todayLogs: number
  uniqueUsers: number
  topActions: Array<{ action: string; count: number }>
  recentActivity: AuditLog[]
}

export default function AdminAudit() {
  const { getLogs, getStats } = useAudit()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  useEffect(() => {
    loadAuditData()
  }, [])

  const loadAuditData = async () => {
    try {
      const [logsData, statsData] = await Promise.all([
        getLogs({ limit: 100 }),
        getStats()
      ])
      
      setLogs(logsData)
      setStats(statsData)
    } catch (error) {
      console.error('Errore nel caricamento audit:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesUser = userFilter === 'all' || log.userId === userFilter
    const matchesDate = dateFilter === 'all' || {
      'today': isToday(log.timestamp),
      'week': isThisWeek(log.timestamp),
      'month': isThisMonth(log.timestamp)
    }[dateFilter] || false
    
    return matchesSearch && matchesAction && matchesUser && matchesDate
  })

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isThisWeek = (date: Date) => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo
  }

  const isThisMonth = (date: Date) => {
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString('it-IT')
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return 'Ora'
    if (minutes < 60) return `${minutes}m fa`
    if (hours < 24) return `${hours}h fa`
    return `${days}g fa`
  }

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return '🔐'
    if (action.includes('logout')) return '🚪'
    if (action.includes('create')) return '➕'
    if (action.includes('update') || action.includes('edit')) return '✏️'
    if (action.includes('delete')) return '🗑️'
    if (action.includes('approve')) return '✅'
    if (action.includes('reject')) return '❌'
    if (action.includes('export')) return '📤'
    if (action.includes('import')) return '📥'
    return '📋'
  }

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'bg-green-100 text-green-800'
    if (action.includes('logout')) return 'bg-gray-100 text-gray-800'
    if (action.includes('create')) return 'bg-blue-100 text-blue-800'
    if (action.includes('update') || action.includes('edit')) return 'bg-yellow-100 text-yellow-800'
    if (action.includes('delete')) return 'bg-red-100 text-red-800'
    if (action.includes('approve')) return 'bg-green-100 text-green-800'
    if (action.includes('reject')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort()
  const uniqueUsers = Array.from(new Set(logs.map(log => log.user))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-xl text-gray-700">Caricamento audit log...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats?.totalLogs || 0}</div>
          <div className="text-sm text-blue-700">Log Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.todayLogs || 0}</div>
          <div className="text-sm text-green-700">Oggi</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats?.uniqueUsers || 0}</div>
          <div className="text-sm text-purple-700">Utenti Attivi</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{uniqueActions.length}</div>
          <div className="text-sm text-orange-700">Azioni Diverse</div>
        </div>
      </div>

      {/* Top Azioni */}
      {stats?.topActions && stats.topActions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Azioni Più Frequenti</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topActions.slice(0, 6).map((action, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getActionIcon(action.action)}</div>
                  <div>
                    <div className="font-medium text-gray-900">{action.action}</div>
                    <div className="text-2xl font-bold text-blue-600">{action.count}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Azione, utente o dettagli..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Azione</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option key="all" value="all">Tutte</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Utente</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option key="all" value="all">Tutti</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Periodo</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option key="all" value="all">Tutto</option>
              <option key="today" value="today">Oggi</option>
              <option key="week" value="week">Questa settimana</option>
              <option key="month" value="month">Questo mese</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Log */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Log di Audit</h3>
            <button
              onClick={loadAuditData}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
          
          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-gray-500">Nessun log trovato</p>
                <p className="text-sm text-gray-400 mt-1">Modifica i filtri per vedere più risultati</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">{getActionIcon(log.action)}</div>
                        <div>
                          <h4 className="font-medium text-gray-900">{log.action}</h4>
                          <p className="text-sm text-gray-600">da {log.user}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mb-2">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                              Dettagli
                            </summary>
                            <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>🕒 {formatDate(log.timestamp)} ({formatRelativeTime(log.timestamp)})</span>
                        {log.ipAddress && <span>🌐 {log.ipAddress}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
