import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { isManagerRole } from '@/lib/roles'
import { assertManagerOfUser } from '@/lib/restaurant-access'

/**
 * Risolve lo userId target dalla query string o dalla sessione.
 * - Se `userId` è passato come query param, lo usa solo se il caller è manager del target.
 * - Altrimenti restituisce l'ID del caller stesso.
 */
async function resolveTargetUserId(
  callerId: string,
  callerRole: string,
  queryUserId: string | null
): Promise<{ userId: string } | { error: string; status: number }> {
  if (!queryUserId || queryUserId === callerId) {
    return { userId: callerId }
  }
  // Solo manager possono accedere ai dati di un altro utente
  if (!isManagerRole(callerRole)) {
    return { error: 'Permesso negato', status: 403 }
  }
  const canManage = await assertManagerOfUser(callerId, queryUserId)
  if (!canManage) {
    return { error: 'Accesso negato — utente non nel tuo ristorante', status: 403 }
  }
  return { userId: queryUserId }
}

/**
 * GET /api/vat-registrations?userId=xxx
 *
 * Restituisce tutte le P.IVA collegate all'utente (tramite VatRegistrationUser).
 * `userId` è opzionale: se omesso usa il caller; se passato richiede ruolo manager
 * nello stesso ristorante/company.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryUserId = searchParams.get('userId')

    const target = await resolveTargetUserId(
      session.user.id,
      String(session.user.role ?? ''),
      queryUserId
    )
    if ('error' in target) {
      return NextResponse.json({ error: target.error }, { status: target.status })
    }

    const links = await prisma.vatRegistrationUser.findMany({
      where: { userId: target.userId },
      include: {
        vatRegistration: {
          select: {
            id: true,
            vatNumber: true,
            legalName: true,
            aggregationStatus: true,
            confirmedAt: true,
            anomalyNote: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { linkedAt: 'desc' },
    })

    const vatRegistrations = links.map((l) => ({
      linkId: l.id,
      linkedAt: l.linkedAt,
      ...l.vatRegistration,
    }))

    return NextResponse.json({ vatRegistrations })
  } catch (error) {
    console.error('GET /api/vat-registrations error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * POST /api/vat-registrations
 *
 * Registra una P.IVA e la collega all'utente.
 * Se la P.IVA esiste già, aggiunge solo il link (idempotente).
 *
 * Body: { vatNumber: string, legalName?: string, userId?: string }
 * `userId` opzionale — solo manager possono specificare un userId diverso dal proprio.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json() as {
      vatNumber?: string
      legalName?: string
      userId?: string
    }

    const { vatNumber, legalName, userId: bodyUserId } = body

    if (!vatNumber || typeof vatNumber !== 'string' || !vatNumber.trim()) {
      return NextResponse.json({ error: 'vatNumber è obbligatorio' }, { status: 400 })
    }

    const target = await resolveTargetUserId(
      session.user.id,
      String(session.user.role ?? ''),
      bodyUserId ?? null
    )
    if ('error' in target) {
      return NextResponse.json({ error: target.error }, { status: target.status })
    }

    const normalizedVat = vatNumber.trim().toUpperCase()

    // Upsert della VatRegistration (la P.IVA potrebbe già esistere)
    const vatReg = await prisma.vatRegistration.upsert({
      where: { vatNumber: normalizedVat },
      create: {
        vatNumber: normalizedVat,
        legalName: legalName?.trim() || null,
        aggregationStatus: 'PENDING',
      },
      update: {
        // Aggiorna legalName solo se fornito e il record non lo aveva
        ...(legalName?.trim() ? { legalName: legalName.trim() } : {}),
      },
    })

    // Crea il link utente ↔ P.IVA (idempotente)
    const link = await prisma.vatRegistrationUser.upsert({
      where: {
        vatRegistrationId_userId: {
          vatRegistrationId: vatReg.id,
          userId: target.userId,
        },
      },
      create: {
        vatRegistrationId: vatReg.id,
        userId: target.userId,
      },
      update: {},
    })

    return NextResponse.json(
      {
        success: true,
        vatRegistration: {
          linkId: link.id,
          linkedAt: link.linkedAt,
          id: vatReg.id,
          vatNumber: vatReg.vatNumber,
          legalName: vatReg.legalName,
          aggregationStatus: vatReg.aggregationStatus,
          confirmedAt: vatReg.confirmedAt,
          anomalyNote: vatReg.anomalyNote,
          createdAt: vatReg.createdAt,
          updatedAt: vatReg.updatedAt,
        },
        message: 'P.IVA registrata con successo',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/vat-registrations error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
