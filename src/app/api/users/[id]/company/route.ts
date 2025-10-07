import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // ✅ UNA SOLA QUERY con relazioni annidate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        restaurant: {
          select: {
            companyId: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const companyId = user.companyId || user.restaurant?.companyId

    if (!companyId) {
      return NextResponse.json({ company: null })
    }

    // ✅ Query ottimizzata con select specifici
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}