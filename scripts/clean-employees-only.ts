import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Pulizia SOLO dipendenti reali dal database...')
  
  try {
    // Conta dipendenti
    const employeeCount = await prisma.employee.count()
    console.log(`\n📊 Dipendenti da eliminare: ${employeeCount}`)
    
    if (employeeCount === 0) {
      console.log('✅ Nessun dipendente da eliminare')
      return
    }
    
    console.log('\n🗑️  Eliminazione in corso...\n')
    
    // Elimina prima i dati collegati ai dipendenti
    const delShifts = await prisma.shift.deleteMany()
    console.log(`✅ Shifts eliminati: ${delShifts.count}`)
    
    const delPayrolls = await prisma.payroll.deleteMany()
    console.log(`✅ Payrolls eliminati: ${delPayrolls.count}`)
    
    const delLeaveReq = await prisma.leaveRequest.deleteMany()
    console.log(`✅ LeaveRequests eliminati: ${delLeaveReq.count}`)
    
    const delLeaveEnt = await prisma.leaveEntitlement.deleteMany()
    console.log(`✅ LeaveEntitlements eliminati: ${delLeaveEnt.count}`)
    
    const delLeaveBalance = await prisma.leaveBalance.deleteMany()
    console.log(`✅ LeaveBalances eliminati: ${delLeaveBalance.count}`)
    
    const delTipDist = await prisma.tipDistribution.deleteMany()
    console.log(`✅ TipDistributions eliminati: ${delTipDist.count}`)
    
    const delSkills = await prisma.employeeSkill.deleteMany()
    console.log(`✅ EmployeeSkills eliminati: ${delSkills.count}`)
    
    // Elimina i dipendenti
    const delEmployees = await prisma.employee.deleteMany()
    console.log(`✅ Employees eliminati: ${delEmployees.count}`)
    
    console.log('\n🎉 Pulizia dipendenti completata!')
    console.log(`\n📊 Dipendenti rimasti: ${await prisma.employee.count()}`)
    console.log('\n🛡️  Account ADMIN ancora disponibile per login')
    console.log('🚀 Pronto per registrare nuovi dipendenti!')
    
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
    console.log('🔌 Connessione database chiusa')
  })

