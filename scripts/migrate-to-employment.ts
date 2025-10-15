import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Inizio migrazione dati a Employment...')
  
  try {
    // Trova tutti gli utenti (si filtrerà in memoria per restaurantId presente)
    const users = await prisma.user.findMany({})
    
    console.log(`📊 Trovati ${users.length} utenti da migrare`)
    
    let migrated = 0
    let skipped = 0
    let errors = 0
    
    for (const user of users) {
      if (!user.restaurantId) {
        console.log(`⏭️  Saltato: ${user.name} (no restaurantId)`)
        skipped++
        continue
      }
      
      try {
        // Verifica se l'employment esiste già
        const existing = await prisma.employment.findUnique({
          where: {
            userId_restaurantId: {
              userId: user.id,
              restaurantId: user.restaurantId
            }
          }
        })
        
        if (existing) {
          console.log(`⏭️  Già migrato: ${user.name}`)
          skipped++
          continue
        }
        
        // Crea Employment per utente esistente
        await prisma.employment.create({
          data: {
            userId: user.id,
            restaurantId: user.restaurantId,
            status: user.isActive ? 'ACTIVE' : 'TERMINATED',
            role: user.role,
            department: user.department || null,
            requestedAt: user.createdAt,
            reviewedAt: user.createdAt, // Già approvato
            startDate: user.createdAt,
            createdAt: user.createdAt,
            updatedAt: new Date()
          }
        })
        
        console.log(`✅ Migrato: ${user.name} (${user.email}) -> ristorante ${user.restaurantId}`)
        migrated++
        
      } catch (error: any) {
        console.error(`❌ Errore per ${user.name}:`, error.message)
        errors++
      }
    }
    
    console.log('\n📈 Riepilogo migrazione:')
    console.log(`  ✅ Migrati: ${migrated}`)
    console.log(`  ⏭️  Saltati: ${skipped}`)
    console.log(`  ❌ Errori: ${errors}`)
    console.log(`  📊 Totale: ${users.length}`)
    
    // Verifica finale
    const totalEmployments = await prisma.employment.count()
    console.log(`\n🎉 Totale Employment nel database: ${totalEmployments}`)
    
    console.log('\n✅ Migrazione completata con successo!')
    
  } catch (error) {
    console.error('💥 Errore durante la migrazione:', error)
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

