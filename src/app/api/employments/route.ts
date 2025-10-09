import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Ottieni employments con filtri
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const restaurantId = searchParams.get('restaurantId')
    const status = searchParams.get('status')

    // Costruisci il where clause
    const where: any = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (restaurantId) {
      where.restaurantId = restaurantId
    }
    
    if (status) {
      where.status = status
    }

    // Esegui la query
    const employments = await prisma.employment.findMany({
      where,
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
      employments: employments, // Mantieni compatibilità con codice esistente
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

    // Verifica se esiste già un employment per questa combinazione
    const existingEmployment = await prisma.employment.findFirst({
      where: {
        userId,
        restaurantId,
        status: {
          in: ['PENDING', 'APPROVED', 'ACTIVE'],
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
        status: 'PENDING',
        role: role || 'DIPENDENTE',
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

    // Prepara i dati per l'update
    const dataToUpdate: any = {
      updatedAt: new Date(),
    }
    
    if (status) {
      dataToUpdate.status = status
      dataToUpdate.reviewedAt = new Date()
      
      // Se viene approvato, imposta la data di inizio se non presente
      if (status === 'APPROVED' && !startDate) {
        dataToUpdate.startDate = new Date()
      }
    }
    
    if (reviewedBy) dataToUpdate.reviewedBy = reviewedBy
    if (startDate) dataToUpdate.startDate = new Date(startDate)
    if (endDate) dataToUpdate.endDate = new Date(endDate)
    if (role) dataToUpdate.role = role
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

    await prisma.employment.delete({
      where: {
        id,
      },
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
