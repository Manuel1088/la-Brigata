import type { InviteCode } from '@prisma/client'

// Caratteri senza ambiguità (niente 0/O/1/I/L) per codici leggibili
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const INVITE_CODE_LENGTH = 8
export const INVITE_DEFAULT_MAX_USES = 50
export const INVITE_EXPIRY_DAYS = 7

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export type InviteCodeStatus = 'active' | 'expired' | 'exhausted' | 'revoked'

export function inviteCodeStatus(
  code: Pick<InviteCode, 'isActive' | 'expiresAt' | 'maxUses' | 'usedCount'>,
  now: Date = new Date()
): InviteCodeStatus {
  if (!code.isActive) return 'revoked'
  if (code.expiresAt.getTime() <= now.getTime()) return 'expired'
  if (code.usedCount >= code.maxUses) return 'exhausted'
  return 'active'
}

export function isInviteCodeUsable(
  code: Pick<InviteCode, 'isActive' | 'expiresAt' | 'maxUses' | 'usedCount'>,
  now: Date = new Date()
): boolean {
  return inviteCodeStatus(code, now) === 'active'
}

export function serializeInviteCode(code: InviteCode) {
  return {
    id: code.id,
    code: code.code,
    companyId: code.companyId,
    restaurantId: code.restaurantId,
    expiresAt: code.expiresAt.toISOString(),
    maxUses: code.maxUses,
    usedCount: code.usedCount,
    isActive: code.isActive,
    status: inviteCodeStatus(code),
    createdAt: code.createdAt.toISOString(),
  }
}
