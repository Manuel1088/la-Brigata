import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Ottieni il ristorante principale e gli altri ristoranti dove lavora l'utente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID utente non valido',
        },
        { status: 400 }
      )
    }

    // Cerca l'utente con ristorante e azienda
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        restaurant: true,
        company: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Utente non trovato',
        },
        { status: 404 }
      )
    }

    // Cerca anche gli employments attivi in altri ristoranti (se la tabella esiste)
    let employments: any[] = []
    try {
      employments = await (prisma as any).employment.findMany({
        where: {
          userId: userId,
          status: {
            in: ['APPROVED', 'ACTIVE'],
          },
        },
        include: {
          restaurant: true,
        },
      })
    } catch (employmentError) {
      // Tabella employment potrebbe non esistere ancora
      console.log('Employment table not found, using only primary restaurant')
      employments = []
    }

    const restaurants = [user.restaurant, ...employments.map((e: any) => e.restaurant)]
    
    // Rimuovi duplicati e null
    const uniqueRestaurants = Array.from(
      new Map(restaurants.filter(r => r !== null).map(r => [r!.id, r])).values()
    )

    // ✅ FIX: Restituisci 200 anche se non ci sono ristoranti (utente valido ma non ancora assegnato)
    if (uniqueRestaurants.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          company: user.company,
          restaurant: null,
          message: 'Utente non ancora associato a nessun ristorante',
          hasMultiple: false,
        },
        { status: 200 } // ✅ 200 invece di 404
      )
    }

    // Prepara i dati azienda
    const companyInfo = user.company ? {
      id: user.company.id,
      name: user.company.name,
      fiscalCode: user.company.fiscalCode,
      address: user.company.address,
      phone: user.company.phone,
      email: user.company.email
    } : null

    // Se ha solo un ristorante, restituiscilo con dati azienda
    if (uniqueRestaurants.length === 1) {
      return NextResponse.json({
        success: true,
        data: uniqueRestaurants[0],
        restaurant: uniqueRestaurants[0],
        company: companyInfo,
        hasMultiple: false,
      })
    }

    // Altrimenti restituisci tutti i ristoranti con dati azienda
    return NextResponse.json({
      success: true,
      data: uniqueRestaurants,
      restaurants: uniqueRestaurants,
      restaurant: user.restaurant,
      company: companyInfo,
      primary: user.restaurant,
      hasMultiple: true,
      count: uniqueRestaurants.length,
      message: 'Utente associato a più ristoranti',
    })
  } catch (error) {
    console.error('Errore nel recupero ristorante:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel recupero del ristorante',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
