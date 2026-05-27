import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { EmploymentStatus as PrismaEmploymentStatus, UserRole as PrismaUserRole } from '@prisma/client'
import { isManagerRole } from '@/lib/roles'
import { restaurantIdsForManager } from '@/lib/restaurant-access'

// GET - Ottieni employments con filtri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, companyId: true, role: true },
    })
    if (!caller) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const restaurantId = searchParams.get('restaurantId')
    const status = searchParams.get('status')

    // Costruisci il where clause in modo pulito
    const statusUpper = status ? status.toUpperCase() : undefined
    const statusFilter = statusUpper && (Object.values(PrismaEmploymentStatus) as string[]).includes(statusUpper)
      ? { status: statusUpper as PrismaEmploymentStatus }
      : {}

    // Scoping: i non-manager vedono solo i propri employment; i manager vedono quelli del loro ristorante/company
    let scopedWhere: Record<string, unknown> = {}
    if (isManagerRole(caller.role)) {
      const allowedRestaurantIds = await restaurantIdsForManager(caller)
      if (restaurantId) {
        if (!allowedRestaurantIds.includes(restaurantId)) {
          return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
        }
        scopedWhere = { restaurantId }
      } else if (userId) {
        // Manager può vedere employment di un utente del proprio ristorante
        scopedWhere = { userId, restaurantId: { in: allowedRestaurantIds } }
      } else {
        scopedWhere = { restaurantId: { in: allowedRestaurantIds } }
      }
    } else {
      // Dipendente: vede solo i propri
      scopedWhere = { userId: session.user.id }
    }

    const employments = await prisma.employment.findMany({
      where: {
        ...statusFilter,
        ...scopedWhere,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            ccnlLevel: true,
            position: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      employments: employments,
      data: employments,
      count: employments.length,
    })
  } catch (error) {
    console.error('Errore nel recupero employments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel recupero degli employments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo employment (richiesta di lavoro)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    
    const {
      userId,
      restaurantId,
      role,
      department,
      startDate,
    } = body

    // Validazione dati
    if (!userId || !restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId e restaurantId sono obbligatori',
        },
        { status: 400 }
      )
    }

    // Un utente può creare solo il proprio employment (o un manager può farlo per i suoi)
    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, companyId: true, role: true },
    })
    if (!caller) return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 })

    const isSelf = session.user.id === userId
    const isManagerCreating = isManagerRole(caller.role)
    if (!isSelf && !isManagerCreating) {
      return NextResponse.json({ success: false, error: 'Permesso negato' }, { status: 403 })
    }

    // Verifica se esiste già un employment per questa combinazione
    const existingEmployment = await prisma.employment.findFirst({
      where: {
        userId,
        restaurantId,
        status: {
          in: [
            PrismaEmploymentStatus.PENDING,
            PrismaEmploymentStatus.APPROVED,
            PrismaEmploymentStatus.ACTIVE,
          ],
        },
      },
    })

    if (existingEmployment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Esiste già una richiesta di lavoro per questo ristorante',
          data: existingEmployment,
        },
        { status: 409 }
      )
    }

    // Crea il nuovo employment
    const employment = await prisma.employment.create({
      data: {
        userId,
        restaurantId,
        status: PrismaEmploymentStatus.PENDING,
        role: ((role || 'DIPENDENTE').toUpperCase() as PrismaUserRole),
        department: department || null,
        startDate: startDate ? new Date(startDate) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: employment,
        message: 'Richiesta di lavoro creata con successo',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Errore nella creazione employment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nella creazione della richiesta di lavoro',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PATCH - Aggiorna employment (approva, rifiuta, ecc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 })
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, companyId: true, role: true },
    })
    if (!caller || !isManagerRole(caller.role)) {
      return NextResponse.json({ success: false, error: 'Permesso negato' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, reviewedBy, startDate, endDate, role, department } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID employment mancante',
        },
        { status: 400 }
      )
    }

    // Verifica che l'employment appartiene a un ristorante del manager
    const employmentCheck = await prisma.employment.findUnique({ where: { id }, select: { restaurantId: true } })
    if (!employmentCheck) {
      return NextResponse.json({ success: false, error: 'Employment non trovato' }, { status: 404 })
    }
    const allowedIds = await restaurantIdsForManager(caller)
    if (!allowedIds.includes(employmentCheck.restaurantId)) {
      return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 })
    }

    // Prepara i dati per l'update
    const dataToUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    
    if (status) {
      const st = status.toUpperCase()
      if ((Object.values(PrismaEmploymentStatus) as string[]).includes(st)) {
        dataToUpdate.status = st as PrismaEmploymentStatus
      }
      dataToUpdate.reviewedAt = new Date()
      
      // Se viene approvato, imposta la data di inizio se non presente
      if (st === 'APPROVED' && !startDate) {
        dataToUpdate.startDate = new Date()
      }
    }
    
    if (reviewedBy) dataToUpdate.reviewedBy = reviewedBy
    if (startDate) dataToUpdate.startDate = new Date(startDate)
    if (endDate) dataToUpdate.endDate = new Date(endDate)
    if (role) {
      const r = (role as string).toUpperCase()
      if ((Object.values(PrismaUserRole) as string[]).includes(r)) {
        dataToUpdate.role = r as PrismaUserRole
      }
    }
    if (department !== undefined) dataToUpdate.department = department

    const employment = await prisma.employment.update({
      where: {
        id,
      },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: employment,
      message: 'Employment aggiornato con successo',
    })
  } catch (error) {
    console.error('Errore nell\'aggiornamento employment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nell\'aggiornamento dell\'employment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Elimina employment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 })
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true, companyId: true, role: true },
    })
    if (!caller || !isManagerRole(caller.role)) {
      return NextResponse.json({ success: false, error: 'Permesso negato' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID employment mancante',
        },
        { status: 400 }
      )
    }

    const employment = await prisma.employment.findUnique({ where: { id }, select: { restaurantId: true } })
    if (!employment) {
      return NextResponse.json({ success: false, error: 'Employment non trovato' }, { status: 404 })
    }
    const allowedIds = await restaurantIdsForManager(caller)
    if (!allowedIds.includes(employment.restaurantId)) {
      return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 })
    }

    await prisma.employment.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Employment eliminato con successo',
    })
  } catch (error) {
    console.error('Errore nell\'eliminazione employment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nell\'eliminazione dell\'employment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
