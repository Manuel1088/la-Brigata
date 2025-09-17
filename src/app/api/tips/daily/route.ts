import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getToken } from 'next-auth/jwt'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const userId = token.sub as string
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Utente senza ristorante associato' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // formato YYYY-MM
    const date = monthParam ? new Date(monthParam + '-01T00:00:00') : new Date()
    const start = new Date(date)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)

    const rows = await prisma.dailyTips.findMany({
      where: {
        restaurantId: user.restaurantId,
        date: { gte: start, lt: end },
      },
      orderBy: { date: 'asc' },
    })

    const data = rows.map(r => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      cashTips: Number(r.cashTips),
      cardTips: Number(r.cardTips),
      foreignCurrencyTips: Number(r.foreignCurrencyTips),
      total: Number(r.cashTips) + Number(r.cardTips) + Number(r.foreignCurrencyTips),
    }))

    return NextResponse.json({ success: true, days: data })
  } catch (error) {
    console.error('Errore lettura mance giornaliere:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}


