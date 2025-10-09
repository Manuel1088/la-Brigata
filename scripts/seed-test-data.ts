import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Inizio seeding dati di test...\n')

  try {
    // 1. Crea Aziende di Test
    console.log('🏭 Creazione aziende...')
    
    const company1 = await prisma.company.create({
      data: {
        name: 'Ristorante La Bella Vita',
        fiscalCode: 'IT12345678901',
        address: 'Via Roma 123, Milano',
        ownerName: 'Giovanni Rossi',
        ownerEmail: 'giovanni@labellavita.it',
        phone: '+39 02 1234567',
        isActive: true
      }
    })
    console.log(`  ✅ ${company1.name} (${company1.fiscalCode})`)

    const company2 = await prisma.company.create({
      data: {
        name: 'Trattoria Il Gusto',
        fiscalCode: 'IT98765432109',
        address: 'Piazza Duomo 45, Roma',
        ownerName: 'Maria Bianchi',
        ownerEmail: 'maria@ilgusto.it',
        phone: '+39 06 9876543',
        isActive: true
      }
    })
    console.log(`  ✅ ${company2.name} (${company2.fiscalCode})`)

    // 2. Crea Ristoranti
    console.log('\n🍽️  Creazione ristoranti...')
    
    const restaurant1 = await prisma.restaurant.create({
      data: {
        name: 'La Bella Vita - Milano Centro',
        address: 'Via Roma 123, Milano',
        phone: '+39 02 1234567',
        companyId: company1.id
      }
    })
    console.log(`  ✅ ${restaurant1.name}`)

    const restaurant2 = await prisma.restaurant.create({
      data: {
        name: 'Il Gusto - Roma',
        address: 'Piazza Duomo 45, Roma',
        phone: '+39 06 9876543',
        companyId: company2.id
      }
    })
    console.log(`  ✅ ${restaurant2.name}`)

    // 3. Crea Dipendenti di Test
    console.log('\n👥 Creazione dipendenti...')
    
    const hashedPassword = await hash('test123', 12)

    const employee1 = await prisma.user.create({
      data: {
        email: 'marco.chef@test.it',
        name: 'Marco Cuoco',
        password: hashedPassword,
        role: 'HEAD_CHEF',
        hierarchyLevel: 7,
        department: 'Cucina',
        phone: '+39 333 1111111',
        restaurantId: restaurant1.id,
        companyId: company1.id,
        avatar: '👨‍🍳',
        isActive: true
      }
    })
    console.log(`  ✅ ${employee1.name} (${employee1.role})`)

    const employee2 = await prisma.user.create({
      data: {
        email: 'sofia.sala@test.it',
        name: 'Sofia Responsabile',
        password: hashedPassword,
        role: 'RESPONSABILE_SALA',
        hierarchyLevel: 7,
        department: 'Sala',
        phone: '+39 333 2222222',
        restaurantId: restaurant1.id,
        companyId: company1.id,
        avatar: '🍽️',
        isActive: true
      }
    })
    console.log(`  ✅ ${employee2.name} (${employee2.role})`)

    const employee3 = await prisma.user.create({
      data: {
        email: 'luca.cassiere@test.it',
        name: 'Luca Cassa',
        password: hashedPassword,
        role: 'CASSIERE',
        hierarchyLevel: 6,
        department: 'Sala',
        phone: '+39 333 3333333',
        restaurantId: restaurant2.id,
        companyId: company2.id,
        avatar: '💰',
        isActive: true
      }
    })
    console.log(`  ✅ ${employee3.name} (${employee3.role})`)

    // 4. Crea Employments ACTIVE
    console.log('\n💼 Creazione employments attivi...')

    const emp1 = await (prisma as any).employment.create({
      data: {
        userId: employee1.id,
        restaurantId: restaurant1.id,
        status: 'ACTIVE',
        role: 'HEAD_CHEF',
        department: 'Cucina',
        requestedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: '1', // ADMIN
        startDate: new Date()
      }
    })
    console.log(`  ✅ ${employee1.name} → ${restaurant1.name}`)

    const emp2 = await (prisma as any).employment.create({
      data: {
        userId: employee2.id,
        restaurantId: restaurant1.id,
        status: 'ACTIVE',
        role: 'RESPONSABILE_SALA',
        department: 'Sala',
        requestedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: '1', // ADMIN
        startDate: new Date()
      }
    })
    console.log(`  ✅ ${employee2.name} → ${restaurant1.name}`)

    const emp3 = await (prisma as any).employment.create({
      data: {
        userId: employee3.id,
        restaurantId: restaurant2.id,
        status: 'ACTIVE',
        role: 'CASSIERE',
        department: 'Sala',
        requestedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: '1', // ADMIN
        startDate: new Date()
      }
    })
    console.log(`  ✅ ${employee3.name} → ${restaurant2.name}`)

    // 5. Crea un Employment PENDING per test
    console.log('\n⏳ Creazione richiesta pending...')

    const employee4 = await prisma.user.create({
      data: {
        email: 'anna.pending@test.it',
        name: 'Anna Nuova',
        password: hashedPassword,
        role: 'DIPENDENTE',
        hierarchyLevel: 5,
        department: 'Sala',
        phone: '+39 333 4444444',
        restaurantId: restaurant1.id,
        companyId: company1.id,
        avatar: '👤',
        isActive: true
      }
    })

    const pendingEmp = await (prisma as any).employment.create({
      data: {
        userId: employee4.id,
        restaurantId: restaurant1.id,
        status: 'PENDING',
        role: 'DIPENDENTE',
        department: 'Sala',
        requestedAt: new Date()
      }
    })
    console.log(`  ⏳ ${employee4.name} → ${restaurant1.name} (PENDING)`)

    // 6. Crea Employment multi-restaurant per test
    console.log('\n🔄 Creazione multi-restaurant employment...')

    const multiEmp = await (prisma as any).employment.create({
      data: {
        userId: employee1.id, // Marco lavora anche al secondo ristorante
        restaurantId: restaurant2.id,
        status: 'ACTIVE',
        role: 'HEAD_CHEF',
        department: 'Cucina',
        requestedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: '1',
        startDate: new Date()
      }
    })
    console.log(`  ✅ ${employee1.name} → ${restaurant2.name} (secondo lavoro!)`)

    // Riepilogo
    console.log('\n📊 RIEPILOGO SEEDING:')
    console.log(`  🏭 Aziende create: 2`)
    console.log(`  🍽️  Ristoranti creati: 2`)
    console.log(`  👥 Dipendenti creati: 4`)
    console.log(`  💼 Employments ACTIVE: 4`)
    console.log(`  ⏳ Employments PENDING: 1`)

    console.log('\n🎉 Seeding completato con successo!')
    console.log('\n🔑 Credenziali di test:')
    console.log('  📧 marco.chef@test.it / test123 (Head Chef, 2 ristoranti)')
    console.log('  📧 sofia.sala@test.it / test123 (Responsabile Sala)')
    console.log('  📧 luca.cassiere@test.it / test123 (Cassiere)')
    console.log('  📧 anna.pending@test.it / test123 (Pending approval)')
    console.log('\n🛡️  ADMIN: admin@brigata.it / admin123')

  } catch (error) {
    console.error('💥 Errore durante il seeding:', error)
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

