import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Inizio pulizia completa del database...')
  console.log('⚠️  ATTENZIONE: Questa operazione eliminerà TUTTI i dati!')
  
  try {
    // Conta i record prima della pulizia (con gestione errori per tabelle che potrebbero non esistere)
    const counts = {
      users: await prisma.user.count().catch(() => 0),
      employees: await prisma.employee.count().catch(() => 0),
      companies: await prisma.company.count().catch(() => 0),
      restaurants: await prisma.restaurant.count().catch(() => 0),
      employments: await prisma.employment.count().catch(() => 0),
      shifts: await prisma.shift.count().catch(() => 0),
      tipEntries: await prisma.tipEntry.count().catch(() => 0),
      leaveRequests: await prisma.leaveRequest.count().catch(() => 0),
      bookings: await prisma.booking.count().catch(() => 0)
    }
    
    console.log('\n📊 Record da eliminare:')
    console.log(`  👥 Users: ${counts.users}`)
    console.log(`  🏢 Employees: ${counts.employees}`)
    console.log(`  🏭 Companies: ${counts.companies}`)
    console.log(`  🍽️  Restaurants: ${counts.restaurants}`)
    console.log(`  💼 Employments: ${counts.employments}`)
    console.log(`  ⏰ Shifts: ${counts.shifts}`)
    console.log(`  💰 Tip Entries: ${counts.tipEntries}`)
    console.log(`  🏖️  Leave Requests: ${counts.leaveRequests}`)
    console.log(`  📅 Bookings: ${counts.bookings}`)
    
    console.log('\n🗑️  Eliminazione in corso...\n')
    
    // Elimina in ordine (rispettando le foreign key)
    
    // 1. Dati dipendenti da altre tabelle
    const delLeaveReq = await prisma.leaveRequest.deleteMany()
    console.log(`✅ LeaveRequests eliminati: ${delLeaveReq.count}`)
    
    const delLeaveEnt = await prisma.leaveEntitlement.deleteMany()
    console.log(`✅ LeaveEntitlements eliminati: ${delLeaveEnt.count}`)
    
    const delLeaveBalance = await prisma.leaveBalance.deleteMany()
    console.log(`✅ LeaveBalances eliminati: ${delLeaveBalance.count}`)
    
    const delPayroll = await prisma.payroll.deleteMany()
    console.log(`✅ Payrolls eliminati: ${delPayroll.count}`)
    
    const delShifts = await prisma.shift.deleteMany()
    console.log(`✅ Shifts eliminati: ${delShifts.count}`)
    
    const delTipEntries = await prisma.tipEntry.deleteMany()
    console.log(`✅ TipEntries eliminati: ${delTipEntries.count}`)
    
    const delBookings = await prisma.booking.deleteMany()
    console.log(`✅ Bookings eliminati: ${delBookings.count}`)
    
    const delTables = await prisma.table.deleteMany()
    console.log(`✅ Tables eliminati: ${delTables.count}`)
    
    const delEmployments = await prisma.employment.deleteMany().catch(() => ({ count: 0 }))
    console.log(`✅ Employments eliminati: ${delEmployments.count}`)
    
    const delUserPerms = await prisma.userPermission.deleteMany()
    console.log(`✅ UserPermissions eliminati: ${delUserPerms.count}`)
    
    const delUserSessions = await prisma.userSession.deleteMany()
    console.log(`✅ UserSessions eliminati: ${delUserSessions.count}`)
    
    const delEmployeeSkills = await prisma.employeeSkill.deleteMany()
    console.log(`✅ EmployeeSkills eliminati: ${delEmployeeSkills.count}`)
    
    // 2. Employees
    const delEmployees = await prisma.employee.deleteMany()
    console.log(`✅ Employees eliminati: ${delEmployees.count}`)
    
    // 3. Users
    const delUsers = await prisma.user.deleteMany()
    console.log(`✅ Users eliminati: ${delUsers.count}`)
    
    // 4. Restaurant data
    const delLeavePolicy = await prisma.leavePolicy.deleteMany()
    console.log(`✅ LeavePolicies eliminati: ${delLeavePolicy.count}`)
    
    const delCCNL = await prisma.cCNLRules.deleteMany()
    console.log(`✅ CCNLRules eliminati: ${delCCNL.count}`)
    
    const delRestEvents = await prisma.restaurantEvent.deleteMany()
    console.log(`✅ RestaurantEvents eliminati: ${delRestEvents.count}`)
    
    const delRestLocations = await prisma.restaurantLocation.deleteMany()
    console.log(`✅ RestaurantLocations eliminati: ${delRestLocations.count}`)
    
    // 5. Restaurants
    const delRestaurants = await prisma.restaurant.deleteMany()
    console.log(`✅ Restaurants eliminati: ${delRestaurants.count}`)
    
    // 6. Companies e InformalCompanies
    const delInformalCompanies = await prisma.informalCompany.deleteMany()
    console.log(`✅ InformalCompanies eliminati: ${delInformalCompanies.count}`)
    
    const delCompanies = await prisma.company.deleteMany()
    console.log(`✅ Companies eliminati: ${delCompanies.count}`)
    
    // 7. Other data
    const delPermissions = await prisma.permission.deleteMany()
    console.log(`✅ Permissions eliminati: ${delPermissions.count}`)
    
    console.log('\n🎉 Pulizia completata con successo!')
    console.log('\n📊 Stato finale del database:')
    
    // Verifica che tutto sia vuoto
    const finalCounts = {
      users: await prisma.user.count().catch(() => 0),
      employees: await prisma.employee.count().catch(() => 0),
      companies: await prisma.company.count().catch(() => 0),
      restaurants: await prisma.restaurant.count().catch(() => 0),
      employments: await prisma.employment.count().catch(() => 0)
    }
    
    console.log(`  👥 Users: ${finalCounts.users}`)
    console.log(`  🏢 Employees: ${finalCounts.employees}`)
    console.log(`  🏭 Companies: ${finalCounts.companies}`)
    console.log(`  🍽️  Restaurants: ${finalCounts.restaurants}`)
    console.log(`  💼 Employments: ${finalCounts.employments}`)
    
    if (Object.values(finalCounts).every(c => c === 0)) {
      console.log('\n✅ Database completamente pulito!')
      console.log('🛡️  ADMIN account rimane disponibile (hardcoded)')
      console.log('🚀 Pronto per testare da zero!')
    } else {
      console.log('\n⚠️  Alcuni record sono rimasti')
    }
    
  } catch (error) {
    console.error('💥 Errore durante la pulizia:', error)
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('💥 Errore fatale:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('\n🔌 Connessione database chiusa')
  })

