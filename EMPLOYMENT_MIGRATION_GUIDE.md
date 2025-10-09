# 🚀 Guida Migrazione Multi-Employment

Questa guida ti accompagna passo-passo nell'implementazione del sistema multi-employment per La Brigata.

## 📋 Prerequisiti

- PostgreSQL installato e funzionante
- Accesso al database
- Node.js e npm configurati
- Backup del database (IMPORTANTE!)

## 🔄 STEP 1: Backup Database (5 minuti)

**SEMPRE fare un backup prima di modificare il database!**

```bash
# Nella root del progetto
pg_dump -U postgres -d nome_tuo_database > backup_$(date +%Y%m%d).sql

# Verifica che il backup sia stato creato
ls -lh backup_*.sql
```

## 🗄️ STEP 2: Esegui Migration SQL (10 minuti)

La migration SQL aggiunge:
- Colonne nuove a `users` e `restaurants`
- Tabella `employments` per gestire multi-restaurant
- Indici per performance

```bash
# Esegui la migration SQL
psql -U postgres -d nome_tuo_database < prisma/migrations/add_multi_employment.sql

# Verifica che la tabella sia stata creata
psql -U postgres -d nome_tuo_database -c "\d employments"
```

## 🔧 STEP 3: Genera Prisma Client (2 minuti)

Il Prisma schema è già stato aggiornato con il modello Employment.

```bash
# Genera il client Prisma
npx prisma generate

# Verifica che non ci siano errori
npx prisma validate
```

## 📊 STEP 4: Migra Dati Esistenti (20 minuti)

Lo script migra tutti gli utenti esistenti alla nuova tabella Employment:

```bash
# Esegui lo script di migrazione
npx ts-node scripts/migrate-to-employment.ts
```

Output atteso:
```
🚀 Inizio migrazione dati a Employment...
📊 Trovati X utenti da migrare
✅ Migrato: Nome Cognome (email@example.com) -> Restaurant Name
...
📈 Riepilogo migrazione:
  ✅ Migrati: X
  ⏭️  Saltati: Y
  ❌ Errori: 0
  📊 Totale: Z
🎉 Totale Employment nel database: X
✅ Migrazione completata con successo!
```

## 🧪 STEP 5: Testa le API (10 minuti)

### Test GET Employments
```bash
# Avvia il server
npm run dev

# In un altro terminale, testa l'API
curl http://localhost:3000/api/employments?status=PENDING
```

### Test Approvazione
```bash
# Sostituisci {id} con un ID reale
curl -X POST http://localhost:3000/api/employments/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"role":"DIPENDENTE","department":"Sala"}'
```

## 🖥️ STEP 6: Accedi alla Pagina Richieste (5 minuti)

1. Avvia il server: `npm run dev`
2. Apri browser: `http://localhost:3000/team/requests`
3. Verifica che la pagina carichi le richieste pending
4. Prova ad approvare/rifiutare una richiesta

## 📁 File Creati/Modificati

### ✅ Nuovi File

- `prisma/migrations/add_multi_employment.sql` - Migration SQL
- `scripts/migrate-to-employment.ts` - Script migrazione dati
- `src/app/api/employments/route.ts` - API GET employments
- `src/app/api/employments/[id]/approve/route.ts` - API approvazione
- `src/app/api/employments/[id]/reject/route.ts` - API rifiuto
- `src/app/team/requests/page.tsx` - Pagina gestione richieste

### 🔄 File Modificati

- `prisma/schema.prisma` - Aggiunto modello Employment + relazioni

## 🎯 Funzionalità Implementate

### ✅ Database
- ✅ Tabella Employment con tutti i campi necessari
- ✅ Relazioni User ↔ Employment ↔ Restaurant
- ✅ Indici per performance
- ✅ Enum EmploymentStatus

### ✅ API
- ✅ GET `/api/employments` - Lista employments con filtri
- ✅ POST `/api/employments/{id}/approve` - Approva richiesta
- ✅ POST `/api/employments/{id}/reject` - Rifiuta richiesta
- ✅ Autenticazione e permessi

### ✅ Frontend
- ✅ Pagina `/team/requests` per gestione richieste
- ✅ Filtri PENDING / ALL
- ✅ Approvazione/Rifiuto con conferma
- ✅ UI responsive e moderna
- ✅ Stato visivo (badge colorati)

## 🔐 Permessi

Solo questi ruoli possono approvare/rifiutare:
- PROPRIETARIO
- DIRETTORE  
- MANAGER
- ADMIN

## 🚨 Troubleshooting

### Errore: tabella già esistente
```bash
# Verifica se la tabella esiste già
psql -U postgres -d nome_tuo_database -c "\d employments"

# Se esiste, puoi skippare la migration SQL
```

### Errore: utenti già migrati
Lo script salta automaticamente gli utenti già migrati.

### Errore: Prisma Client non aggiornato
```bash
# Rigenera il client
npx prisma generate
```

## 📈 Prossimi Step (Opzionali)

### Phase 2 - Candidature Esterne
- Form pubblico per candidature
- Notifiche email approvazione/rifiuto
- Dashboard candidati

### Phase 3 - Multi-Restaurant UX
- Switch tra restaurant nella UI
- Dashboard aggregata multi-restaurant
- Permessi granulari per restaurant

## 💾 Rollback (Se Necessario)

Se qualcosa va storto:

```bash
# Ripristina il backup
psql -U postgres -d nome_tuo_database < backup_YYYYMMDD.sql

# Rigenera Prisma
npx prisma generate
```

## ✅ Checklist Finale

- [ ] Backup database eseguito
- [ ] Migration SQL eseguita con successo
- [ ] Prisma Client generato
- [ ] Script migrazione dati eseguito
- [ ] API testate e funzionanti
- [ ] Pagina /team/requests accessibile
- [ ] Approvazione/Rifiuto testati
- [ ] Tutto commitato su Git

## 📞 Supporto

Per problemi o domande, controlla:
1. Log del server: `npm run dev`
2. Log PostgreSQL
3. Console browser (F12)

---

**Tempo totale stimato**: 50-60 minuti

**Difficoltà**: Media

**Reversibilità**: Alta (grazie al backup)

