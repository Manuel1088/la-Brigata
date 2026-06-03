import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { LeaveStatus, Prisma } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import {
  ensureLeaveEntitlementAndBalances,
  getLeaveBalancesForUser,
  isLeaveApprover,
  leaveBalanceAmount,
  monthBounds,
  serializeLeaveRequest,
} from '@/lib/leaves'
import { dateFromIso } from '@/lib/shifts'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getLeavesQuerySchema, postLeaveBodySchema } from '@/lib/validations/leaves'

async function getSessionUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, restaurantId: true, department: true },
  })
}

function buildListWhere(
  dbUser: { id: string; restaurantId: string | null; role: string },
  isApprover: boolean,
  params: {
    userId?: string
    status?: LeaveStatus
    month?: number
    year?: number
  }
): Prisma.LeaveRequestWhereInput {
  const targetUserId =
    isApprover && params.userId ? params.userId : dbUser.id

  const restaurantUserIds = isApprover && !params.userId
    ? undefined
    : [targetUserId]

  const where: Prisma.LeaveRequestWhereInput = {}

  if (restaurantUserIds) {
    where.userId = { in: restaurantUserIds }
  } else if (isApprover && dbUser.restaurantId) {
    where.user = { restaurantId: dbUser.restaurantId }
  } else if (!isApprover) {
    where.userId = dbUser.id
  }

  if (params.status) {
    where.status = params.status
  }

  if (params.month !== undefined && params.year !== undefined) {
    const { start, end } = monthBounds(params.month, params.year)
    where.AND = [{ startDate: { lte: end } }, { endDate: { gte: start } }]
  }

  return where
}

/** GET /api/leaves?userId=&status=&month=&year=&includeBalances= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = getLeavesQuerySchema.safeParse({
      userId: searchParams.get('userId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
      includeBalances: searchParams.get('includeBalances') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const dbUser = await getSessionUser(session.user.id)
    if (!dbUser) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }
    if (
      !dbUser.restaurantId &&
      !isPlatformAdmin(String(dbUser.role), session.user.level)
    ) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 400 })
    }

    const approver = isLeaveApprover(String(dbUser.role))
    const targetUserId = parsed.data.userId ?? dbUser.id

    if (parsed.data.userId && parsed.data.userId !== dbUser.id && !approver) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    if (parsed.data.userId && parsed.data.userId !== dbUser.id) {
      const target = await prisma.user.findFirst({
        where: { id: parsed.data.userId, restaurantId: dbUser.restaurantId },
        select: { id: true },
      })
      if (!target) {
        return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
      }
    }

    const now = new Date()
    const year = parsed.data.year ?? now.getFullYear()
    const month = parsed.data.month

    const where = buildListWhere(dbUser, approver, {
      userId: parsed.data.userId,
      status: parsed.data.status,
      month,
      year: month !== undefined ? year : parsed.data.year,
    })

    const rows = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { name: true, department: true } },
      },
      orderBy: [{ createdAt: 'asc' }],
    })

    const includeBalances =
      parsed.data.includeBalances !== false &&
      (!parsed.data.userId || parsed.data.userId === dbUser.id)

    const balances = includeBalances
      ? await getLeaveBalancesForUser(prisma, targetUserId, year)
      : undefined

    return NextResponse.json({
      requests: rows.map(serializeLeaveRequest),
      balances,
      meta: {
        count: rows.length,
        year,
        month: month ?? null,
      },
    })
  } catch (error) {
    console.error('GET /api/leaves error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/leaves — nuova richiesta (utente corrente) */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postLeaveBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body non valido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate, type, reason, isUrgent, requestedHours, certificateNumber } =
      parsed.data
    const sickLeave =
      type === 'SICK_LEAVE' || type === 'SICK_LEAVE_CHILD'
    const certTrimmed = certificateNumber?.trim()
    const start = dateFromIso(startDate)
    const end = dateFromIso(endDate)

    if (end < start) {
      return NextResponse.json(
        { error: 'La data di fine deve essere successiva alla data di inizio' },
        { status: 400 }
      )
    }

    if (type === 'ROL' && requestedHours != null) {
      const year = start.getFullYear()
      await ensureLeaveEntitlementAndBalances(prisma, session.user.id, year)
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year_type: {
            userId: session.user.id,
            year,
            type: 'ROL',
          },
        },
      })
      if (balance && requestedHours > leaveBalanceAmount(balance.remaining)) {
        return NextResponse.json(
          {
            error:
              'Le ore ROL richieste superano il residuo disponibile',
          },
          { status: 400 }
        )
      }
    }

    const created = await prisma.leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        startDate: start,
        endDate: end,
        type,
        requestedHours: type === 'ROL' ? requestedHours : null,
        certificateNumber:
          sickLeave && certTrimmed ? certTrimmed : null,
        reason: reason ?? null,
        status: 'PENDING',
        isUrgent: isUrgent ?? false,
      },
      include: {
        user: { select: { name: true, department: true } },
      },
    })

    return NextResponse.json({
      success: true,
      request: serializeLeaveRequest(created),
    })
  } catch (error) {
    console.error('POST /api/leaves error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
