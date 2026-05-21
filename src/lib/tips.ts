import type { PaymentType, PrismaClient } from '@prisma/client'
import { dateFromIso, decodeShiftTime, toDateOnlyIso } from '@/lib/shifts'

export type TipAmountInput = {
  cash?: number
  card?: number
  foreign?: number
}

const PAYMENT_MAP: Record<'cash' | 'card' | 'foreign', PaymentType> = {
  cash: 'CASH',
  card: 'CARD',
  foreign: 'FOREIGN',
}

export function dayBounds(dateIso: string): { start: Date; end: Date } {
  const start = dateFromIso(dateIso)
  const end = new Date(`${dateIso}T23:59:59.999`)
  return { start, end }
}

/** Risolve il profilo Employee collegato a un User (userId FK, poi fallback nome/email). */
export async function resolveEmployeeForUser(
  prisma: PrismaClient,
  userId: string,
  restaurantId: string
) {
  const byUserId = await prisma.employee.findFirst({
    where: { userId, restaurantId },
  })
  if (byUserId) return byUserId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  if (!user) return null

  const byName = await prisma.employee.findFirst({
    where: { restaurantId, name: user.name },
  })
  if (byName) return byName

  if (user.email) {
    return prisma.employee.findFirst({
      where: { restaurantId, email: user.email.toLowerCase() },
    })
  }

  return null
}

function isPresentShift(status: string, startTime: Date, endTime: Date): boolean {
  const time = decodeShiftTime(status, startTime, endTime)
  return time !== 'RIPOSO' && time !== 'FERIE'
}

export type TipDistributionResult = {
  totals: { cash: number; card: number; foreign: number; total: number } | null
  distributions: Array<{
    employeeId: string
    employeeName: string
    locationId: string
    amount: number
  }>
  warning?: string
}

/** Ricalcola TipDistributionV2 per un giorno/ristorante */
export async function recalculateDistributionsForDay(
  prisma: PrismaClient,
  restaurantId: string,
  dateIso: string
): Promise<TipDistributionResult> {
  const { start, end } = dayBounds(dateIso)

  const entries = await prisma.tipEntry.findMany({
    where: {
      restaurantId,
      date: { gte: start, lte: end },
    },
  })

  let cashTips = 0
  let cardTips = 0
  let foreignCurrencyTips = 0

  for (const entry of entries) {
    const amount = Number(entry.amount)
    if (entry.type === 'CASH') cashTips += amount
    else if (entry.type === 'CARD') cardTips += amount
    else if (entry.type === 'FOREIGN') foreignCurrencyTips += amount
  }

  const totalTips = cashTips + cardTips + foreignCurrencyTips

  const locationIds = [
    ...new Set(
      (
        await prisma.restaurantLocation.findMany({
          where: { restaurantId },
          select: { id: true },
        })
      ).map((l) => l.id)
    ),
  ]

  if (totalTips <= 0) {
    if (locationIds.length > 0) {
      await prisma.tipDistributionV2.deleteMany({
        where: {
          locationId: { in: locationIds },
          date: { gte: start, lte: end },
        },
      })
    }
    return {
      totals: null,
      distributions: [],
      warning: 'Nessuna mancia per questo giorno',
    }
  }

  const shifts = await prisma.shift.findMany({
    where: {
      restaurantId,
      date: { gte: start, lte: end },
    },
    include: {
      user: { select: { id: true, name: true, isActive: true } },
    },
  })

  const presentUserIds = new Set<string>()
  for (const shift of shifts) {
    if (!shift.user.isActive) continue
    if (isPresentShift(shift.status, shift.startTime, shift.endTime)) {
      presentUserIds.add(shift.user.id)
    }
  }

  const employees = await prisma.employee.findMany({
    where: {
      restaurantId,
      isActive: true,
      NOT: { name: { equals: 'Cucina', mode: 'insensitive' } },
    },
    select: { id: true, name: true, score: true, userId: true },
  })
  const employeeByUserId = new Map(
    employees
      .filter((e): e is typeof e & { userId: string } => !!e.userId)
      .map((e) => [e.userId, e])
  )
  const employeeByName = new Map(employees.map((e) => [e.name, e]))

  const users =
    presentUserIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...presentUserIds] } },
          select: { id: true, name: true },
        })
      : []

  const participants = users
    .map((u) => {
      const emp = employeeByUserId.get(u.id) ?? employeeByName.get(u.name)
      if (!emp) return null
      return {
        employeeId: emp.id,
        name: emp.name,
        score: Math.max(1, emp.score),
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  const totalPoints = participants.reduce((sum, p) => sum + p.score, 0)

  const byLocation = new Map<string, typeof entries>()
  for (const entry of entries) {
    const list = byLocation.get(entry.locationId) ?? []
    list.push(entry)
    byLocation.set(entry.locationId, list)
  }

  const distributions: TipDistributionResult['distributions'] = []

  for (const [locationId, locEntries] of byLocation) {
    let locTotal = 0
    for (const e of locEntries) {
      locTotal += Number(e.amount)
    }

    await prisma.tipDistributionV2.deleteMany({
      where: {
        locationId,
        date: { gte: start, lte: end },
      },
    })

    if (locTotal <= 0 || totalPoints <= 0 || participants.length === 0) continue

    for (const p of participants) {
      const amount = (locTotal * p.score) / totalPoints
      await prisma.tipDistributionV2.create({
        data: {
          id: crypto.randomUUID(),
          date: start,
          locationId,
          employeeId: p.employeeId,
          employeeName: p.name,
          employeeScore: p.score,
          totalTips: locTotal,
          totalPoints,
          amount,
          isPresent: true,
        },
      })
      distributions.push({
        employeeId: p.employeeId,
        employeeName: p.name,
        locationId,
        amount,
      })
    }
  }

  const warning =
    participants.length === 0
      ? 'Mance salvate. Nessun turno lavorativo trovato: distribuzione non calcolata.'
      : undefined

  return {
    totals: { cash: cashTips, card: cardTips, foreign: foreignCurrencyTips, total: totalTips },
    distributions,
    warning,
  }
}

export function buildTipEntryPayloads(
  restaurantId: string,
  locationId: string,
  locationName: string,
  dateIso: string,
  amounts: TipAmountInput,
  createdBy: string,
  notes?: string
) {
  const { start } = dayBounds(dateIso)
  const payloads: Array<{
    id: string
    date: Date
    location: string
    type: PaymentType
    amount: number
    restaurantId: string
    locationId: string
    createdBy: string
    notes?: string
    updatedAt: Date
  }> = []

  const pairs = [
    ['cash', amounts.cash] as const,
    ['card', amounts.card] as const,
    ['foreign', amounts.foreign] as const,
  ]

  for (const [key, value] of pairs) {
    const amount = Number(value ?? 0)
    if (amount <= 0) continue
    payloads.push({
      id: crypto.randomUUID(),
      date: start,
      location: locationName,
      type: PAYMENT_MAP[key],
      amount,
      restaurantId,
      locationId,
      createdBy,
      notes: notes || undefined,
      updatedAt: new Date(),
    })
  }

  return payloads
}

export { PAYMENT_MAP, toDateOnlyIso }
