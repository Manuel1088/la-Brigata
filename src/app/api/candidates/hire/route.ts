import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidateId, fiscalCode, department, role, restaurantName } = body as {
      candidateId: string
      fiscalCode: string
      department?: string
      role?: string
      restaurantName?: string
    }

    if (!candidateId || !fiscalCode) {
      return NextResponse.json({ error: 'candidateId e fiscalCode sono obbligatori' }, { status: 400 })
    }

    const candidate = await prisma.user.findUnique({ where: { id: candidateId } })
    if (!candidate) return NextResponse.json({ error: 'Candidato non trovato' }, { status: 404 })
    if ((candidate as any).userType !== 'CANDIDATE') {
      return NextResponse.json({ error: 'L’utente non è in stato CANDIDATE' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({ where: { fiscalCode } })
    if (!company) return NextResponse.json({ error: 'Azienda non trovata per questo codice fiscale' }, { status: 400 })

    // Trova o crea un ristorante collegato all’azienda
    let restaurant = await prisma.restaurant.findFirst({ where: { companyId: company.id } })
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          name: restaurantName && restaurantName.trim().length > 0 ? restaurantName : `${company.name} - Sede Principale`,
          companyId: company.id,
        }
      })
    }

    const updated = await prisma.user.update({
      where: { id: candidateId },
      data: {
        userType: 'EMPLOYEE',
        companyId: company.id,
        restaurantId: restaurant.id,
        role: (role as any) || 'DIPENDENTE',
        department: department || (candidate as any).department || null,
        hierarchyLevel: (candidate as any).hierarchyLevel ?? 5,
        isActive: true,
      }
    })

    return NextResponse.json({ success: true, userId: updated.id })
  } catch (error) {
    console.error('POST /api/candidates/hire error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


