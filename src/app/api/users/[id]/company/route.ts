import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const companySelect = {
  id: true,
  name: true,
  fiscalCode: true,
  address: true,
  phone: true,
  email: true,
} as const

const restaurantSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  company: { select: companySelect },
} as const

type CompanyPayload = {
  id: string
  name: string
  fiscalCode: string
  address: string | null
  phone: string | null
  email: string | null
}

/** Company diretta sull'utente, altrimenti da ristorante principale o primo ristorante attivo. */
function resolveCompany(
  userCompany: CompanyPayload | null,
  primaryRestaurant: { company: CompanyPayload | null } | null,
  restaurants: Array<{ company: CompanyPayload | null } | null>
): CompanyPayload | null {
  if (userCompany) return userCompany
  if (primaryRestaurant?.company) return primaryRestaurant.company
  for (const r of restaurants) {
    if (r?.company) return r.company
  }
  return null
}

// GET - Ottieni il ristorante principale e gli altri ristoranti dove lavora l'utente (OTTIMIZZATO)
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

    // ✅ SINGLE OPTIMIZED QUERY con select specifico
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        // ✅ Company: solo campi necessari
        company: { select: companySelect },
        restaurant: { select: restaurantSelect },
        employments: {
          where: {
            status: { in: ['APPROVED', 'ACTIVE'] },
          },
          select: {
            id: true,
            status: true,
            role: true,
            restaurant: { select: restaurantSelect },
          }
        }
      }
    })

    if (!userData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Utente non trovato',
        },
        { status: 404 }
      )
    }

    // ✅ Costruisci array restaurants (già filtrato e ottimizzato)
    const allRestaurants = [
      userData.restaurant,
      ...userData.employments.map(emp => emp.restaurant)
    ].filter(Boolean) // Rimuovi null

    // ✅ Deduplica usando Set (più veloce di Map)
    const uniqueRestaurants = Array.from(
      new Set(allRestaurants.map(r => r!.id))
    ).map(id => allRestaurants.find(r => r!.id === id)!)

    const company = resolveCompany(
      userData.company,
      userData.restaurant,
      uniqueRestaurants
    )

    // Se non ha ristoranti
    if (uniqueRestaurants.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        company,
        restaurant: null,
        restaurants: [],
        hasMultiple: false,
        message: 'Utente non ancora associato a nessun ristorante',
      })
    }

    // Se ha solo un ristorante
    if (uniqueRestaurants.length === 1) {
      return NextResponse.json({
        success: true,
        data: uniqueRestaurants[0],
        restaurant: uniqueRestaurants[0],
        company,
        hasMultiple: false,
      })
    }

    // Se ha più ristoranti
    return NextResponse.json({
      success: true,
      data: uniqueRestaurants,
      restaurants: uniqueRestaurants,
      restaurant: userData.restaurant,
      company,
      primary: userData.restaurant,
      hasMultiple: true,
      count: uniqueRestaurants.length,
      employments: userData.employments,
      message: 'Utente associato a più ristoranti',
    })
  } catch (error) {
    console.error('Error fetching company data:', error)
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
