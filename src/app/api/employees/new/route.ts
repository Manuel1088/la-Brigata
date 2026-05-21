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
import { isCcnlLevel } from '@/lib/ccnl'
import { normalizeDepartmentInput } from '@/lib/restaurant-roles'
import type { CCNLLevel, ContractType } from '@prisma/client'
import { z } from 'zod'
import {
  mapToContractTypeEnum,
  requiresContractEndDate,
  type ContractDuration,
  type WorkSchedule,
} from '@/lib/employee-contract'

const createEmployeeSchema = z
  .object({
    firstName: z.string().min(1, 'Nome richiesto'),
    lastName: z.string().min(1, 'Cognome richiesto'),
    email: z.string().email('Email non valida'),
    phone: z.string().optional(),
    role: z.string().min(1),
    position: z.string().optional(),
    department: z.enum([
      'cucina',
      'sala',
      'bar',
      'sommellerie',
      'accoglienza',
      'gestione',
      'beverage',
      'dirigenti',
    ]),
    ccnlLevel: z.string().optional(),
    hourlyRate: z.number().min(0).optional(),
    expenseAllowance: z.number().min(0).optional(),
    workSchedule: z.enum(['full-time', 'part-time', 'stage', 'apprendistato']),
    contractDuration: z.enum(['indeterminato', 'determinato']).optional(),
    startDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    skills: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const duration = (data.contractDuration ?? 'indeterminato') as ContractDuration
    const schedule = data.workSchedule as WorkSchedule
    if (requiresContractEndDate(schedule, duration) && !data.contractEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data fine contratto obbligatoria',
        path: ['contractEndDate'],
      })
    }
    if (schedule === 'stage' && (data.expenseAllowance == null || data.expenseAllowance < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rimborso spese obbligatorio per stage/tirocinio',
        path: ['expenseAllowance'],
      })
    }
    if (data.contractEndDate && data.startDate) {
      const start = new Date(data.startDate)
      const end = new Date(data.contractEndDate)
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La data fine deve essere successiva alla data inizio',
          path: ['contractEndDate'],
        })
      }
    }
  })

/** POST /api/employees/new — crea User + Employee collegati */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const actorRole = session.user.role
    if (!canManageRestaurantStaff(actorRole)) {
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
      position: positionLabel,
      department,
      ccnlLevel: ccnlLevelInput,
      hourlyRate,
      expenseAllowance,
      workSchedule,
      contractDuration,
      startDate,
      contractEndDate,
      skills,
      notes,
    } = parsed.data

    const restaurantId = session.user.restaurantId ?? undefined
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

    const ccnlLevel: CCNLLevel | undefined =
      workSchedule === 'apprendistato'
        ? 'LIVELLO_6'
        : ccnlLevelInput && isCcnlLevel(ccnlLevelInput)
          ? (ccnlLevelInput as CCNLLevel)
          : undefined

    const storedDepartment = normalizeDepartmentInput(department)
    const userRole = toUserRole(roleInput)
    const employeeRole = toEmployeeRole(userRole, storedDepartment)
    const hierarchyLevel = hierarchyLevelForUserRole(userRole)
    const hashedPassword = await hash(DEFAULT_EMPLOYEE_PASSWORD, 12)
    const employeeId = buildEmployeeId(fullName)
    const parsedStartDate = startDate ? new Date(startDate) : new Date()
    const parsedContractEndDate = contractEndDate ? new Date(contractEndDate) : null
    const duration = (contractDuration ?? 'indeterminato') as ContractDuration
    const contractTypeEnum = mapToContractTypeEnum(
      workSchedule as WorkSchedule,
      duration
    ) as ContractType | null

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
          department: storedDepartment,
          phone: phone?.trim() || null,
          hourlyRate: workSchedule === 'stage' ? null : (hourlyRate ?? null),
          baseSalary:
            workSchedule === 'stage' && expenseAllowance != null
              ? expenseAllowance
              : null,
          contractType: workSchedule,
          contractTypeEnum,
          contractEndDate: parsedContractEndDate,
          startDate: parsedStartDate,
          notes: notes?.trim() || null,
          userType: 'EMPLOYEE',
          isActive: true,
          position: positionLabel?.trim() || roleInput.replace(/_/g, ' '),
          ccnlLevel: ccnlLevel ?? null,
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
          ccnlLevel: ccnlLevel ?? null,
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
          department: storedDepartment,
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
