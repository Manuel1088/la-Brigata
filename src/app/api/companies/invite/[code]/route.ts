import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'
import {
  inviteCodeStatus,
  isInviteCodeUsable,
  normalizeInviteCode,
} from '@/lib/invite-codes'

// GET /api/companies/invite/[code] → verifica validità (rotta pubblica, pre-login)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params
  const code = normalizeInviteCode(rawCode ?? '')
  if (!code) {
    return NextResponse.json({ valid: false, reason: 'invalid' }, { status: 400 })
  }

  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: { company: { select: { name: true } } },
  })

  if (!invite) {
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }

  const status = inviteCodeStatus(invite)
  if (!isInviteCodeUsable(invite)) {
    return NextResponse.json({ valid: false, reason: status })
  }

  // Non esponiamo dati sensibili: solo nome azienda + posti residui
  return NextResponse.json({
    valid: true,
    companyName: invite.company.name,
    remainingUses: Math.max(0, invite.maxUses - invite.usedCount),
  })
}

// DELETE /api/companies/invite/[code] → revoca (manager della stessa azienda)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!isManagerRole(String(session.user.role ?? ''))) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { code: rawCode } = await params
  const code = normalizeInviteCode(rawCode ?? '')
  if (!code) {
    return NextResponse.json({ error: 'Codice non valido' }, { status: 400 })
  }

  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    select: { id: true, companyId: true },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Codice non trovato' }, { status: 404 })
  }

  // Verifica che il manager appartenga alla stessa azienda del codice
  const caller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, restaurant: { select: { companyId: true } } },
  })
  const callerCompanyId = caller?.companyId ?? caller?.restaurant?.companyId ?? null
  if (!callerCompanyId || callerCompanyId !== invite.companyId) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
