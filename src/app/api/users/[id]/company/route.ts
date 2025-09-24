import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let companyId = (user as any).companyId as string | null
    if (!companyId && (user as any).restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: (user as any).restaurantId }
      })
      companyId = (restaurant as any)?.companyId ?? null
    }
    if (!companyId) {
      return NextResponse.json({ company: null })
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { restaurants: true }
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
