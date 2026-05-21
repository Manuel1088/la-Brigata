'use client'
import { useState, useEffect, useCallback } from 'react'

interface NotificationBadgeProps {
  userId?: string
  onClick: () => void
  className?: string
}

export function NotificationBadge({
  userId,
  onClick,
  className = '',
}: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [urgentCount, setUrgentCount] = useState(0)

  const updateCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (!res.ok) {
        setUnreadCount(0)
        setUrgentCount(0)
        return
      }
      const data = await res.json()
      const list = (data.notifications ?? []) as Array<{
        userId?: string
        isRead: boolean
        isUrgent: boolean
      }>
      const mine = userId
        ? list.filter((n) => !n.userId || n.userId === userId)
        : list
      setUnreadCount(mine.filter((n) => !n.isRead).length)
      setUrgentCount(mine.filter((n) => n.isUrgent && !n.isRead).length)
    } catch {
      setUnreadCount(0)
      setUrgentCount(0)
    }
  }, [userId])

  useEffect(() => {
    void updateCounts()
    const interval = setInterval(() => void updateCounts(), 30000)
    const onUpdate = () => void updateCounts()
    window.addEventListener('notifications_updated', onUpdate)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notifications_updated', onUpdate)
    }
  }, [updateCounts])

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      title={`${unreadCount} notifiche non lette${urgentCount > 0 ? `, ${urgentCount} urgenti` : ''}`}
    >
      <span className="text-2xl">🔔</span>

      {unreadCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 text-xs font-bold text-white rounded-full flex items-center justify-center ${
            urgentCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {urgentCount > 0 && unreadCount === 0 && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  )
}
