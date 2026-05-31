import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    })
    const isAdmin = caller?.role === 'ADMIN'
    const ownCompany = caller?.companyId === id
    if (!isAdmin && !ownCompany) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

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


