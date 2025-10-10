import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🛡️ Creazione account Amministratore...\n')

    // Verifica se esiste già
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@brigata.it' }
    })

    if (existingAdmin) {
      console.log('⚠️  Account admin@brigata.it già esistente!')
      console.log('📋 Dati attuali:')
      console.log(`   - ID: ${existingAdmin.id}`)
      console.log(`   - Nome: ${existingAdmin.name}`)
      console.log(`   - Email: ${existingAdmin.email}`)
      console.log(`   - Ruolo: ${existingAdmin.role}`)
      console.log(`   - Avatar: ${existingAdmin.avatar}`)
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        readline.question('\n🔄 Vuoi aggiornarlo? (s/n): ', resolve)
      })
      readline.close()
      
      if (answer.toLowerCase() !== 's') {
        console.log('\n❌ Operazione annullata')
        return
      }
      
      // Aggiorna
      const hashedPassword = await hash('admin123', 10)
      const updated = await prisma.user.update({
        where: { email: 'admin@brigata.it' },
        data: {
          name: 'Amministratore',
          role: 'ADMIN',
          avatar: '🛡️',
          hierarchyLevel: 11,
          password: hashedPassword,
          isActive: true
        }
      })
      
      console.log('\n✅ Account aggiornato con successo!')
      console.log('📋 Nuovi dati:')
      console.log(`   - ID: ${updated.id}`)
      console.log(`   - Nome: ${updated.name}`)
      console.log(`   - Email: ${updated.email}`)
      console.log(`   - Ruolo: ${updated.role}`)
      console.log(`   - Avatar: ${updated.avatar}`)
      
    } else {
      // Crea nuovo admin
      console.log('📋 Step 1: Verifica/Crea Company Sistema...')
      
      // Trova o crea company "Sistema"
      let systemCompany = await prisma.company.findFirst({
        where: { name: 'Sistema La Brigata' }
      })
      
      if (!systemCompany) {
        systemCompany = await prisma.company.create({
          data: {
            name: 'Sistema La Brigata',
            fiscalCode: 'SYSTEM001',
            address: 'Sede Amministrativa',
            phone: '+39 000 000 0000',
            email: 'sistema@brigata.it',
            subscriptionType: 'ENTERPRISE',
            isActive: true
          }
        })
        console.log('   ✅ Company Sistema creata')
      } else {
        console.log('   ℹ️  Company Sistema già esistente')
      }
      
      console.log('📋 Step 2: Verifica/Crea Restaurant Sistema...')
      
      // Trova o crea restaurant "Sistema"
      let systemRestaurant = await prisma.restaurant.findFirst({
        where: { 
          name: 'Amministrazione',
          companyId: systemCompany.id
        }
      })
      
      if (!systemRestaurant) {
        systemRestaurant = await prisma.restaurant.create({
          data: {
            name: 'Amministrazione',
            address: 'Sede Amministrativa',
            phone: '+39 000 000 0000',
            companyId: systemCompany.id
          }
        })
        console.log('   ✅ Restaurant Sistema creato')
      } else {
        console.log('   ℹ️  Restaurant Sistema già esistente')
      }
      
      console.log('📋 Step 3: Crea account Amministratore...')
      
      const hashedPassword = await hash('admin123', 10)
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@brigata.it',
          name: 'Amministratore',
          password: hashedPassword,
          role: 'ADMIN',
          avatar: '🛡️',
          hierarchyLevel: 11,
          isActive: true,
          department: 'amministrazione',
          companyId: systemCompany.id,
          restaurantId: systemRestaurant.id
        }
      })
      
      console.log('✅ Account Amministratore creato con successo!')
      console.log('📋 Dettagli:')
      console.log(`   - ID: ${admin.id}`)
      console.log(`   - Nome: ${admin.name}`)
      console.log(`   - Email: ${admin.email}`)
      console.log(`   - Ruolo: ${admin.role}`)
      console.log(`   - Avatar: ${admin.avatar}`)
    }
    
    console.log('\n🔑 Credenziali accesso:')
    console.log('   - Email: admin@brigata.it')
    console.log('   - Password: admin123')
    console.log('\n⚠️  IMPORTANTE: Cambia la password dopo il primo accesso!')
    
  } catch (error) {
    console.error('❌ Errore:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
  .then(() => {
    console.log('\n✨ Operazione completata!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Errore fatale:', error)
    process.exit(1)
  })

