'use client'
import { useRouter } from 'next/navigation'

export default function TipsSpecPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/tips')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Torna al Riepilogo Mance</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">📄 Specifica Tecnica: Sistema Mance</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Meta */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div><span className="font-semibold">Versione:</span> 1.0</div>
              <div><span className="font-semibold">Data:</span> 17 Settembre 2025</div>
              <div><span className="font-semibold">Cliente:</span> LA BRIGATA</div>
              <div><span className="font-semibold">Obiettivo:</span> Digitalizzazione completa del sistema Excel di gestione mance</div>
            </div>
          </div>

          {/* Indice */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-3">📋 Indice</h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li><a href="#panoramica-sistema" className="text-orange-600 hover:underline">Panoramica Sistema</a></li>
              <li><a href="#analisi-excel" className="text-orange-600 hover:underline">Analisi Excel Esistente</a></li>
              <li><a href="#logica-calcolo" className="text-orange-600 hover:underline">Logica di Calcolo</a></li>
              <li><a href="#struttura-dati" className="text-orange-600 hover:underline">Struttura Dati</a></li>
              <li><a href="#funzionalita-app" className="text-orange-600 hover:underline">Funzionalità App</a></li>
              <li><a href="#permessi-utenti" className="text-orange-600 hover:underline">Permessi Utenti</a></li>
              <li><a href="#specifiche-tecniche" className="text-orange-600 hover:underline">Specifiche Tecniche</a></li>
              <li><a href="#casi-uso" className="text-orange-600 hover:underline">Casi d'Uso</a></li>
              <li><a href="#validazioni-controlli" className="text-orange-600 hover:underline">Validazioni e Controlli</a></li>
              <li><a href="#deliverable" className="text-orange-600 hover:underline">Deliverable</a></li>
            </ol>
          </div>

          {/* Panoramica */}
          <section id="panoramica-sistema" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📊 Panoramica Sistema</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">Situazione Attuale</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>40+ dipendenti con punteggi e giorni riposo</li>
                  <li>1,398+ registrazioni mance 2024-2025</li>
                  <li>2 punti vendita: Mirabelle e Adele</li>
                  <li>Calcoli automatici distribuzione giornaliera</li>
                  <li>Report mensili per ogni dipendente</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Problema da Risolvere</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tempo: 15-20 minuti giornalieri per inserimento</li>
                  <li>Errori: rischio rottura formule Excel</li>
                  <li>Accessibilità: non mobile</li>
                  <li>Trasparenza: staff non vede in tempo reale</li>
                  <li>Backup: rischio perdita dati</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Soluzione Richiesta</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Inserimento rapido (2-3 min)</li>
                  <li>Calcoli automatici identici all'Excel</li>
                  <li>Accesso mobile e trasparenza</li>
                  <li>Backup automatico</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Analisi Excel */}
          <section id="analisi-excel" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📈 Analisi Excel Esistente</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">Foglio "Punteggi"</h3>
                <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                  Col. A: Nome | Col. B: Punteggio (1-10) | Col. C: Riposo 1 | Col. D: Riposo 2 | Col. F: Livello CCNL
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Foglio "DataBase 2025"</h3>
                <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                  Data | Tipo pagamento (Contanti/Carta/Mon. Estere) | Location (Mirabelle/Adele) | Importo (€)
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Fogli Mensili</h3>
                <ul className="list-disc list-inside">
                  <li>Totali per giorno/location</li>
                  <li>Staff presente (esclusi i riposi)</li>
                  <li>Distribuzione automatica per dipendente</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Logica di Calcolo */}
          <section id="logica-calcolo" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🧮 Logica di Calcolo</h2>
            <p className="text-gray-700 mb-3">Formula principale (per giorno e location):</p>
            <div className="bg-orange-50 border border-orange-200 rounded p-4 mb-4 text-gray-800">
              (Totale_Mance_Giorno ÷ Somma_Punti_Staff_Presente) × Punteggio_Individuale
            </div>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Riposi fissi: 1-2 giorni settimanali per dipendente</li>
              <li>Multi-location: Mirabelle e Adele calcolate separatamente</li>
              <li>Arrotondamenti a 2 decimali</li>
            </ul>
          </section>

          {/* Struttura Dati (riassunto) */}
          <section id="struttura-dati" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🗄️ Struttura Dati</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Employees: name, score, restDays, ccnlLevel, role, permissions</li>
              <li>TipEntries: date, location, type, amount, time, notes</li>
              <li>TipDistributions: snapshot per giorno/dipendente</li>
              <li>Support: Restaurant, Location, MonthlySummary</li>
            </ul>
          </section>

          {/* Funzionalità (riassunto) */}
          <section id="funzionalita-app" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Funzionalità App</h2>
            <div className="grid md:grid-cols-2 gap-6 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">Vista Dipendente</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Le mie mance: oggi, settimana, mese, anno</li>
                  <li>Dettaglio giornaliero con formula</li>
                  <li>Cronologia ultimi 30 giorni</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Vista Responsabile/Cassiere</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Inserimento rapido mance</li>
                  <li>Lista/filtri/edit/delete</li>
                  <li>Riepilogo in tempo reale</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Permessi */}
          <section id="permessi-utenti" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🔐 Permessi Utenti</h2>
            <p className="text-gray-700">Matrice ruoli: Dipendente (read-only), Cassiere (CRUD mance), Responsabile (CRUD + gestione dipendenti e report).</p>
          </section>

          {/* Specifiche Tecniche (riassunto) */}
          <section id="specifiche-tecniche" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">💻 Specifiche Tecniche</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Frontend: Next.js</li>
              <li>Backend: API Next.js + Prisma</li>
              <li>Database: PostgreSQL</li>
              <li>Auth: NextAuth + RBAC</li>
              <li>Sicurezza: HTTPS, validation, rate limiting</li>
            </ul>
          </section>

          {/* Casi d'Uso */}
          <section id="casi-uso" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📋 Casi d'Uso</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Inserimento mance tipico con ricalcolo distribuzioni</li>
              <li>Dipendente consulta le proprie mance</li>
              <li>Report mensile manager</li>
              <li>Correzione importo con ricalcolo</li>
            </ul>
          </section>

          {/* Validazioni e Controlli */}
          <section id="validazioni-controlli" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">✅ Validazioni e Controlli</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Importo &gt; 0, due decimali, limiti massimi</li>
              <li>Location e tipo pagamento validi</li>
              <li>Ricalcolo automatico dopo ogni modifica</li>
              <li>Audit log e rate limiting</li>
            </ul>
          </section>

          {/* Deliverable / Milestone */}
          <section id="deliverable" className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📦 Deliverable</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>MVP: CRUD mance + calcolo distribuzione identico a Excel</li>
              <li>Mobile + export: app RN, export Excel/PDF</li>
              <li>Produzione: deploy, backup, monitoring</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}


