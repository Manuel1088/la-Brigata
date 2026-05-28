import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'
import { loadExpandedDbPermissionIds } from '@/lib/user-permissions-db'
import { z } from 'zod'

const prioritySchema = z.enum(['ALTA', 'MEDIA', 'BASSA'])
const recurringSchema = z.enum(['GIORNALIERO', 'SETTIMANALE', 'MENSILE']).nullable()

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assignedToId: z.string().optional().nullable(),
  assignedToRole: z.string().max(100).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: prioritySchema.default('MEDIA'),
  isRecurring: z.boolean().default(false),
  recurringType: recurringSchema.optional(),
})

/** GET /api/tasks — task assegnati all'utente o al suo ruolo */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: userId, restaurantId, role } = session.user
    if (!restaurantId) {
      return NextResponse.json({ tasks: [] })
    }

    const url = new URL(request.url)
    const scope = url.searchParams.get('scope') ?? 'mine' // mine | department | all
    const statusFilter = url.searchParams.get('status') ?? undefined // DA_FARE | IN_CORSO | COMPLETATO
    const priorityFilter = url.searchParams.get('priority') ?? undefined
    const dueFilter = url.searchParams.get('due') ?? undefined // today | overdue | upcoming

    const userRole = (role as string) ?? ''

    // Build where clause
    let where: Record<string, unknown> = {
      restaurantId,
    }

    if (statusFilter) {
      where.status = statusFilter
    }
    if (priorityFilter) {
      where.priority = priorityFilter
    }
    if (dueFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      where.dueDate = { gte: today, lt: tomorrow }
    } else if (dueFilter === 'overdue') {
      const now = new Date()
      where.dueDate = { lt: now }
      if (!statusFilter) {
        where.status = { not: 'COMPLETATO' }
      }
    } else if (dueFilter === 'upcoming') {
      const now = new Date()
      const in7 = new Date(now)
      in7.setDate(in7.getDate() + 7)
      where.dueDate = { gte: now, lte: in7 }
    }

    const dbGrantedIds = await loadExpandedDbPermissionIds(userId)
    const canManage = isManagerRole(userRole) || hasPermission(userRole, 'task_manage', session.user.ccnlLevel, dbGrantedIds)
    const canCreate = canManage || hasPermission(userRole, 'task_create', session.user.ccnlLevel, dbGrantedIds)

    if (scope === 'mine') {
      where = {
        ...where,
        OR: [
          { assignedToId: userId },
          { assignedToRole: userRole },
          { AND: [{ assignedToId: null }, { assignedToRole: null }] },
        ],
      }
    } else if (scope === 'department' && canCreate) {
      // Mostra tutto il dipartimento — chi può creare task
    } else if (scope === 'all' && canManage) {
      // Tutti i task del ristorante — solo chi può gestire
    } else {
      // fallback su mine
      where = {
        ...where,
        OR: [
          { assignedToId: userId },
          { assignedToRole: userRole },
          { AND: [{ assignedToId: null }, { assignedToRole: null }] },
        ],
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, name: true, role: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, name: true },
        },
        completedBy: {
          select: { id: true, firstName: true, lastName: true, name: true },
        },
      },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** POST /api/tasks — crea nuovo task (richiede ruolo manager) */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: userId, restaurantId, role } = session.user
    if (!restaurantId) {
      return NextResponse.json({ error: 'Ristorante non associato' }, { status: 400 })
    }
    const dbGrantedIds2 = await loadExpandedDbPermissionIds(userId)
    const canCreate = hasPermission(role as string, 'task_create', session.user.ccnlLevel, dbGrantedIds2)
    if (!canCreate) {
      return NextResponse.json({ error: 'Permesso insufficiente' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      title,
      description,
      assignedToId,
      assignedToRole,
      dueDate,
      priority,
      isRecurring,
      recurringType,
    } = parsed.data

    const task = await prisma.task.create({
      data: {
        restaurantId,
        assignedById: userId,
        title,
        description: description ?? null,
        assignedToId: assignedToId ?? null,
        assignedToRole: assignedToRole ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        isRecurring,
        recurringType: recurringType ?? null,
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, name: true, role: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, name: true },
        },
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
