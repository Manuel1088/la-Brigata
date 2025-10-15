import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(
  req: NextRequest,
  context: unknown
) {
  try {
    const { params } = (context as { params?: { id?: string } }) ?? {}
    const companyId = params?.id
    if (!companyId) return NextResponse.json({ error: 'Missing company id' }, { status: 400 })

    const { name, address, phone } = await req.json()
    if (!name || (typeof name !== 'string') || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome ristorante obbligatorio' }, { status: 400 })
    }

    // Verifica esistenza company
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 })

    const restaurant = await prisma.restaurant.create({
      data: {
        name: name.trim(),
        address: address || null,
        phone: phone || null,
        companyId: company.id,
      }
    })

    return NextResponse.json({ success: true, restaurant })
  } catch (error) {
    console.error('POST /api/companies/[id]/restaurants error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


