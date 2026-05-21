import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'

/**
 * GET /api/audit/logs?userId=&action=&limit=
 * Legge audit trail da Prisma (solo Super Admin).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const userRole = session.user.role
    const userLevel = session.user.level

    if (userRole !== 'ADMIN' || userLevel !== 11) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ?? undefined
    const action = searchParams.get('action') ?? undefined
    const limitRaw = searchParams.get('limit')
    const limit = Math.min(
      Math.max(parseInt(limitRaw ?? '100', 10) || 100, 1),
      500
    )

    const rows = await prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    const logs = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      user: row.user?.name ?? 'Sconosciuto',
      userName: row.user?.name ?? 'Sconosciuto',
      action: row.action,
      resource: row.resource,
      resourceId: row.resourceId,
      details: row.details
        ? (() => {
            try {
              return JSON.parse(row.details) as Record<string, unknown>
            } catch {
              return { raw: row.details }
            }
          })()
        : {},
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      timestamp: row.createdAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }))

    return NextResponse.json({
      logs,
      meta: { count: logs.length, limit },
    })
  } catch (error) {
    console.error('GET /api/audit/logs error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
