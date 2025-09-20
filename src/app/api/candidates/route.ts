import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const candidates = await prisma.user.findMany({
      where: { userType: 'CANDIDATE' },
      select: { id: true, name: true, email: true, phone: true }
    })
    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('GET /api/candidates error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


