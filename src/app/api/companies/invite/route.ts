import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'
import {
  generateInviteCode,
  serializeInviteCode,
  INVITE_DEFAULT_MAX_USES,
  INVITE_EXPIRY_DAYS,
} from '@/lib/invite-codes'

/** Risolve company + restaurant del chiamante e verifica che sia owner/manager. */
async function resolveManagerContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 401 }) }
  }
  if (!isManagerRole(String(session.user.role ?? ''))) {
    return { error: NextResponse.json({ error: 'Permesso negato' }, { status: 403 }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      restaurantId: true,
      restaurant: { select: { id: true, companyId: true } },
    },
  })

  const restaurantId = user?.restaurantId ?? user?.restaurant?.id ?? null
  const companyId = user?.companyId ?? user?.restaurant?.companyId ?? null

  if (!user || !restaurantId || !companyId) {
    return {
      error: NextResponse.json(
        { error: 'Nessuna azienda/ristorante associato al tuo account' },
        { status: 400 }
      ),
    }
  }

  return { userId: user.id, companyId, restaurantId }
}

// POST /api/companies/invite → genera un nuovo codice invito
export async function POST() {
  const ctx = await resolveManagerContext()
  if ('error' in ctx) return ctx.error

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Genera un codice univoco (retry in caso di collisione sull'unique)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    try {
      const created = await prisma.inviteCode.create({
        data: {
          code,
          companyId: ctx.companyId,
          restaurantId: ctx.restaurantId,
          createdBy: ctx.userId,
          expiresAt,
          maxUses: INVITE_DEFAULT_MAX_USES,
          usedCount: 0,
          isActive: true,
        },
      })
      return NextResponse.json({ success: true, invite: serializeInviteCode(created) })
    } catch (error) {
      const prismaCode =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code: string }).code
          : null
      if (prismaCode === 'P2002') continue // collisione codice → riprova
      console.error('POST /api/companies/invite error:', error)
      return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
    }
  }

  return NextResponse.json(
    { error: 'Impossibile generare un codice univoco, riprova' },
    { status: 500 }
  )
}

// GET /api/companies/invite → lista codici della propria azienda
export async function GET() {
  const ctx = await resolveManagerContext()
  if ('error' in ctx) return ctx.error

  const codes = await prisma.inviteCode.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    invites: codes.map(serializeInviteCode),
  })
}
