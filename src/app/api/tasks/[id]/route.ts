import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'
import { loadExpandedDbPermissionIds } from '@/lib/user-permissions-db'
import { z } from 'zod'

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  assignedToRole: z.string().max(100).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['ALTA', 'MEDIA', 'BASSA']).optional(),
  status: z.enum(['DA_FARE', 'IN_CORSO', 'COMPLETATO']).optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['GIORNALIERO', 'SETTIMANALE', 'MENSILE']).nullable().optional(),
})

/** PATCH /api/tasks/[id] — aggiorna status/campi */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    const { id } = await params
    const { id: userId, restaurantId, role } = session.user
    const userRole = (role as string) ?? ''

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task || task.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    // Chiunque può completare i propri task (o task assegnati al proprio ruolo)
    const isAssignedToMe =
      task.assignedToId === userId ||
      task.assignedToRole === userRole ||
      (task.assignedToId === null && task.assignedToRole === null)

    const dbGrantedIds = await loadExpandedDbPermissionIds(userId)
    const isManager =
      isManagerRole(userRole) ||
      hasPermission(userRole, 'task_manage', session.user.ccnlLevel, dbGrantedIds)

    // Se non ha task_manage, può modificare solo lo status di task assegnati a sé
    if (!isManager) {
      const allowedKeys = Object.keys(data)
      const onlyStatus = allowedKeys.every((k) => k === 'status')
      if (!onlyStatus || !isAssignedToMe) {
        return NextResponse.json({ error: 'Permesso insufficiente' }, { status: 403 })
      }
    }

    // Imposta completedAt e completedById se status → COMPLETATO
    let completedAt: Date | null | undefined = undefined
    let completedById: string | null | undefined = undefined
    if (data.status === 'COMPLETATO' && task.status !== 'COMPLETATO') {
      completedAt = new Date()
      completedById = userId
    } else if (data.status && data.status !== 'COMPLETATO' && task.status === 'COMPLETATO') {
      completedAt = null
      completedById = null
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.assignedToRole !== undefined && { assignedToRole: data.assignedToRole }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.recurringType !== undefined && { recurringType: data.recurringType }),
        ...(completedAt !== undefined && { completedAt }),
        ...(completedById !== undefined && { completedById }),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, name: true, role: true },
        },
        completedBy: {
          select: { id: true, firstName: true, lastName: true, name: true },
        },
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/** DELETE /api/tasks/[id] — elimina task (solo chi lo ha creato o manager) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    const { id } = await params
    const { id: userId, restaurantId, role } = session.user
    const userRole = (role as string) ?? ''

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task || task.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    const dbGrantedIds = await loadExpandedDbPermissionIds(userId)
    const isCreator = task.assignedById === userId
    const isManager =
      isManagerRole(userRole) ||
      hasPermission(userRole, 'task_manage', session.user.ccnlLevel, dbGrantedIds)

    if (!isCreator && !isManager) {
      return NextResponse.json({ error: 'Permesso insufficiente' }, { status: 403 })
    }

    await prisma.task.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
