import type { PendingInvite } from '@prisma/client'

export const INVITE_EXPIRY_DAYS = 7

/** Token monouso URL-safe (64 caratteri esadecimali). */
export function generateInviteToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
}

export function inviteExpiryDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}

export function isPendingInviteUsable(
  invite: Pick<PendingInvite, 'acceptedAt' | 'expiresAt'>,
  now: Date = new Date()
): boolean {
  if (invite.acceptedAt) return false
  if (invite.expiresAt.getTime() <= now.getTime()) return false
  return true
}

export function serializePendingInvite(invite: PendingInvite) {
  return {
    id: invite.id,
    firstName: invite.firstName,
    lastName: invite.lastName,
    name: `${invite.firstName} ${invite.lastName}`.trim(),
    email: invite.email,
    role: invite.role,
    department: invite.department,
    position: invite.position,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
    pending: !invite.acceptedAt && invite.expiresAt.getTime() > Date.now(),
  }
}
