import type { LeaveType, PrismaClient } from '@prisma/client'
import {
  LEGACY_LEAVE_TYPE_DEFINITIONS,
  LEAVE_TYPE_DEFINITIONS,
  type LeaveTypeId,
} from '@/lib/leave-types'
import { dateFromIso, toDateOnlyIso } from '@/lib/shifts'

export { LEAVE_TYPE_LABELS, SUPPORTED_LEAVE_TYPES } from '@/lib/leave-types'

export const LEAVE_APPROVER_ROLES = new Set([
  'ADMIN',
  'MANAGER',
  'PROPRIETARIO',
  'DIRETTORE',
  'RESTAURANT_MANAGER',
])

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'In attesa',
  APPROVED: 'Approvata',
  REJECTED: 'Rifiutata',
  CANCELLED: 'Annullata',
  EXPIRED: 'Scaduta',
}

/** Tipi con saldo (fonte unica: tracksBalance), incluso PAID_LEAVE legacy. */
const BALANCE_TRACKED_LEAVE_TYPES = [
  ...LEAVE_TYPE_DEFINITIONS,
  ...LEGACY_LEAVE_TYPE_DEFINITIONS,
]
  .filter((d) => d.tracksBalance)
  .map((d) => d.id) as LeaveType[]

type LeaveEntitlementTotals = {
  vacationDays: number
  rolHours: number
  paidLeaveDays: number
  parentalDays: number
  unionDays: number
}

function balanceTotalForType(
  type: LeaveTypeId,
  entitlement: LeaveEntitlementTotals
): number | null {
  switch (type) {
    case 'VACATION':
      return entitlement.vacationDays
    case 'ROL':
      return entitlement.rolHours
    case 'PAID_LEAVE':
      return entitlement.paidLeaveDays
    case 'SICK_LEAVE':
      return 180
    case 'PARENTAL_LEAVE':
      return entitlement.parentalDays
    case 'UNION_LEAVE':
      return entitlement.unionDays
    default:
      return null
  }
}

export type LeaveBalanceDto = {
  type: string
  total: number
  used: number
  remaining: number
  percentage: number
}

export type LeaveRequestDto = {
  id: string
  userId: string
  userName: string
  userDepartment: string | null
  startDate: string
  endDate: string
  type: string
  reason: string | null
  status: string
  isUrgent: boolean
  attachment: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

export function countInclusiveDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const diff = end.getTime() - start.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / 86400000) + 1
}

export function isLeaveApprover(role: string): boolean {
  return LEAVE_APPROVER_ROLES.has(role)
}

export async function ensureLeaveEntitlementAndBalances(
  prisma: PrismaClient,
  userId: string,
  year: number
): Promise<void> {
  const entitlement = await prisma.leaveEntitlement.upsert({
    where: { userId_year: { userId, year } },
    create: {
      id: crypto.randomUUID(),
      userId,
      year,
      vacationDays: 26,
      rolHours: 32,
      paidLeaveDays: 3,
      unpaidLeaveDays: 30,
      parentalDays: 180,
      studyDays: 150,
      unionDays: 8,
    },
    update: {},
  })

  const specs: Array<{ type: LeaveType; total: number }> = []

  for (const def of [...LEAVE_TYPE_DEFINITIONS, ...LEGACY_LEAVE_TYPE_DEFINITIONS]) {
    if (!def.tracksBalance) continue
    const total = balanceTotalForType(def.id, entitlement)
    if (total === null) continue
    specs.push({ type: def.id as LeaveType, total })
  }

  for (const spec of specs) {
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        userId_year_type: {
          userId,
          year,
          type: spec.type,
        },
      },
    })
    if (!existing) {
      await prisma.leaveBalance.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          year,
          type: spec.type,
          total: spec.total,
          used: 0,
          remaining: spec.total,
        },
      })
    }
  }
}

export async function getLeaveBalancesForUser(
  prisma: PrismaClient,
  userId: string,
  year: number
): Promise<LeaveBalanceDto[]> {
  await ensureLeaveEntitlementAndBalances(prisma, userId, year)

  const rows = await prisma.leaveBalance.findMany({
    where: {
      userId,
      year,
      type: { in: BALANCE_TRACKED_LEAVE_TYPES },
    },
  })

  return rows.map((b) => ({
    type: b.type,
    total: b.total,
    used: b.used,
    remaining: b.remaining,
    percentage: b.total > 0 ? Math.round((b.remaining / b.total) * 100) : 0,
  }))
}

export async function applyApprovedLeaveToBalance(
  prisma: PrismaClient,
  userId: string,
  type: LeaveType,
  startDate: Date,
  endDate: Date
): Promise<void> {
  const year = startDate.getFullYear()
  await ensureLeaveEntitlementAndBalances(prisma, userId, year)

  const days = countInclusiveDays(startDate, endDate)
  if (days <= 0) return

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      userId_year_type: { userId, year, type },
    },
  })
  if (!balance) return

  const used = Math.min(balance.total, balance.used + days)
  const remaining = Math.max(0, balance.total - used)

  await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: { used, remaining },
  })
}

export function serializeLeaveRequest(row: {
  id: string
  userId: string
  startDate: Date
  endDate: Date
  type: LeaveType
  reason: string | null
  status: string
  isUrgent: boolean
  attachment: string | null
  createdAt: Date
  updatedAt: Date
  approvedAt: Date | null
  rejectedAt: Date | null
  rejectionReason: string | null
  user: { name: string; department: string | null }
}): LeaveRequestDto {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.name,
    userDepartment: row.user.department,
    startDate: toDateOnlyIso(row.startDate),
    endDate: toDateOnlyIso(row.endDate),
    type: row.type,
    reason: row.reason,
    status: row.status,
    isUrgent: row.isUrgent,
    attachment: row.attachment,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
  }
}

export function monthBounds(
  month: number,
  year: number
): { start: Date; end: Date } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}
