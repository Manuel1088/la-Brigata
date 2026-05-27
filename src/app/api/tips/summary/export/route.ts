import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { assertRestaurantAccess, restaurantIdsForManager } from '@/lib/restaurant-access'
import { isManagerRole } from '@/lib/roles'

/**
 * GET /api/tips/summary/export?month=0-11&year=YYYY&restaurantId=xxx
 *
 * Riepilogo mensile mance per ufficio personale.
 * Restituisce la lista dipendenti con totale mance del mese, per generazione PDF.
 * Richiede ruolo manager con accesso al ristorante.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, restaurantId: true, companyId: true },
    })
    if (!caller || !isManagerRole(caller.role)) {
      return NextResponse.json({ error: 'Permesso negato — solo i manager possono esportare il riepilogo' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    const restaurantIdParam = searchParams.get('restaurantId')

    if (monthParam === null || yearParam === null) {
      return NextResponse.json(
        { error: 'Parametri month e year obbligatori' },
        { status: 400 }
      )
    }

    const month = parseInt(monthParam, 10)
    const year = parseInt(yearParam, 10)
    if (isNaN(month) || month < 0 || month > 11 || isNaN(year)) {
      return NextResponse.json({ error: 'month (0–11) e year non validi' }, { status: 400 })
    }

    // Risolvi il restaurantId: usa il param oppure il primo ristorante del manager
    let restaurantId = restaurantIdParam
    if (!restaurantId) {
      const ids = await restaurantIdsForManager(caller)
      restaurantId = ids[0] ?? null
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    if (!(await assertRestaurantAccess(session.user.id, restaurantId, true))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        name: true,
        company: { select: { name: true } },
      },
    })

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
    const monthLabel = monthStart.toLocaleDateString('it-IT', {
      month: 'long',
      year: 'numeric',
    })

    // Recupera tutti gli Employee attivi del ristorante
    const activeEmployees = await prisma.employee.findMany({
      where: { restaurantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    const empIds = activeEmployees.map((e) => e.id)

    // Distribuzioni del mese per questi dipendenti
    const distributions = await prisma.tipDistributionV2.findMany({
      where: {
        employeeId: { in: empIds },
        date: { gte: monthStart, lte: monthEnd },
        isPresent: true,
      },
      select: { employeeId: true, amount: true },
    })

    // Aggrega per employeeId
    const totalByEmp = new Map<string, number>()
    for (const d of distributions) {
      totalByEmp.set(d.employeeId, (totalByEmp.get(d.employeeId) ?? 0) + Number(d.amount))
    }

    // Costruisci la lista dipendenti con totali, ordinata per cognome poi nome
    const rows = activeEmployees
      .map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        total: Math.round((totalByEmp.get(e.id) ?? 0) * 100) / 100,
      }))
      .filter((r) => r.total > 0) // ometti chi non ha mance nel mese
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'it'))

    const grandTotal = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100

    return NextResponse.json({
      restaurantName: restaurant?.company?.name ?? restaurant?.name ?? 'La Brigata',
      month,
      year,
      monthLabel,
      rows,
      grandTotal,
    })
  } catch (error) {
    console.error('GET /api/tips/summary/export error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
