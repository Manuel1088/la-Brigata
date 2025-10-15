import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { UserRole as PrismaUserRole } from '@prisma/client'

function toUserRole(roleString?: string): PrismaUserRole {
  switch ((roleString || '').toUpperCase()) {
    case 'PROPRIETARIO': return PrismaUserRole.PROPRIETARIO
    case 'DIRETTORE': return PrismaUserRole.DIRETTORE
    case 'MANAGER': return PrismaUserRole.MANAGER
    case 'RESPONSABILE_SALA': return PrismaUserRole.RESPONSABILE_SALA
    case 'HEAD_CHEF': return PrismaUserRole.HEAD_CHEF
    case 'HEAD_BARMAN': return PrismaUserRole.HEAD_BARMAN
    case 'HEAD_SOMMELIER': return PrismaUserRole.HEAD_SOMMELIER
    case 'CASSIERE': return PrismaUserRole.CASSIERE
    case 'DIPENDENTE': return PrismaUserRole.DIPENDENTE
    default: return PrismaUserRole.DIPENDENTE
  }
}

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
    if (candidate.userType !== 'CANDIDATE') {
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
        role: toUserRole(role),
        department: department || candidate.department || null,
        hierarchyLevel: candidate.hierarchyLevel ?? 5,
        isActive: true,
      }
    })

    return NextResponse.json({ success: true, userId: updated.id })
  } catch (error) {
    console.error('POST /api/candidates/hire error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


