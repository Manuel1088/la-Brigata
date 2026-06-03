import type { PaymentType, PrismaClient } from '@prisma/client'
import {
  dateFromIso,
  decodeShiftTime,
  isWorkShiftTime,
  toDateOnlyIso,
} from '@/lib/shifts'

export type TipAmountInput = {
  cash?: number
  card?: number
  foreign?: number
  /** Lordo carta (prima delle commissioni/tasse). Se fornito, amount = netAmount. */
  cardGrossAmount?: number
  /** Netto carta (dopo commissioni/tasse). Se fornito, usato come amount distribuibile. */
  cardNetAmount?: number
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

/**
 * Statuto mance Mirabelle: oltre al lavoro (orario HH:mm–HH:mm, anche spezzato),
 * solo queste assenze danno diritto alla quota mance.
 * RO = Recupero Ore (incluso). NON confondere con RECUPERO_RIPOSO (escluso).
 * Malattia, congedi, permessi, riposi e tipi futuri non in elenco → esclusi.
 */
export const ABSENCES_INCLUDED_IN_TIPS = new Set(['FERIE', 'ROL', 'RO'])

/** Regola statuto su etichetta turno già decodificata (testabile senza DB). */
export function isIncludedInTipsDistribution(decodedTime: string): boolean {
  if (isWorkShiftTime(decodedTime)) return true
  if (ABSENCES_INCLUDED_IN_TIPS.has(decodedTime)) return true
  return false
}

/** Presenza per divisione mance da riga Shift (status + orari). */
export function isPresentForTips(
  status: string,
  startTime: Date,
  endTime: Date
): boolean {
  const time = decodeShiftTime(status, startTime, endTime)
  return isIncludedInTipsDistribution(time)
}

/** Classifica un turno per il periodo pasto (pranzo/cena) in caso di splitTipsByMeal. */
type MealPeriod = 'pranzo' | 'cena' | 'both'

const SPLIT_HOUR = 17 * 60 // 17:00 in minuti

function mealPeriodForShift(status: string, startTime: Date, endTime: Date): MealPeriod {
  const time = decodeShiftTime(status, startTime, endTime)

  // Solo turni già filtrati da isPresentForTips; assenze in quota mance → entrambi i pasti
  if (time === 'RIPOSO') return 'pranzo' // non dovrebbe arrivare qui
  if (ABSENCES_INCLUDED_IN_TIPS.has(time)) return 'both'

  const startMin = startTime.getHours() * 60 + startTime.getMinutes()
  let endMin = endTime.getHours() * 60 + endTime.getMinutes()
  if (endMin <= startMin) endMin += 24 * 60 // turno oltre mezzanotte

  const startsBeforeSplit = startMin < SPLIT_HOUR
  const endsAfterSplit = endMin > SPLIT_HOUR

  if (startsBeforeSplit && !endsAfterSplit) return 'pranzo' // finisce entro le 17:00
  if (!startsBeforeSplit) return 'cena'                     // inizia dalle 17:00
  return 'both'                                             // spezzato — copre entrambi
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
  dateIso: string,
  /** Fattore di scala opzionale per le mance carta (es. netAmount/grossAmount per rettifica mensile) */
  cardScaleFactor = 1.0
): Promise<TipDistributionResult> {
  const { start, end } = dayBounds(dateIso)

  const entries = await prisma.tipEntry.findMany({
    where: { restaurantId, date: { gte: start, lte: end } },
  })

  let cashTips = 0
  let cardTips = 0
  let foreignCurrencyTips = 0

  for (const entry of entries) {
    const amount = Number(entry.amount)
    if (entry.type === 'CASH') cashTips += amount
    else if (entry.type === 'CARD') cardTips += amount * cardScaleFactor
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
        where: { locationId: { in: locationIds }, date: { gte: start, lte: end } },
      })
    }
    return { totals: null, distributions: [], warning: 'Nessuna mancia per questo giorno' }
  }

  // Recupera turni del giorno
  const shifts = await prisma.shift.findMany({
    where: { restaurantId, date: { gte: start, lte: end } },
    include: { user: { select: { id: true, name: true, isActive: true } } },
  })

  // Verifica se il giorno è una festività con splitTipsByMeal
  const festivity = await prisma.restaurantEvent.findFirst({
    where: {
      restaurantId,
      date: { gte: start, lte: end },
      splitTipsByMeal: true,
    },
    select: { id: true },
  })
  const splitByMeal = !!festivity

  // Mappa userId → periodo pasto (con splitByMeal)
  const userMealPeriod = new Map<string, MealPeriod>()
  const presentUserIds = new Set<string>()

  for (const shift of shifts) {
    if (!shift.user.isActive) continue
    if (!isPresentForTips(shift.status, shift.startTime, shift.endTime)) continue

    presentUserIds.add(shift.user.id)

    if (splitByMeal) {
      const period = mealPeriodForShift(shift.status, shift.startTime, shift.endTime)
      const existing = userMealPeriod.get(shift.user.id)
      // Se l'utente ha già un periodo e il nuovo è diverso → spezzato (both)
      if (existing && existing !== period) {
        userMealPeriod.set(shift.user.id, 'both')
      } else {
        userMealPeriod.set(shift.user.id, period)
      }
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
      const period: MealPeriod = splitByMeal ? (userMealPeriod.get(u.id) ?? 'both') : 'both'
      return { employeeId: emp.id, name: emp.name, score: Math.max(1, emp.score), period }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  const byLocation = new Map<string, typeof entries>()
  for (const entry of entries) {
    const list = byLocation.get(entry.locationId) ?? []
    list.push(entry)
    byLocation.set(entry.locationId, list)
  }

  const distributions: TipDistributionResult['distributions'] = []

  for (const [locationId, locEntries] of byLocation) {
    let locTotal = 0
    for (const e of locEntries) locTotal += Number(e.amount)

    await prisma.tipDistributionV2.deleteMany({
      where: { locationId, date: { gte: start, lte: end } },
    })

    if (locTotal <= 0 || participants.length === 0) continue

    let amountsPerEmployee: Map<string, number>

    if (splitByMeal) {
      amountsPerEmployee = distributeSplitMeal(participants, locTotal)
    } else {
      amountsPerEmployee = distributeUniform(participants, locTotal)
    }

    const totalPoints = participants.reduce((s, p) => s + p.score, 0)

    for (const p of participants) {
      const amount = amountsPerEmployee.get(p.employeeId) ?? 0
      if (amount <= 0) continue
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
      distributions.push({ employeeId: p.employeeId, employeeName: p.name, locationId, amount })
    }
  }

  const warning =
    participants.length === 0
      ? 'Mance salvate. Nessun turno trovato: distribuzione non calcolata.'
      : splitByMeal
      ? 'Festività con mance divise pranzo/cena'
      : undefined

  return {
    totals: { cash: cashTips, card: cardTips, foreign: foreignCurrencyTips, total: totalTips },
    distributions,
    warning,
  }
}

/** Distribuzione uniforme (giornata intera — nessun split pasto). */
function distributeUniform(
  participants: Array<{ employeeId: string; score: number }>,
  total: number
): Map<string, number> {
  const map = new Map<string, number>()
  const totalPoints = participants.reduce((s, p) => s + p.score, 0)
  if (totalPoints <= 0) return map
  for (const p of participants) {
    map.set(p.employeeId, (total * p.score) / totalPoints)
  }
  return map
}

/**
 * Distribuzione con split pranzo/cena:
 * - Pool pranzo = 50% del totale → distribuito a chi ha period 'pranzo' o 'both'
 * - Pool cena   = 50% del totale → distribuito a chi ha period 'cena'  o 'both'
 * - Chi fa 'both' (spezzato / ferie / ROL / RO) partecipa a entrambi i pool
 */
function distributeSplitMeal(
  participants: Array<{ employeeId: string; score: number; period: MealPeriod }>,
  total: number
): Map<string, number> {
  const map = new Map<string, number>()
  const half = total / 2

  const pranzoGroup = participants.filter((p) => p.period === 'pranzo' || p.period === 'both')
  const cenaGroup = participants.filter((p) => p.period === 'cena' || p.period === 'both')

  const addShare = (group: typeof participants, pool: number) => {
    const pts = group.reduce((s, p) => s + p.score, 0)
    if (pts <= 0) return
    for (const p of group) {
      const share = (pool * p.score) / pts
      map.set(p.employeeId, (map.get(p.employeeId) ?? 0) + share)
    }
  }

  // Se un pool è vuoto, tutta la quota va all'altro
  if (pranzoGroup.length === 0) {
    addShare(cenaGroup, total)
  } else if (cenaGroup.length === 0) {
    addShare(pranzoGroup, total)
  } else {
    addShare(pranzoGroup, half)
    addShare(cenaGroup, half)
  }

  return map
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
    grossAmount?: number
    netAmount?: number
    restaurantId: string
    locationId: string
    createdBy: string
    notes?: string
    updatedAt: Date
  }> = []

  // Contanti
  const cashAmount = Number(amounts.cash ?? 0)
  if (cashAmount > 0) {
    payloads.push({
      id: crypto.randomUUID(),
      date: start,
      location: locationName,
      type: PAYMENT_MAP.cash,
      amount: cashAmount,
      restaurantId,
      locationId,
      createdBy,
      notes: notes || undefined,
      updatedAt: new Date(),
    })
  }

  // Carta — usa netAmount come importo distribuibile se fornito
  const cardRaw = Number(amounts.card ?? 0)
  const cardGross = amounts.cardGrossAmount != null ? Number(amounts.cardGrossAmount) : undefined
  const cardNet = amounts.cardNetAmount != null ? Number(amounts.cardNetAmount) : undefined
  const cardAmount = cardNet != null && cardNet > 0 ? cardNet : cardRaw

  if (cardAmount > 0) {
    payloads.push({
      id: crypto.randomUUID(),
      date: start,
      location: locationName,
      type: PAYMENT_MAP.card,
      amount: cardAmount,
      grossAmount: cardGross,
      netAmount: cardNet,
      restaurantId,
      locationId,
      createdBy,
      notes: notes || undefined,
      updatedAt: new Date(),
    })
  }

  // Monete estere
  const foreignAmount = Number(amounts.foreign ?? 0)
  if (foreignAmount > 0) {
    payloads.push({
      id: crypto.randomUUID(),
      date: start,
      location: locationName,
      type: PAYMENT_MAP.foreign,
      amount: foreignAmount,
      restaurantId,
      locationId,
      createdBy,
      notes: notes || undefined,
      updatedAt: new Date(),
    })
  }

  return payloads
}

export type CardAdjustmentResult = {
  adjustmentId: string
  taxDifference: number
  updatedDays: number
  updatedEmployeeIds: string[]
  avgAmountPerPoint: number
}

/**
 * Applica la rettifica carta di fine mese: scala le distribuzioni CARD
 * di ogni giorno del mese usando il rapporto netAmount/grossAmount.
 */
export async function applyCardAdjustmentForMonth(
  prisma: PrismaClient,
  restaurantId: string,
  month: number, // 1–12
  year: number,
  grossAmount: number,
  netAmount: number
): Promise<CardAdjustmentResult> {
  if (grossAmount <= 0) throw new Error('Importo lordo deve essere maggiore di zero')
  if (netAmount < 0) throw new Error('Importo netto non valido')
  if (netAmount > grossAmount) throw new Error('Il netto non può essere maggiore del lordo')

  const taxDifference = grossAmount - netAmount
  const cardScaleFactor = netAmount / grossAmount

  // Costruisci bounds del mese
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999) // ultimo giorno del mese

  // Salva la rettifica
  const adjustment = await prisma.tipCardAdjustment.create({
    data: {
      restaurantId,
      month,
      year,
      grossAmount,
      netAmount,
      taxDifference,
      appliedAt: new Date(),
    },
  })

  // Trova tutti i giorni unici con voci CARD nel mese
  const cardEntries = await prisma.tipEntry.findMany({
    where: {
      restaurantId,
      type: 'CARD',
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { date: true },
  })

  const uniqueDayIsos = [
    ...new Set(cardEntries.map((e) => toDateOnlyIso(e.date))),
  ]

  let updatedDays = 0
  const updatedEmployeeIds = new Set<string>()
  let totalAmountDistributed = 0
  let totalPointsSum = 0

  for (const dateIso of uniqueDayIsos) {
    const result = await recalculateDistributionsForDay(
      prisma,
      restaurantId,
      dateIso,
      cardScaleFactor
    )
    if (result.distributions.length > 0) {
      updatedDays++
      for (const d of result.distributions) {
        updatedEmployeeIds.add(d.employeeId)
        totalAmountDistributed += d.amount
      }
    }
  }

  // Calcola punteggio totale del mese come riferimento per avg per punto
  // (usa la somma distribuzione / numero medio di punti per giorno)
  const avgAmountPerPoint =
    totalPointsSum > 0
      ? totalAmountDistributed / totalPointsSum
      : taxDifference > 0 && updatedEmployeeIds.size > 0
      ? taxDifference / updatedEmployeeIds.size
      : 0

  return {
    adjustmentId: adjustment.id,
    taxDifference,
    updatedDays,
    updatedEmployeeIds: [...updatedEmployeeIds],
    avgAmountPerPoint,
  }
}

export { PAYMENT_MAP, toDateOnlyIso }
