import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const allow = process.env.NODE_ENV !== 'production' || (process.env.CLEANUP_KEY && key === process.env.CLEANUP_KEY)
    if (!allow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Elimina in ordine di dipendenza per evitare violazioni FK
    await prisma.$transaction(async (tx) => {
      // Tips
      try { await tx.tipDistribution.deleteMany({}) } catch {}
      try { await tx.dailyTips.deleteMany({}) } catch {}
      try { await tx.tipEntry.deleteMany({}) } catch {}
      try { await tx.tipDistributionV2?.deleteMany({}) } catch {}

      // Leave system
      try { await tx.leaveApproval.deleteMany({}) } catch {}
      try { await tx.leaveRequest.deleteMany({}) } catch {}
      try { await tx.leavePolicy.deleteMany({}) } catch {}
      try { await tx.leaveBalance.deleteMany({}) } catch {}
      try { await tx.leaveEntitlement.deleteMany({}) } catch {}

      // Payroll
      try { await tx.payroll.deleteMany({}) } catch {}

      // Events / rules / locations
      try { await tx.staffRequirement.deleteMany({}) } catch {}
      try { await tx.restaurantEvent.deleteMany({}) } catch {}
      try { await tx.cCNLRules.deleteMany({}) } catch {}
      try { await tx.restaurantLocation.deleteMany({}) } catch {}

      // Bookings / tables
      try { await tx.booking.deleteMany({}) } catch {}
      try { await tx.table.deleteMany({}) } catch {}

      // Shifts
      try { await tx.shift.deleteMany({}) } catch {}

      // Permissions & audit
      try { await tx.userPermission.deleteMany({}) } catch {}
      try { await tx.permission.deleteMany({}) } catch {}
      try { await tx.auditLog.deleteMany({}) } catch {}

      // Users must go before restaurants/companies if FK constraints
      try { await tx.user.deleteMany({}) } catch {}

      // Restaurants and Companies
      try { await tx.restaurant.deleteMany({}) } catch {}
      try { await tx.informalCompany.deleteMany({}) } catch {}
      try { await tx.company.deleteMany({}) } catch {}
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DEV CLEANUP ERROR:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


