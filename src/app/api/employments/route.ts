import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }
    
    // Ottieni parametri query
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const restaurantId = searchParams.get('restaurantId')
    
    // Costruisci filtri
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (restaurantId) {
      where.restaurantId = restaurantId
    } else {
      // Se non specificato, mostra solo quelli del restaurant dell'utente
      const user = session.user as any
      if (user.restaurantId) {
        where.restaurantId = user.restaurantId
      }
    }
    
    // Ottieni employments
    const employments = await prisma.employment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      employments,
      count: employments.length
    })
    
  } catch (error) {
    console.error('Errore nel recupero employments:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

