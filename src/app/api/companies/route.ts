import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cf = searchParams.get('cf')
    if (cf) {
      const company = await prisma.company.findUnique({ where: { fiscalCode: cf } })
      return NextResponse.json({ company })
    }

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, restaurants: true } },
      },
    })
    return NextResponse.json({ companies })
  } catch (error) {
    console.error('GET /api/companies error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


