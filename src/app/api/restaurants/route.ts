import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true,
            fiscalCode: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            users: true,
            bookings: true,
            tips: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ restaurants })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
