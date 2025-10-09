# 🎭 Gerarchia Ruoli e Permessi - La Brigata

## 📊 Livelli Gerarchici

```
Livello 11: 🛡️  ADMIN (Super Admin)        ⭐ MASSIMO LIVELLO
Livello 10: 👑 PROPRIETARIO                 
Livello 9:  👔 DIRETTORE
Livello 8:  📊 MANAGER
Livello 7:  🍽️  RESPONSABILE_SALA / 👨‍🍳 HEAD_CHEF / 🍸 HEAD_BARMAN / 🍷 HEAD_SOMMELIER
Livello 6:  💰 CASSIERE
Livello 5:  👤 DIPENDENTE
```

## 🛡️ SUPER ADMIN (Livello 11)

**Account**: `admin` / `admin123`  
**Email**: `admin@brigata.it`  
**Avatar**: 🛡️

### ✅ Funzioni Esclusive (SOLO Super Admin):

1. **🗑️ Eliminare Aziende dal Sistema**
   - Può eliminare completamente un'azienda e tutti i suoi dati
   - PROPRIETARIO: ❌ Non può eliminare aziende

2. **⚙️ Configurazione Sistema Critica**
   - Modifica configurazioni che impattano tutte le aziende
   - PROPRIETARIO: ❌ Solo configurazioni della propria azienda

3. **🗄️ Accesso Diretto al Database**
   - Può eseguire query dirette sul database
   - PROPRIETARIO: ❌ Solo tramite interfaccia

4. **📊 Audit Multi-Azienda Completo**
   - Visualizza audit log di TUTTE le aziende
   - PROPRIETARIO: ❌ Solo audit della propria azienda

5. **🔐 Override Permessi Globale**
   - Può modificare permessi di qualsiasi utente di qualsiasi azienda
   - PROPRIETARIO: ❌ Solo utenti della propria azienda

6. **🌐 Gestione Cross-Company**
   - Vista aggregata di tutte le aziende
   - Statistiche globali del sistema
   - PROPRIETARIO: ❌ Solo la propria azienda

### ✅ Tutte le Funzioni Standard:
- ✅ Tutte le funzioni del PROPRIETARIO
- ✅ Tutte le funzioni del DIRETTORE
- ✅ Tutte le funzioni del MANAGER
- ✅ Accesso a `/super-admin` dashboard esclusivo

---

## 👑 PROPRIETARIO (Livello 10)

**Account**: `proprietario` / `prop123`  
**Email**: `proprietario@brigata.it`  
**Avatar**: 👑

### ✅ Funzioni Complete (nella propria azienda):

1. **👥 Gestione Completa Personale**
   - Creare, modificare, attivare/disattivare dipendenti
   - Gestire ruoli e livelli
   - Approvare candidature

2. **💰 Gestione Finanziaria Completa**
   - Visualizzare tutti i report finanziari
   - Gestire buste paga
   - Gestire mance e distribuzioni

3. **⏰ Gestione Turni e Riposi**
   - Configurare turni e riposi
   - Approvare richieste
   - Gestire calendario

4. **📊 Report e Analytics**
   - Tutti i report della propria azienda
   - Export in tutti i formati
   - Report programmati

5. **⚙️ Impostazioni Azienda**
   - Configurare la propria azienda
   - Gestire sedi/location
   - Configurare CCNL

### ❌ Limitazioni (rispetto a ADMIN):
- ❌ Non può eliminare aziende
- ❌ Non può vedere dati di altre aziende
- ❌ Non può modificare configurazioni globali
- ❌ Non ha accesso al Super Admin Panel
- ❌ Non può fare override permessi cross-company

---

## 👔 DIRETTORE (Livello 9)

**Account**: `direttore` / `dir123`

### ✅ Funzioni:
- Gestione personale (limitata)
- Visualizzazione report finanziari
- Approvazione ferie e turni
- Gestione operativa

### ❌ NON Può:
- Modificare configurazioni aziendali
- Eliminare dipendenti
- Modificare buste paga

---

## 📊 MANAGER (Livello 8)

**Account**: `manager` / `mgr123`

### ✅ Funzioni:
- Gestione turni
- Approvazione richieste
- Report operativi
- Gestione sala/cucina

### ❌ NON Può:
- Gestire contratti
- Modificare salari
- Report finanziari avanzati

---

## 🎯 Differenze Chiave ADMIN vs PROPRIETARIO

| Funzione | ADMIN (Livello 11) | PROPRIETARIO (Livello 10) |
|----------|-------------------|---------------------------|
| **Scope** | Tutte le aziende | Solo propria azienda |
| **Eliminare aziende** | ✅ SÌ | ❌ NO |
| **Audit cross-company** | ✅ SÌ | ❌ NO |
| **Config sistema globale** | ✅ SÌ | ❌ NO |
| **Accesso database** | ✅ SÌ | ❌ NO |
| **Override permessi** | ✅ Tutti | ❌ Solo propria azienda |
| **Super Admin Panel** | ✅ SÌ | ❌ NO |
| **Gestione personale** | ✅ Tutte aziende | ✅ Propria azienda |
| **Report finanziari** | ✅ Tutte aziende | ✅ Propria azienda |
| **CCNL** | ✅ Config globale | ✅ Config azienda |

---

## 🔑 Account Demo

```bash
# Super Admin (Livello 11)
Username: admin
Password: admin123
Accesso: /super-admin

# Proprietario (Livello 10)
Username: proprietario
Password: prop123
Accesso: /admin

# Direttore (Livello 9)
Username: direttore
Password: dir123

# Manager (Livello 8)
Username: manager
Password: mgr123
```

---

## 🛡️ Protezioni Implementate

### In `usePermissions.ts`:
```typescript
// ADMIN ha SEMPRE tutti i permessi
if (upperRole === 'ADMIN' || upperRole === 'PROPRIETARIO') return true

// Ma ADMIN ha livello 11, PROPRIETARIO ha livello 10
// Quindi ADMIN può accedere anche a permessi di livello 11
```

### In API Routes:
```typescript
// Esempio: Solo ADMIN può eliminare aziende
if (userRole !== 'ADMIN' || userLevel !== 11) {
  return NextResponse.json({ error: 'Solo Super Admin' }, { status: 403 })
}
```

---

## 📝 Note Importanti

### 🎯 Account Principale
L'account **ADMIN** è quello principale del sistema perché:
- Ha livello 11 (il più alto)
- Ha funzioni esclusive non disponibili al PROPRIETARIO
- Gestisce TUTTE le aziende del sistema
- È l'unico che può fare operazioni critiche

### 🏢 Account Giammy
Se "giammy" ha **più funzioni** di admin, probabilmente:
1. È stato creato con ruolo `ADMIN` invece di `PROPRIETARIO`
2. Ha livello 11 nel database
3. Ha permessi override in localStorage

### 🔍 Come Verificare
```sql
-- Controlla il ruolo di giammy nel database
SELECT id, name, email, role, "hierarchy_level" 
FROM users 
WHERE email LIKE '%giammy%' OR name LIKE '%giammy%';
```

### 🔧 Come Correggere
Se giammy dovrebbe essere PROPRIETARIO:
```sql
-- Aggiorna il ruolo
UPDATE users 
SET role = 'PROPRIETARIO', hierarchy_level = 10 
WHERE email = 'giammy@example.com';
```

---

## 🚀 Accesso alle Dashboard

### Super Admin:
- `/super-admin` - Dashboard esclusivo Super Admin
- `/admin/*` - Tutte le pagine admin
- Tutte le altre pagine

### Proprietario:
- `/admin/*` - Pagine admin della propria azienda
- `/dashboard` - Dashboard proprietario
- Tutte le pagine standard

---

**Conclusione**: L'account **ADMIN** è superiore al **PROPRIETARIO** perché ha livello 11 e funzioni esclusive cross-company.

