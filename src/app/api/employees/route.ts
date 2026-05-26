import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { ProfilePersonalPayload } from '@/lib/profile-fields'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const restaurantId = searchParams.get('restaurantId')
    const department = searchParams.get('department') || undefined
    const activeParam = searchParams.get('active')

    if (!companyId && !restaurantId) {
      return NextResponse.json(
        { error: 'companyId or restaurantId is required' },
        { status: 400 }
      )
    }

    const employees = await prisma.user.findMany({
      where: {
        ...(companyId && { companyId }),
        ...(restaurantId && { restaurantId }),
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
        ccnlLevel: true,
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

    // Se viene richiesto 'active=true', escludi chi ha Employment PENDING (mostra solo APPROVED/ACTIVE)
    let filteredEmployees = employees
    if (activeParam === 'true') {
      const userIds = employees.map(e => e.id)
      if (userIds.length > 0) {
        const employments = await prisma.employment.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: 'desc' }
        })
        const latestByUser: Record<string, { status: string; userId: string }> = {}
        for (const emp of employments) {
          if (!latestByUser[emp.userId]) latestByUser[emp.userId] = emp
        }
        const accepted = new Set(['APPROVED', 'ACTIVE'])
        filteredEmployees = employees.filter(e => {
          const latest = latestByUser[e.id]
          // Nessun employment = dipendente diretto del ristorante (es. import seed)
          if (!latest) return true
          return accepted.has(latest.status)
        })
      } else {
        filteredEmployees = []
      }
    }

    return NextResponse.json({ 
      employees: filteredEmployees.map(e => ({
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
        contractTypeEnum: e.contractTypeEnum as string | null | undefined,
        ccnlLevel: e.ccnlLevel ? String(e.ccnlLevel) : null,
        weeklyHours: e.weeklyHours ?? undefined,
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

function buildPersonalUpdateData(
  data: ProfilePersonalPayload
): Prisma.UserUpdateInput {
  const update: Prisma.UserUpdateInput = {}

  if (data.name !== undefined) update.name = String(data.name).trim()
  if (data.phone !== undefined) update.phone = data.phone?.trim() || null
  if (data.secondaryEmail !== undefined) {
    update.secondaryEmail = data.secondaryEmail?.trim() || null
  }
  if (data.birthDate !== undefined) {
    update.birthDate = data.birthDate ? new Date(data.birthDate) : null
  }
  if (data.birthPlace !== undefined) update.birthPlace = data.birthPlace?.trim() || null
  if (data.maritalStatus !== undefined) {
    update.maritalStatus = data.maritalStatus?.trim() || null
  }
  if (data.childrenCount !== undefined) {
    if (data.childrenCount === null || data.childrenCount === '') {
      update.childrenCount = null
    } else {
      const n = Number(data.childrenCount)
      update.childrenCount = Number.isNaN(n) ? null : Math.max(0, n)
    }
  }
  if (data.education !== undefined) update.education = data.education?.trim() || null
  if (data.languages !== undefined) update.languages = data.languages?.trim() || null
  if (data.hobbies !== undefined) update.hobbies = data.hobbies?.trim() || null
  if (data.sports !== undefined) update.sports = data.sports?.trim() || null
  if (data.emergencyContact !== undefined) {
    update.emergencyContact = data.emergencyContact?.trim() || null
  }
  if (data.emergencyPhone !== undefined) {
    update.emergencyPhone = data.emergencyPhone?.trim() || null
  }

  return update
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const data = await request.json()
    const {
      id,
      name,
      email,
      phone,
      role,
      department,
      hourlyRate,
      baseSalary,
      contractType,
      startDate,
      notes,
      skills,
      level,
      employmentStartDate,
      employmentEndDate,
      weeklyHours,
      contractTypeEnum,
      secondaryEmail,
      birthDate,
      birthPlace,
      maritalStatus,
      childrenCount,
      education,
      languages,
      hobbies,
      sports,
      emergencyContact,
      emergencyPhone,
    } = data

    if (!id) {
      return NextResponse.json({ error: 'ID dipendente richiesto' }, { status: 400 })
    }

    const isSelfUpdate = session?.user?.id === id
    const personalPayload: ProfilePersonalPayload = {
      id,
      name,
      phone,
      secondaryEmail,
      birthDate,
      birthPlace,
      maritalStatus,
      childrenCount,
      education,
      languages,
      hobbies,
      sports,
      emergencyContact,
      emergencyPhone,
    }

    if (isSelfUpdate && !session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Usa una transazione per aggiornare user e skills insieme
    const result = await prisma.$transaction(async (tx) => {
      const userData: Prisma.UserUpdateInput = isSelfUpdate
        ? buildPersonalUpdateData(personalPayload)
        : {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone !== undefined && { phone: phone || null }),
            ...(role && { role }),
            ...(department && { department }),
            ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
            ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) }),
            ...(level !== undefined && { hierarchyLevel: Number(level) }),
            ...(contractType && { contractType }),
            ...(weeklyHours !== undefined && { weeklyHours: Number(weeklyHours) }),
            ...(contractTypeEnum && { contractTypeEnum }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(notes !== undefined && { notes }),
            ...buildPersonalUpdateData(personalPayload),
          }

      // 1. Aggiorna il dipendente
      const updatedEmployee = await tx.user.update({
        where: { id },
        data: userData,
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
      employee: {
        id: result.id,
        name: result.name,
        email: result.email,
        phone: result.phone,
        secondaryEmail: result.secondaryEmail,
        birthDate: result.birthDate,
        birthPlace: result.birthPlace,
        maritalStatus: result.maritalStatus,
        childrenCount: result.childrenCount,
        education: result.education,
        languages: result.languages,
        hobbies: result.hobbies,
        sports: result.sports,
        emergencyContact: result.emergencyContact,
        emergencyPhone: result.emergencyPhone,
        avatar: result.avatar,
      },
      message: 'Profilo aggiornato con successo',
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

    const whereUnique: Prisma.UserWhereUniqueInput = id ? { id } : { email: String(email).toLowerCase() }
    const user = await prisma.user.findUnique({ where: whereUnique })
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