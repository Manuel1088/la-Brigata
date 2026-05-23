import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { logAuditAction } from '@/lib/audit'
import type { AuditAction } from '@/lib/audit-types'

const VALID_ACTIONS = new Set<string>([
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'IMPORT',
  'APPROVE',
  'REJECT',
])

/**
 * POST /api/audit — persiste un entry audit (solo server-side Prisma).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    let body: {
      action?: string
      resource?: string
      resourceId?: string
      details?: string
      ipAddress?: string
      userAgent?: string
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }

    const { action, resource, resourceId, details, ipAddress, userAgent } = body

    if (!action || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'action non valida' }, { status: 400 })
    }

    if (!resource || typeof resource !== 'string' || !resource.trim()) {
      return NextResponse.json({ error: 'resource obbligatorio' }, { status: 400 })
    }

    await logAuditAction({
      userId: session.user.id,
      action: action as AuditAction,
      resource: resource.trim(),
      resourceId:
        resourceId != null && String(resourceId).trim()
          ? String(resourceId).trim()
          : undefined,
      details:
        details != null && String(details).length > 0
          ? String(details)
          : undefined,
      ipAddress:
        ipAddress != null && String(ipAddress).trim()
          ? String(ipAddress).trim()
          : undefined,
      userAgent:
        userAgent != null && String(userAgent).trim()
          ? String(userAgent).trim()
          : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/audit error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
