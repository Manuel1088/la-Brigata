import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isPendingInviteUsable } from '@/lib/pending-invite'

// GET /api/employees/invite/verify?token=TOKEN  (pubblica, pre-login)
// Verifica un invito e restituisce i dati per precompilare la registrazione.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim()
  if (!token) {
    return NextResponse.json({ valid: false, error: 'missing_token' }, { status: 400 })
  }

  const invite = await prisma.pendingInvite.findUnique({
    where: { token },
    include: {
      company: { select: { name: true } },
      restaurant: { select: { name: true } },
    },
  })

  if (!invite || !isPendingInviteUsable(invite)) {
    return NextResponse.json({ valid: false, error: 'invalid_or_expired' })
  }

  return NextResponse.json({
    valid: true,
    token,
    firstName: invite.firstName,
    lastName: invite.lastName,
    email: invite.email,
    role: invite.role,
    department: invite.department,
    position: invite.position,
    companyName: invite.company.name,
    restaurantName: invite.restaurant.name,
  })
}
