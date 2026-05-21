import type { PaymentType, PrismaClient } from '@prisma/client'
import { toDateOnlyIso } from '@/lib/shifts'

export const REPORTS_MANAGER_ROLES = new Set([
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETARIO_OPERATIVO',
  'DIRETTORE',
  'DIRETTORE_GENERALE',
  'MANAGER',
  'RESTAURANT_MANAGER',
  'CASSIERE',
  'RESPONSABILE_SALA',
])

export function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function previousMonth(year: number, month: number) {
  if (month === 0) return { year: year - 1, month: 11 }
  return { year, month: month - 1 }
}

export function sumByPaymentType(
  rows: Array<{ type: PaymentType; amount: unknown }>
) {
  let cash = 0
  let card = 0
  let foreign = 0
  for (const row of rows) {
    const amount = Number(row.amount)
    if (row.type === 'CASH') cash += amount
    else if (row.type === 'CARD') card += amount
    else foreign += amount
  }
  return { cash, card, foreign, total: cash + card + foreign }
}

export function trendFromChange(
  changePercent: number
): 'up' | 'down' | 'stable' {
  if (changePercent > 0.5) return 'up'
  if (changePercent < -0.5) return 'down'
  return 'stable'
}

export async function assertReportsAccess(
  prisma: PrismaClient,
  userId: string,
  restaurantId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, companyId: true, role: true },
  })
  if (!user) return false

  if (user.restaurantId === restaurantId) {
    return REPORTS_MANAGER_ROLES.has(String(user.role))
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { companyId: true },
  })

  return !!(
    restaurant?.companyId &&
    user.companyId === restaurant.companyId &&
    REPORTS_MANAGER_ROLES.has(String(user.role))
  )
}

export async function getRestaurantLocationIds(
  prisma: PrismaClient,
  restaurantId: string
) {
  const rows = await prisma.restaurantLocation.findMany({
    where: { restaurantId },
    select: { id: true, name: true },
  })
  return rows
}

export function buildDailySeries(
  rows: Array<{ date: Date; type: PaymentType; amount: unknown }>,
  year: number,
  month: number
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const byDay = new Map<
    string,
    { card: number; cash: number; foreign: number; total: number }
  >()

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toDateOnlyIso(new Date(year, month, d))
    byDay.set(iso, { card: 0, cash: 0, foreign: 0, total: 0 })
  }

  for (const row of rows) {
    const key = toDateOnlyIso(row.date)
    const bucket = byDay.get(key)
    if (!bucket) continue
    const amount = Number(row.amount)
    if (row.type === 'CASH') bucket.cash += amount
    else if (row.type === 'CARD') bucket.card += amount
    else bucket.foreign += amount
    bucket.total += amount
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    label: new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    }),
    ...v,
  }))
}
