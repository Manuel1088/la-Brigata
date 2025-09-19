/*
  Development cleanup script.
  WARNING: This deletes data from the database configured in DATABASE_URL.
  Run only in development.
*/

const { PrismaClient } = require('@prisma/client')

async function run() {
  const prisma = new PrismaClient()
  try {
    await prisma.$transaction(async (tx) => {
      const del = async (name, fn) => {
        try { await fn() } catch (e) { /* console.warn('Skip', name, e?.code || e?.message) */ }
      }

      // Tips
      await del('TipDistribution', () => tx.tipDistribution.deleteMany({}))
      await del('DailyTips', () => tx.dailyTips.deleteMany({}))
      await del('TipEntry', () => tx.tipEntry.deleteMany({}))
      await del('TipDistributionV2', () => tx.tipDistributionV2?.deleteMany({}))
      await del('MonthlySummary', () => tx.monthlySummary?.deleteMany({}))

      // Leave system
      await del('LeaveApproval', () => tx.leaveApproval.deleteMany({}))
      await del('LeaveRequest', () => tx.leaveRequest.deleteMany({}))
      await del('LeavePolicy', () => tx.leavePolicy.deleteMany({}))
      await del('LeaveBalance', () => tx.leaveBalance.deleteMany({}))
      await del('LeaveEntitlement', () => tx.leaveEntitlement.deleteMany({}))

      // Payroll
      await del('Payroll', () => tx.payroll.deleteMany({}))

      // Events / rules / locations
      await del('StaffRequirement', () => tx.staffRequirement.deleteMany({}))
      await del('RestaurantEvent', () => tx.restaurantEvent.deleteMany({}))
      await del('CCNLRules', () => tx.ccnlRules.deleteMany({}))
      await del('RestaurantLocation', () => tx.restaurantLocation.deleteMany({}))

      // Bookings / tables
      await del('Booking', () => tx.booking.deleteMany({}))
      await del('Table', () => tx.table.deleteMany({}))

      // Shifts
      await del('Shift', () => tx.shift.deleteMany({}))

      // Permissions & audit
      await del('UserPermission', () => tx.userPermission.deleteMany({}))
      await del('Permission', () => tx.permission.deleteMany({}))
      await del('AuditLog', () => tx.auditLog.deleteMany({}))

      // RLS models
      await del('EmployeeSkill', () => tx.employeeSkill?.deleteMany({}))
      await del('UserSession', () => tx.userSession?.deleteMany({}))
      await del('Employee', () => tx.employee?.deleteMany({}))

      // Users must go before restaurants/companies if FK constraints
      await del('User', () => tx.user.deleteMany({}))

      // Restaurants and Companies
      await del('Restaurant', () => tx.restaurant.deleteMany({}))
      await del('InformalCompany', () => tx.informalCompany.deleteMany({}))
      await del('Company', () => tx.company.deleteMany({}))
    })
    console.log('Cleanup completed successfully.')
  } catch (error) {
    console.error('Cleanup failed:', error)
    process.exitCode = 1
  } finally {
    await new PrismaClient().$disconnect().catch(() => {})
    process.exit()
  }
}

run()


