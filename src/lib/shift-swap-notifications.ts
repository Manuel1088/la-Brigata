import { persistNotification } from '@/lib/notifications-db'
import { formatSwapDayIt } from '@/lib/shift-swap-status'

export function buildPeerSwapRequestMessage(opts: {
  requesterName: string
  dateIso: string
  targetShiftTime: string
  offeredShiftTime: string
}): string {
  const day = formatSwapDayIt(opts.dateIso)
  return (
    `${opts.requesterName} vuole cambiare turno con te il ${day}. ` +
    `Il tuo turno: ${opts.targetShiftTime}, il suo: ${opts.offeredShiftTime}. Accetti?`
  )
}

export async function notifyPeerSwapRequest(opts: {
  targetUserId: string
  requesterName: string
  swapId: string
  restaurantId: string
  dateIso: string
  targetShiftTime: string
  offeredShiftTime: string
}): Promise<void> {
  await persistNotification({
    type: 'INFO',
    category: 'SHIFTS',
    title: 'Richiesta cambio turno',
    message: buildPeerSwapRequestMessage(opts),
    isUrgent: false,
    userId: opts.targetUserId,
    metadata: {
      swapId: opts.swapId,
      restaurantId: opts.restaurantId,
      category: 'shift_swap_peer',
    },
  })
}

export async function notifySwapRejectedByPeer(opts: {
  requesterUserId: string
  targetName: string
  dateIso: string
  swapId: string
}): Promise<void> {
  const day = formatSwapDayIt(opts.dateIso)
  await persistNotification({
    type: 'WARNING',
    category: 'SHIFTS',
    title: 'Cambio turno rifiutato',
    message: `${opts.targetName} ha rifiutato la richiesta di cambio turno per ${day}.`,
    isUrgent: false,
    userId: opts.requesterUserId,
    metadata: {
      swapId: opts.swapId,
      category: 'shift_swap_rejected',
    },
  })
}

export async function notifySwapAcceptedByPeer(opts: {
  requesterUserId: string
  targetName: string
  dateIso: string
}): Promise<void> {
  const day = formatSwapDayIt(opts.dateIso)
  await persistNotification({
    type: 'SUCCESS',
    category: 'SHIFTS',
    title: 'Collega ha accettato',
    message: `${opts.targetName} ha accettato il cambio turno del ${day}. In attesa di approvazione del manager.`,
    isUrgent: false,
    userId: opts.requesterUserId,
    metadata: {
      category: 'shift_swap_peer_accepted',
    },
  })
}
