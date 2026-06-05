import { persistNotification } from '@/lib/notifications-db'

export async function notifyCandidateApproved(opts: { userId: string }): Promise<void> {
  await persistNotification({
    type: 'SUCCESS',
    category: 'MESSAGES',
    title: 'Candidatura approvata',
    message: 'La tua candidatura è stata approvata, benvenuto/a nel team!',
    isUrgent: false,
    userId: opts.userId,
  })
}

export async function notifyCandidateRejected(opts: {
  userId: string
  reason?: string | null
}): Promise<void> {
  const reason = opts.reason?.trim()
  const message = reason
    ? `La tua candidatura non è stata accettata. Motivo: ${reason}`
    : 'La tua candidatura non è stata accettata.'
  await persistNotification({
    type: 'WARNING',
    category: 'MESSAGES',
    title: 'Candidatura non accettata',
    message,
    isUrgent: false,
    userId: opts.userId,
  })
}
