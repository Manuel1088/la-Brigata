import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint non disponibile in produzione' }, { status: 403 })
    }

    const { email, newPassword } = await request.json()
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email e nuova password sono richieste' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const hashed = await hash(String(newPassword), 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}


