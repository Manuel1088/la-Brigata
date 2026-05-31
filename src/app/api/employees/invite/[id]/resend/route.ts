import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { canManageRestaurantStaff } from '@/lib/employee-create'
import {
  generateInviteToken,
  inviteExpiryDate,
  serializePendingInvite,
} from '@/lib/pending-invite'
import { sendEmployeeInviteEmail } from '@/lib/employee-invite-email'

// POST /api/employees/invite/[id]/resend → rigenera token+scadenza e re-invia email
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!canManageRestaurantStaff(session.user.role)) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const { id } = await params

  const invite = await prisma.pendingInvite.findUnique({
    where: { id },
    include: {
      company: { select: { id: true } },
      restaurant: { select: { name: true } },
      inviter: { select: { name: true } },
    },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
  }
  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'Invito già accettato' }, { status: 409 })
  }

  // Il manager deve appartenere alla stessa azienda dell'invito
  const caller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, restaurant: { select: { companyId: true } } },
  })
  const callerCompanyId = caller?.companyId ?? caller?.restaurant?.companyId ?? null
  if (!callerCompanyId || callerCompanyId !== invite.companyId) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const token = generateInviteToken()
  const updated = await prisma.pendingInvite.update({
    where: { id: invite.id },
    data: { token, expiresAt: inviteExpiryDate() },
  })

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
  const emailResult = await sendEmployeeInviteEmail({
    to: updated.email,
    employeeName: `${updated.firstName} ${updated.lastName}`.trim(),
    inviterName: session.user.name ?? invite.inviter?.name ?? 'Il tuo manager',
    restaurantName: invite.restaurant?.name ?? 'La Brigata',
    inviteUrl: `${base}/register?invite=${token}`,
  })

  return NextResponse.json({
    success: true,
    invite: serializePendingInvite(updated),
    emailSent: emailResult.emailSent,
    emailError: emailResult.error,
  })
}
