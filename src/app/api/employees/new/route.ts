import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash } from 'bcryptjs'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { logCreate } from '@/lib/audit'
import {
  buildEmployeeId,
  canManageRestaurantStaff,
  DEFAULT_EMPLOYEE_PASSWORD,
  hierarchyLevelForUserRole,
  normalizeEmail,
  toEmployeeRole,
  toUserRole,
} from '@/lib/employee-create'
import { sendEmployeeWelcomeEmail } from '@/lib/employee-welcome-email'
import { z } from 'zod'

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'Nome richiesto'),
  lastName: z.string().min(1, 'Cognome richiesto'),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
  role: z.string().min(1),
  department: z.enum(['cucina', 'sala', 'beverage', 'accoglienza', 'dirigenti']),
  hourlyRate: z.number().min(0).optional(),
  contractType: z.string().optional(),
  startDate: z.string().optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().optional(),
  restaurantId: z.string().optional(),
})

/** POST /api/employees/new — crea User + Employee collegati */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const actorRole = String(session.user.role ?? '')
    if (actorRole !== 'ADMIN' && !canManageRestaurantStaff(actorRole)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createEmployeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      role: roleInput,
      department,
      hourlyRate,
      contractType,
      startDate,
      skills,
      notes,
      restaurantId: bodyRestaurantId,
    } = parsed.data

    const restaurantId =
      bodyRestaurantId ?? session.user.restaurantId ?? undefined
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Ristorante non associato alla sessione' },
        { status: 400 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, companyId: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 })
    }

    const normalizedEmail = normalizeEmail(email)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 409 }
      )
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: { name: fullName, restaurantId },
    })
    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Esiste già un dipendente con questo nome nel ristorante' },
        { status: 409 }
      )
    }

    const userRole = toUserRole(roleInput)
    const employeeRole = toEmployeeRole(userRole, department)
    const hierarchyLevel = hierarchyLevelForUserRole(userRole)
    const hashedPassword = await hash(DEFAULT_EMPLOYEE_PASSWORD, 12)
    const employeeId = buildEmployeeId(fullName)
    const parsedStartDate = startDate ? new Date(startDate) : new Date()

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: fullName,
          password: hashedPassword,
          role: userRole,
          hierarchyLevel,
          restaurantId,
          companyId: restaurant.companyId,
          department,
          phone: phone?.trim() || null,
          hourlyRate: hourlyRate ?? null,
          contractType: contractType ?? 'full-time',
          startDate: parsedStartDate,
          notes: notes?.trim() || null,
          userType: 'EMPLOYEE',
          isActive: true,
          position: roleInput.replace(/_/g, ' '),
        },
      })

      const employee = await tx.employee.create({
        data: {
          id: employeeId,
          name: fullName,
          email: normalizedEmail,
          phone: phone?.trim() || null,
          score: 5,
          restDays: [],
          role: employeeRole,
          restaurantId,
          userId: user.id,
          isActive: true,
          canInsertTips: false,
          canEditTips: false,
          canDeleteTips: false,
          canViewAll: userRole === 'MANAGER',
          updatedAt: new Date(),
          createdBy: session.user!.id,
        },
      })

      await tx.employment.create({
        data: {
          userId: user.id,
          restaurantId,
          status: 'ACTIVE',
          role: userRole,
          department,
          startDate: parsedStartDate,
          reviewedAt: new Date(),
          reviewedBy: session.user!.id,
        },
      })

      if (skills && skills.length > 0) {
        await tx.employeeSkill.createMany({
          data: skills.map((skill) => ({
            userId: user.id,
            skill: skill.trim(),
          })),
          skipDuplicates: true,
        })
      }

      return { user, employee }
    })

    const baseUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

    const emailResult = await sendEmployeeWelcomeEmail({
      to: normalizedEmail,
      employeeName: fullName,
      restaurantName: restaurant.name,
      temporaryPassword: DEFAULT_EMPLOYEE_PASSWORD,
      loginUrl: `${baseUrl}/login`,
    })

    await logCreate(session.user.id, 'employees', result.employee.id, {
      userId: result.user.id,
      email: normalizedEmail,
      restaurantId,
    })

    return NextResponse.json({
      success: true,
      message: emailResult.emailSent
        ? `Dipendente creato. Email di accesso inviata a ${normalizedEmail}.`
        : `Dipendente creato. Condividi le credenziali con ${fullName} (email non inviata: servizio non configurato).`,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      employee: {
        id: result.employee.id,
        name: result.employee.name,
      },
      credentials: {
        email: normalizedEmail,
        temporaryPassword: DEFAULT_EMPLOYEE_PASSWORD,
      },
      emailSent: emailResult.emailSent,
      emailError: emailResult.error,
    })
  } catch (error) {
    console.error('POST /api/employees/new error:', error)
    return NextResponse.json(
      {
        error: 'Errore nella creazione del dipendente',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
