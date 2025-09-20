import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, params: Promise<Params["params"]>) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const company = await prisma.company.findUnique({
      where: { id },
      include: { restaurants: true }
    })

    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(company)
  } catch (error) {
    console.error('GET /api/companies/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


