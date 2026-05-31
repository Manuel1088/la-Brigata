import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { canManageRestaurantStaff, normalizeEmail } from '@/lib/employee-create'
import {
  generateInviteToken,
  inviteExpiryDate,
  serializePendingInvite,
} from '@/lib/pending-invite'
import { sendEmployeeInviteEmail } from '@/lib/employee-invite-email'

const createInviteSchema = z.object({
  firstName: z.string().min(1, 'Nome richiesto'),
  lastName: z.string().min(1, 'Cognome richiesto'),
  email: z.string().email('Email non valida'),
  role: z.string().min(1, 'Ruolo richiesto'),
  department: z.string().optional(),
  position: z.string().optional(),
})

/** Risolve company + restaurant del manager chiamante. */
async function resolveManagerContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      companyId: true,
      restaurantId: true,
      restaurant: { select: { id: true, name: true, companyId: true } },
    },
  })
  const restaurantId = user?.restaurantId ?? user?.restaurant?.id ?? null
  const companyId = user?.companyId ?? user?.restaurant?.companyId ?? null
  return {
    user,
    restaurantId,
    companyId,
    restaurantName: user?.restaurant?.name ?? 'La Brigata',
  }
}

function baseUrl(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
}

// GET /api/employees/invite → inviti in attesa della propria azienda
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!canManageRestaurantStaff(session.user.role)) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const ctx = await resolveManagerContext(session.user.id)
  if (!ctx.companyId) {
    return NextResponse.json({ success: true, invites: [] })
  }

  const invites = await prisma.pendingInvite.findMany({
    where: { companyId: ctx.companyId, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    invites: invites.map(serializePendingInvite),
  })
}

// POST /api/employees/invite → crea PendingInvite e invia email
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!canManageRestaurantStaff(session.user.role)) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const ctx = await resolveManagerContext(session.user.id)
  if (!ctx.companyId || !ctx.restaurantId) {
    return NextResponse.json(
      { error: 'Nessuna azienda/ristorante associato al tuo account' },
      { status: 400 }
    )
  }

  const email = normalizeEmail(parsed.data.email)

  // Dedupe 1: utente già registrato con questa email
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'Dipendente già registrato' }, { status: 409 })
  }

  // Dedupe 2: invito attivo già presente per questa email nella stessa azienda
  const existingInvite = await prisma.pendingInvite.findFirst({
    where: {
      email,
      companyId: ctx.companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (existingInvite) {
    return NextResponse.json(
      { error: 'Esiste già un invito attivo per questa email' },
      { status: 409 }
    )
  }

  const token = generateInviteToken()
  const invite = await prisma.pendingInvite.create({
    data: {
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      email,
      role: parsed.data.role,
      department: parsed.data.department ?? null,
      position: parsed.data.position ?? null,
      companyId: ctx.companyId,
      restaurantId: ctx.restaurantId,
      token,
      invitedBy: session.user.id,
      expiresAt: inviteExpiryDate(),
    },
  })

  const emailResult = await sendEmployeeInviteEmail({
    to: email,
    employeeName: `${invite.firstName} ${invite.lastName}`.trim(),
    inviterName: ctx.user?.name ?? 'Il tuo manager',
    restaurantName: ctx.restaurantName,
    inviteUrl: `${baseUrl()}/register?invite=${token}`,
  })

  return NextResponse.json({
    success: true,
    invite: serializePendingInvite(invite),
    emailSent: emailResult.emailSent,
    emailError: emailResult.error,
  })
}
