import type { PaymentType, PrismaClient } from '@prisma/client'
import { decodeShiftTime, toDateOnlyIso } from '@/lib/shifts'

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
  const start = new Date(`${dateIso}T00:00:00`)
  const end = new Date(`${dateIso}T23:59:59.999`)
  return { start, end }
}

export async function resolveEmployeeForUser(
  prisma: PrismaClient,
  userId: string,
  restaurantId: string
) {
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

/** Ricalcola DailyTips + TipDistribution (+ V2 per location) per un giorno/ristorante */
export async function recalculateDistributionsForDay(
  prisma: PrismaClient,
  restaurantId: string,
  dateIso: string,
  enteredByEmployeeId: string
) {
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

  const existingDaily = await prisma.dailyTips.findUnique({
    where: { restaurantId_date: { restaurantId, date: start } },
  })

  if (totalTips <= 0) {
    if (existingDaily) {
      await prisma.tipDistribution.deleteMany({
        where: { dailyTipsId: existingDaily.id },
      })
      await prisma.dailyTips.delete({ where: { id: existingDaily.id } })
    }
    await prisma.tipDistributionV2.deleteMany({
      where: {
        date: { gte: start, lte: end },
        locationId: { in: [...new Set(entries.map((e) => e.locationId))] },
      },
    })
    return { dailyTips: null, distributions: [], warning: 'Nessuna mancia per questo giorno' }
  }

  const dailyTips = await prisma.dailyTips.upsert({
    where: { restaurantId_date: { restaurantId, date: start } },
    create: {
      restaurantId,
      date: start,
      cashTips,
      cardTips,
      foreignCurrencyTips,
      enteredBy: enteredByEmployeeId,
    },
    update: {
      cashTips,
      cardTips,
      foreignCurrencyTips,
    },
  })

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
    select: { id: true, name: true, score: true },
  })
  const scoreByName = new Map(employees.map((e) => [e.name, e.score]))

  const users =
    presentUserIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...presentUserIds] } },
          select: { id: true, name: true },
        })
      : []

  const participants = users
    .map((u) => ({
      userId: u.id,
      name: u.name,
      score: Math.max(1, scoreByName.get(u.name) ?? 5),
      employeeId: employees.find((e) => e.name === u.name)?.id,
    }))
    .filter((p) => p.score > 0)

  const totalPoints = participants.reduce((sum, p) => sum + p.score, 0)

  await prisma.tipDistribution.deleteMany({
    where: { dailyTipsId: dailyTips.id },
  })

  let distributions: Array<{ userId: string; amount: number }> = []

  if (totalPoints > 0 && participants.length > 0) {
    const rows = participants.map((p) => ({
      dailyTipsId: dailyTips.id,
      userId: p.userId,
      amount: (totalTips * p.score) / totalPoints,
    }))
    await prisma.tipDistribution.createMany({ data: rows })
    distributions = rows.map((r) => ({
      userId: r.userId,
      amount: Number(r.amount),
    }))
  }

  // TipDistributionV2 per ogni location con mance quel giorno
  const byLocation = new Map<string, typeof entries>()
  for (const entry of entries) {
    const list = byLocation.get(entry.locationId) ?? []
    list.push(entry)
    byLocation.set(entry.locationId, list)
  }

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
      if (!p.employeeId) continue
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
          amount: (locTotal * p.score) / totalPoints,
          isPresent: true,
        },
      })
    }
  }

  const warning =
    participants.length === 0
      ? 'Mance salvate. Nessun turno lavorativo trovato: distribuzione non calcolata.'
      : undefined

  return { dailyTips, distributions, warning }
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
