'use client'
import { useCallback } from 'react'
import { 
  createNotification,
  createLeaveRequestNotification,
  createShiftCoverageNotification,
  createTipsCompletedNotification,
  createLeaveProposalNotification,
  createProposalAcceptedNotification,
  createProposalRejectedNotification,
  NotificationType,
  NotificationCategory
} from '@/lib/notifications'

export const useNotifications = () => {
  // Notifiche per sistema ferie
  const notifyLeaveRequest = useCallback((employeeName: string, days: number, startDate: string, endDate: string) => {
    return createLeaveRequestNotification(employeeName, days, startDate, endDate)
  }, [])

  const notifyLeaveApproved = useCallback((employeeName: string, days: number) => {
    return createNotification({
      type: 'SUCCESS',
      category: 'LEAVES',
      title: 'Richiesta ferie approvata',
      message: `${employeeName}: ${days} giorni di ferie approvati`,
      isUrgent: false,
      actions: [
        { label: 'Visualizza', action: 'view_approved_leave', variant: 'primary', icon: '👁️' }
      ],
      metadata: { employeeName, days }
    })
  }, [])

  const notifyLeaveProposed = useCallback((employeeName: string, startDate: string, endDate: string, comment?: string) => {
    return createLeaveProposalNotification(employeeName, startDate, endDate, comment)
  }, [])

  const notifyProposalAccepted = useCallback((employeeName: string, startDate: string, endDate: string) => {
    return createProposalAcceptedNotification(employeeName, startDate, endDate)
  }, [])

  const notifyProposalRejected = useCallback((employeeName: string, reason?: string) => {
    return createProposalRejectedNotification(employeeName, reason)
  }, [])

  const notifyLeaveRejected = useCallback((employeeName: string, reason?: string) => {
    return createNotification({
      type: 'WARNING',
      category: 'LEAVES',
      title: 'Richiesta ferie rifiutata',
      message: `${employeeName}: Richiesta rifiutata${reason ? ` - ${reason}` : ''}`,
      isUrgent: false,
      metadata: { employeeName, reason }
    })
  }, [])

  // Notifiche per sistema turni
  const notifyShiftCoverage = useCallback((shiftDate: string, shiftTime: string, department: string, reason: string) => {
    return createShiftCoverageNotification(shiftDate, shiftTime, department, reason)
  }, [])

  const notifyShiftAssigned = useCallback((employeeName: string, shiftDate: string, shiftTime: string) => {
    return createNotification({
      type: 'SUCCESS',
      category: 'SHIFTS',
      title: 'Turno assegnato',
      message: `${employeeName}: ${shiftDate} alle ${shiftTime}`,
      isUrgent: false,
      actions: [
        { label: 'Visualizza Turno', action: 'view_shift', variant: 'primary', icon: '👁️' }
      ],
      metadata: { employeeName, shiftDate, shiftTime }
    })
  }, [])

  // Notifiche per sistema mance
  const notifyTipsCompleted = useCallback((amount: number, employeeCount: number, date: string) => {
    return createTipsCompletedNotification(amount, employeeCount, date)
  }, [])

  const notifyTipsError = useCallback((error: string) => {
    return createNotification({
      type: 'ERROR',
      category: 'TIPS',
      title: 'Errore divisione mance',
      message: error,
      isUrgent: false,
      actions: [
        { label: 'Riprova', action: 'retry_tips', variant: 'primary', icon: '🔄' },
        { label: 'Supporto', action: 'support', variant: 'secondary', icon: '🛠️' }
      ],
      metadata: { error }
    })
  }, [])

  // Notifiche per sistema personale
  const notifyNewEmployee = useCallback((employeeName: string, department: string) => {
    return createNotification({
      type: 'INFO',
      category: 'PERSONNEL',
      title: 'Nuovo dipendente aggiunto',
      message: `${employeeName} è stato aggiunto al team ${department}`,
      isUrgent: false,
      actions: [
        { label: 'Visualizza Profilo', action: 'view_profile', variant: 'primary', icon: '👤' }
      ],
      metadata: { employeeName, department }
    })
  }, [])

  const notifyEmployeeUpdated = useCallback((employeeName: string, changes: string[]) => {
    return createNotification({
      type: 'INFO',
      category: 'PERSONNEL',
      title: 'Profilo dipendente aggiornato',
      message: `${employeeName}: ${changes.join(', ')}`,
      isUrgent: false,
      actions: [
        { label: 'Visualizza Modifiche', action: 'view_changes', variant: 'primary', icon: '👁️' }
      ],
      metadata: { employeeName, changes: changes.join(', ') }
    })
  }, [])

  // Notifiche per sistema
  const notifySystemError = useCallback((error: string, component: string) => {
    return createNotification({
      type: 'ERROR',
      category: 'SYSTEM',
      title: 'Errore di sistema',
      message: `${component}: ${error}`,
      isUrgent: false,
      actions: [
        { label: 'Riprova', action: 'retry_system', variant: 'primary', icon: '🔄' },
        { label: 'Supporto Tecnico', action: 'tech_support', variant: 'secondary', icon: '🛠️' }
      ],
      metadata: { error, component }
    })
  }, [])

  const notifySystemSuccess = useCallback((message: string, component: string) => {
    return createNotification({
      type: 'SUCCESS',
      category: 'SYSTEM',
      title: 'Operazione completata',
      message: `${component}: ${message}`,
      isUrgent: false,
      metadata: { message, component }
    })
  }, [])

  // Notifiche di emergenza
  const notifyEmergency = useCallback((title: string, message: string, actions?: Array<{ label: string; action: string; variant?: 'primary'|'secondary'|'danger'; icon?: string }>) => {
    return createNotification({
      type: 'URGENT',
      category: 'ALERT',
      title,
      message,
      isUrgent: true,
      actions: actions || [
        { label: 'Gestisci', action: 'handle_emergency', variant: 'primary', icon: '🚨' }
      ]
    })
  }, [])

  // Notifiche personalizzate
  const notifyCustom = useCallback((
    type: NotificationType,
    category: NotificationCategory,
    title: string,
    message: string,
    isUrgent: boolean = false,
    actions?: Array<{ label: string; action: string; variant?: 'primary'|'secondary'|'danger'; icon?: string }>
  ) => {
    return createNotification({
      type,
      category,
      title,
      message,
      isUrgent,
      actions
    })
  }, [])

  return {
    // Ferie
    notifyLeaveRequest,
    notifyLeaveApproved,
    notifyLeaveRejected,
    notifyLeaveProposed,
    notifyProposalAccepted,
    notifyProposalRejected,
    
    // Turni
    notifyShiftCoverage,
    notifyShiftAssigned,
    
    // Mance
    notifyTipsCompleted,
    notifyTipsError,
    
    // Personale
    notifyNewEmployee,
    notifyEmployeeUpdated,
    
    // Sistema
    notifySystemError,
    notifySystemSuccess,
    
    // Emergenze
    notifyEmergency,
    
    // Personalizzate
    notifyCustom
  }
}
