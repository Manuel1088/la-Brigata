import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const department = searchParams.get('department') || undefined
    const activeParam = searchParams.get('active')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const employees = await prisma.user.findMany({
      where: {
        companyId,
        ...(department && { department }),
        ...(activeParam !== null && { isActive: activeParam === 'true' })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        hierarchyLevel: true,
        department: true,
        isActive: true,
        avatar: true,
        hourlyRate: true,
        contractType: true,
        startDate: true,
        notes: true,
        skills: {
          select: {
            skill: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ 
      employees: employees.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone,
        role: e.role,
        level: e.hierarchyLevel,
        department: e.department,
        isActive: e.isActive,
        avatar: e.avatar || '👤',
        hourlyRate: e.hourlyRate ? parseFloat(e.hourlyRate.toString()) : 0,
        contractType: e.contractType,
        startDate: e.startDate,
        notes: e.notes,
        skills: e.skills.map(s => s.skill)
      })) 
    })
  } catch (error) {
    console.error('GET /api/employees error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, name, email, phone, role, hourlyRate, contractType, startDate, notes, skills } = data

    if (!id) {
      return NextResponse.json({ error: 'ID dipendente richiesto' }, { status: 400 })
    }

    // Usa una transazione per aggiornare user e skills insieme
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aggiorna il dipendente
      const updatedEmployee = await tx.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(role && { role }),
          ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
          ...(contractType && { contractType }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(notes !== undefined && { notes })
        }
      })

      // 2. Aggiorna le skills se fornite
      if (skills !== undefined && Array.isArray(skills)) {
        // Elimina tutte le skills esistenti
        await tx.employeeSkill.deleteMany({
          where: { userId: id }
        })

        // Ricrea le skills aggiornate
        if (skills.length > 0) {
          await tx.employeeSkill.createMany({
            data: skills.map((skill: string) => ({
              userId: id,
              skill
            }))
          })
        }
      }

      return updatedEmployee
    })

    return NextResponse.json({ 
      success: true,
      employee: result,
      message: 'Profilo aggiornato con successo' 
    })

  } catch (error) {
    console.error('PUT /api/employees error:', error)
    return NextResponse.json({ 
      error: 'Errore nel salvataggio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}