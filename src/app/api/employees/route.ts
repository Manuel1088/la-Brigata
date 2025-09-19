import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const department = searchParams.get('department') || undefined
    const activeParam = searchParams.get('active')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const employees = await prisma.user.findMany({
      where: {
        companyId,
        ...(department ? { department } : {}),
        ...(activeParam != null ? { isActive: activeParam === 'true' } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        hierarchyLevel: true,
        department: true,
        isActive: true,
        avatar: true,
      }
    })

    return NextResponse.json({ employees: employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      role: e.role,
      level: e.hierarchyLevel,
      department: e.department,
      isActive: e.isActive,
      avatar: e.avatar || '👤'
    })) })
  } catch (error) {
    console.error('GET /api/employees error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


