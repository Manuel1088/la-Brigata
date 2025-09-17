import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getToken } from 'next-auth/jwt'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
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

    const { amount, paymentType, date } = (await request.json()) as {
      amount: number
      paymentType: 'cash' | 'card' | 'foreign'
      date?: string
    }

    if (!amount || amount <= 0 || !paymentType) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 })
    }

    const tipDate = date ? new Date(date) : new Date()
    // Normalizza a mezzanotte locale
    tipDate.setHours(0, 0, 0, 0)

    // Trova o crea il record giornaliero per ristorante+data
    const compoundKey = { restaurantId_date: { restaurantId: user.restaurantId, date: tipDate } }

    const existing = await prisma.dailyTips.findUnique({ where: compoundKey })

    if (existing) {
      const dataUpdate: any = {}
      if (paymentType === 'cash') dataUpdate.cashTips = { increment: amount }
      if (paymentType === 'card') dataUpdate.cardTips = { increment: amount }
      if (paymentType === 'foreign') dataUpdate.foreignCurrencyTips = { increment: amount }

      const updated = await prisma.dailyTips.update({
        where: compoundKey,
        data: dataUpdate,
      })

      return NextResponse.json({
        success: true,
        daily: {
          id: updated.id,
          date: updated.date,
          cashTips: updated.cashTips,
          cardTips: updated.cardTips,
          foreignCurrencyTips: updated.foreignCurrencyTips,
          total: Number(updated.cashTips) + Number(updated.cardTips) + Number(updated.foreignCurrencyTips),
        },
      })
    }

    const initial = {
      cashTips: 0,
      cardTips: 0,
      foreignCurrencyTips: 0,
    } as { cashTips: number; cardTips: number; foreignCurrencyTips: number }
    if (paymentType === 'cash') initial.cashTips = amount
    if (paymentType === 'card') initial.cardTips = amount
    if (paymentType === 'foreign') initial.foreignCurrencyTips = amount

    const created = await prisma.dailyTips.create({
      data: {
        restaurantId: user.restaurantId,
        date: tipDate,
        cashTips: initial.cashTips,
        cardTips: initial.cardTips,
        foreignCurrencyTips: initial.foreignCurrencyTips,
        enteredBy: userId,
      },
    })

    return NextResponse.json({
      success: true,
      daily: {
        id: created.id,
        date: created.date,
        cashTips: created.cashTips,
        cardTips: created.cardTips,
        foreignCurrencyTips: created.foreignCurrencyTips,
        total: Number(created.cashTips) + Number(created.cardTips) + Number(created.foreignCurrencyTips),
      },
    })
  } catch (error) {
    console.error('Errore inserimento mancia:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}


