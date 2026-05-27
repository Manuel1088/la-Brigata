import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'
import { isManagerRole } from '@/lib/roles'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!caller || !isManagerRole(caller.role)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

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


