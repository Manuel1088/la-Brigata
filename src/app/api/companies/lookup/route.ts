import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Difesa in profondità: stessa normalizzazione del client.
function normalizeVat(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/^IT/i, '').toUpperCase()
}

// Rotta pubblica (serve pre-login) ma rate-limited per IP.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit(`company-lookup:${ip}`, { limit: 20, windowMs: 60_000 })
  if (!limit.success) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } }
    )
  }

  const raw = req.nextUrl.searchParams.get('vat') ?? ''
  const vat = normalizeVat(raw)

  if (!/^\d{11}$/.test(vat)) {
    return NextResponse.json({ error: 'invalid_vat' }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { fiscalCode: vat },
    select: {
      name: true,
      restaurants: {
        select: { name: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      _count: { select: { users: true } },
    },
  })

  if (!company) {
    return NextResponse.json({ found: false })
  }

  // Non esponiamo dati sensibili: solo nome azienda, nome sede e conteggio.
  return NextResponse.json({
    found: true,
    companyName: company.name,
    restaurantName: company.restaurants[0]?.name ?? null,
    colleaguesCount: company._count.users,
  })
}
