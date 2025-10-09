# 🧹 Guida Pulizia Database

## ⚠️ ATTENZIONE

Questa operazione **ELIMINERÀ TUTTI I DATI** dal database:
- Tutti gli utenti
- Tutti i dipendenti
- Tutte le aziende
- Tutti i ristoranti
- Tutti i turni, mance, ferie, prenotazioni, ecc.

**L'unico account che rimarrà disponibile è ADMIN (hardcoded nel codice).**

## 🎯 Quando Usare Questo Script

Usa questo script quando vuoi:
- ✅ Testare il sistema da zero
- ✅ Ripulire dati di test/sviluppo
- ✅ Reset completo dell'applicazione
- ✅ Ripartire con un database pulito

## 📋 Prerequisiti

1. **Backup del database** (se hai dati importanti):
```bash
pg_dump -U postgres -d nome_database > backup_prima_pulizia_$(date +%Y%m%d).sql
```

2. **Database configurato** e accessibile

3. **Prisma Client generato**:
```bash
npx prisma generate
```

## 🚀 Esecuzione

### Opzione 1: Script TypeScript (Raccomandato)

```bash
# Dalla root del progetto
npx ts-node scripts/clean-all-data.ts
```

Output atteso:
```
🧹 Inizio pulizia completa del database...
⚠️  ATTENZIONE: Questa operazione eliminerà TUTTI i dati!

📊 Record da eliminare:
  👥 Users: 25
  🏢 Employees: 15
  🏭 Companies: 3
  🍽️  Restaurants: 5
  💼 Employments: 8
  ⏰ Shifts: 120
  💰 Tip Entries: 50
  🏖️  Leave Requests: 10
  📅 Bookings: 30

🗑️  Eliminazione in corso...

✅ TipDistributions eliminati: 45
✅ LeaveRequests eliminati: 10
✅ Shifts eliminati: 120
... (output dettagliato)

🎉 Pulizia completata con successo!

📊 Stato finale del database:
  👥 Users: 0
  🏢 Employees: 0
  🏭 Companies: 0
  🍽️  Restaurants: 0
  💼 Employments: 0

✅ Database completamente pulito!
🛡️  ADMIN account rimane disponibile (hardcoded)
🚀 Pronto per testare da zero!
```

### Opzione 2: SQL Diretto (Più veloce ma meno sicuro)

```bash
# Connetti al database
psql -U postgres -d nome_database

# Esegui questi comandi
TRUNCATE TABLE tip_distributions CASCADE;
TRUNCATE TABLE leave_requests CASCADE;
TRUNCATE TABLE leave_entitlements CASCADE;
TRUNCATE TABLE leave_balances CASCADE;
TRUNCATE TABLE payrolls CASCADE;
TRUNCATE TABLE shifts CASCADE;
TRUNCATE TABLE tip_entries CASCADE;
TRUNCATE TABLE daily_tips CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE tables CASCADE;
TRUNCATE TABLE employments CASCADE;
TRUNCATE TABLE user_permissions CASCADE;
TRUNCATE TABLE user_sessions CASCADE;
TRUNCATE TABLE employee_skills CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE leave_policies CASCADE;
TRUNCATE TABLE ccnl_rules CASCADE;
TRUNCATE TABLE restaurant_events CASCADE;
TRUNCATE TABLE restaurant_locations CASCADE;
TRUNCATE TABLE restaurants CASCADE;
TRUNCATE TABLE informal_companies CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE permissions CASCADE;

# Verifica che tutto sia vuoto
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM companies;
```

## ✅ Cosa Succede Dopo la Pulizia

### 🛡️ Account Disponibili

**SOLO:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@brigata.it`
- Ruolo: ADMIN (Livello 11)

### 🚀 Sistema Pronto Per

1. **Registrare nuove aziende**
   - Via form registrazione
   - Da Admin Panel

2. **Aggiungere dipendenti**
   - Registrazione dipendenti
   - Approvazione employment

3. **Testare workflow completo**
   - Dalla registrazione
   - All'approvazione
   - All'uso quotidiano

## 🔄 Ripristino (Se Necessario)

Se hai fatto un backup:

```bash
# Ripristina dal backup
psql -U postgres -d nome_database < backup_prima_pulizia_YYYYMMDD.sql

# Rigenera Prisma Client
npx prisma generate
```

## 📝 Note Importanti

### ✅ Dati che Rimangono

- **Schema database** (tabelle, indici, constraint)
- **Enum types** (UserRole, EmploymentStatus, ecc.)
- **Account ADMIN** (hardcoded, non nel database)

### ❌ Dati che Vengono Eliminati

- **Tutti i record** in tutte le tabelle
- **Dati di test/sviluppo**
- **Configurazioni specifiche** (CCNL, leave policies, ecc.)

### 🎯 LocalStorage

Lo script NON pulisce localStorage del browser. Per una pulizia completa:

```javascript
// Nel browser console (F12)
localStorage.clear()
sessionStorage.clear()
```

Oppure usa la modalità incognito per testare con storage pulito.

## 🧪 Testing Workflow Consigliato

Dopo la pulizia, testa in questo ordine:

1. **Login Admin**
   ```
   Email: admin@brigata.it
   Password: admin123
   ```

2. **Registra Azienda**
   - Via form registrazione
   - O da Admin Panel

3. **Registra Dipendenti**
   - Form registrazione dipendente
   - Approvazione da employment requests

4. **Testa Funzionalità**
   - Gestione turni
   - Mance
   - Ferie
   - Report

## 🚨 Troubleshooting

### Errore: Foreign key constraint

Alcuni record non possono essere eliminati a causa di vincoli.

**Soluzione:**
```bash
# Disabilita temporaneamente i vincoli
psql -U postgres -d nome_database -c "SET session_replication_role = 'replica';"

# Esegui pulizia
npx ts-node scripts/clean-all-data.ts

# Riabilita vincoli
psql -U postgres -d nome_database -c "SET session_replication_role = 'origin';"
```

### Errore: Permission denied

Assicurati di avere i permessi corretti sul database.

### Errore: Cannot connect to database

Verifica:
1. PostgreSQL è in esecuzione
2. DATABASE_URL in `.env` è corretto
3. Database esiste

## ✅ Checklist Pre-Pulizia

Prima di eseguire lo script:

- [ ] Backup fatto (se necessario)
- [ ] Database accessibile
- [ ] Prisma Client generato
- [ ] Sei sicuro di voler eliminare TUTTI i dati
- [ ] Hai verificato che l'account admin funziona

## 🎉 Risultato Finale

Dopo la pulizia avrai:
- ✅ Database completamente vuoto
- ✅ Schema intatto e funzionante
- ✅ ADMIN account disponibile per login
- ✅ Sistema pronto per testing da zero

---

**Tempo stimato**: 1-2 minuti  
**Reversibilità**: Alta (con backup)  
**Impatto**: Totale (tutti i dati)

