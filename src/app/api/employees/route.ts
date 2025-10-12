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
        baseSalary: true,
        contractType: true,
        contractTypeEnum: true,
        weeklyHours: true,
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
        baseSalary: e.baseSalary ? parseFloat(e.baseSalary.toString()) : undefined,
        contractType: e.contractType,
        contractTypeEnum: (e as any).contractTypeEnum,
        weeklyHours: (e as any).weeklyHours ?? undefined,
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
    const { id, name, email, phone, role, department, hourlyRate, baseSalary, contractType, startDate, notes, skills, level, employmentStartDate, employmentEndDate, weeklyHours, contractTypeEnum } = data

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
          ...(department && { department }),
          ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
          ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) }),
          ...(level !== undefined && { hierarchyLevel: Number(level) }),
          ...(contractType && { contractType }),
          ...(weeklyHours !== undefined && { weeklyHours: Number(weeklyHours) }),
          ...(contractTypeEnum && { contractTypeEnum }),
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

      // 3. Aggiorna Employment (start/end date) se fornite
      if (employmentStartDate || employmentEndDate) {
        const latestEmployment = await tx.employment.findFirst({
          where: { userId: id },
          orderBy: { createdAt: 'desc' }
        })
        if (latestEmployment) {
          await tx.employment.update({
            where: { id: latestEmployment.id },
            data: {
              ...(employmentStartDate && { startDate: new Date(employmentStartDate) }),
              ...(employmentEndDate && { endDate: new Date(employmentEndDate) })
            }
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

export async function DELETE(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let id: string | null = null
    let email: string | null = null
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      id = body?.id || null
      email = body?.email || null
    } else {
      const { searchParams } = new URL(request.url)
      id = searchParams.get('id')
      email = searchParams.get('email')
    }

    if (!id && !email) {
      return NextResponse.json({ error: 'Specificare id o email' }, { status: 400 })
    }

    const where: any = id ? { id } : { email: String(email).toLowerCase() }
    const user = await prisma.user.findUnique({ where })
    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Anonimizza e disattiva per evitare problemi di vincoli referenziali
    const ts = Date.now()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        email: `${user.email}.deleted.${ts}`,
        name: `DELETED_${user.name}`,
        notes: 'Account disattivato e anonimizzato',
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/employees error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}