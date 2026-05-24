import type { Notification, NotificationCategory } from '@/lib/notifications'

/** Stesso filtro usato da NotificationCenter (badge e pannello devono coincidere). */
export function filterNotificationsByRole(
  list: Notification[],
  userId: string | undefined,
  userRole: string,
  department: string
): Notification[] {
  const dept = (department ?? '').toLowerCase()
  const role = (userRole ?? '').toUpperCase()

  return list.filter((n) => {
    if (n.userId && userId && n.userId !== userId) return false

    if (['PROPRIETARIO', 'MANAGER', 'DIRETTORE', 'ADMIN'].includes(role)) {
      if (n.category === 'SHIFTS' && n.metadata?.department) {
        return String(n.metadata.department).toLowerCase() === dept
      }
      return true
    }

    const allowedCategories: NotificationCategory[] = [
      'LEAVES',
      'SHIFTS',
      'TIPS',
      'MESSAGES',
    ]
    if (!allowedCategories.includes(n.category)) return false
    if (n.metadata?.department) {
      return String(n.metadata.department).toLowerCase() === dept
    }
    return true
  })
}

export function countUnreadAfterRoleFilter(
  list: Notification[],
  userId: string | undefined,
  userRole: string,
  department: string
): number {
  return filterNotificationsByRole(list, userId, userRole, department).filter(
    (n) => !n.isRead
  ).length
}
