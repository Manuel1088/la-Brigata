import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cf = searchParams.get('cf')
    if (cf) {
      const company = await prisma.company.findUnique({ where: { fiscalCode: cf } })
      return NextResponse.json({ company })
    }

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, restaurants: true } },
      },
    })
    return NextResponse.json({ companies })
  } catch (error) {
    console.error('GET /api/companies error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, fiscalCode, address, phone, email } = body

    if (!id) {
      return NextResponse.json({ error: 'ID azienda richiesto' }, { status: 400 })
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(fiscalCode && { fiscalCode }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email })
      }
    })

    return NextResponse.json({ 
      success: true,
      company: updatedCompany,
      message: 'Azienda aggiornata con successo'
    })
  } catch (error) {
    console.error('PUT /api/companies error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }
}


