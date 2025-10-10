import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentPassword, newPassword } = body

    // Validazione
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Dati mancanti' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nuova password deve essere di almeno 8 caratteri' },
        { status: 400 }
      )
    }

    // Trova l'utente
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Verifica password attuale
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Password attuale non corretta' },
        { status: 401 }
      )
    }

    // Hash nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Aggiorna password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    return NextResponse.json({
      success: true,
      message: 'Password cambiata con successo'
    })

  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Errore nel cambio password' },
      { status: 500 }
    )
  }
}

