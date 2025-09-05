'use client'
import { useState, useEffect } from 'react'
import { getUnreadCount, getUrgentCount } from '@/lib/notifications'

interface NotificationBadgeProps {
  userId?: string
  onClick: () => void
  className?: string
}

export function NotificationBadge({ userId, onClick, className = '' }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [urgentCount, setUrgentCount] = useState(0)

  useEffect(() => {
    const updateCounts = () => {
      setUnreadCount(getUnreadCount(userId))
      setUrgentCount(getUrgentCount(userId))
    }

    updateCounts()
    
    // Aggiorna i conteggi ogni 30 secondi
    const interval = setInterval(updateCounts, 30000)
    
    return () => clearInterval(interval)
  }, [userId])

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      title={`${unreadCount} notifiche non lette${urgentCount > 0 ? `, ${urgentCount} urgenti` : ''}`}
    >
      <span className="text-2xl">🔔</span>
      
      {/* Badge conteggio */}
      {unreadCount > 0 && (
        <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 text-xs font-bold text-white rounded-full flex items-center justify-center ${
          urgentCount > 0 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-blue-500'
        }`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Indicatore urgente */}
      {urgentCount > 0 && unreadCount === 0 && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
      )}
    </button>
  )
}
