import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const {
      name,
      email,
      phone,
      password,
      department,
      candidateData
    } = data as {
      name: string
      email: string
      phone?: string
      password: string
      department?: string
      candidateData?: unknown
    }

    // Verifica se email già esiste
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // I candidati non hanno ancora un ristorante aziendale: crea un contenitore neutro senza companyId
    const placeholder = await prisma.restaurant.create({
      data: {
        name: `Candidato — ${name}`,
      }
    })

    // Crea candidato (richiede restaurantId obbligatorio dallo schema)
    const candidate = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'DIPENDENTE',
        userType: 'CANDIDATE',
        hierarchyLevel: 1,
        department: department || null,
        phone: phone || null,
        isJobSeeking: true,
        isActive: true,
        restaurantId: placeholder.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      candidateId: candidate.id,
      message: 'Profilo candidato creato con successo!'
    })

  } catch (error) {
    console.error('Errore registrazione candidato:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


