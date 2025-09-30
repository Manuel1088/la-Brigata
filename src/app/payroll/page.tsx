'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'

interface PayrollAnalysis {
  employeeName: string
  month: string
  year: string
  grossSalary: number
  netSalary: number
  deductions: Array<{
    type: string
    amount: number
    description: string
  }>
  bonuses: Array<{
    type: string
    amount: number
    description: string
  }>
  errors: Array<{
    type: 'error' | 'warning' | 'info'
    message: string
    suggestion?: string
  }>
  recommendations: Array<{
    category: 'deduction' | 'bonus' | 'optimization'
    title: string
    description: string
    potentialSavings?: number
  }>
}

interface PayrollDocument {
  id: string
  type: 'busta_paga' | 'cu' | 'analisi'
  month: string
  year: string
  fileName: string
  uploadDate: string
  fileSize: number
  status: 'uploaded' | 'processed' | 'error'
  downloadUrl?: string
  analysis?: PayrollAnalysis
}

export default function PayrollPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { canViewPayroll, canManagePayroll } = usePermissions()
  
  const [isScanning, setIsScanning] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<PayrollAnalysis | null>(null)
  const [scanHistory, setScanHistory] = useState<PayrollAnalysis[]>([])
  const [documents, setDocuments] = useState<PayrollDocument[]>([])
  const [selectedTab, setSelectedTab] = useState<'scan' | 'history' | 'documents'>('scan')

  // Redirect se non autenticato
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Carica storico scansioni
  useEffect(() => {
    try {
      const saved = localStorage.getItem('payroll_scan_history')
      if (saved) {
        setScanHistory(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Carica documenti storici
  useEffect(() => {
    try {
      const saved = localStorage.getItem('payroll_documents_history')
      if (saved) {
        setDocuments(JSON.parse(saved))
      } else {
        // Dati di esempio per demo
        const mockDocuments: PayrollDocument[] = [
          {
            id: 'doc_1',
            type: 'busta_paga',
            month: 'Dicembre',
            year: '2024',
            fileName: 'Busta_Paga_Dicembre_2024.pdf',
            uploadDate: '2024-12-01',
            fileSize: 245760,
            status: 'processed',
            downloadUrl: '#'
          },
          {
            id: 'doc_2',
            type: 'cu',
            month: '2024',
            year: '2024',
            fileName: 'CU_2024.pdf',
            uploadDate: '2024-03-01',
            fileSize: 189440,
            status: 'processed',
            downloadUrl: '#'
          },
          {
            id: 'doc_3',
            type: 'busta_paga',
            month: 'Novembre',
            year: '2024',
            fileName: 'Busta_Paga_Novembre_2024.pdf',
            uploadDate: '2024-11-01',
            fileSize: 234567,
            status: 'processed',
            downloadUrl: '#'
          },
          {
            id: 'doc_4',
            type: 'busta_paga',
            month: 'Ottobre',
            year: '2024',
            fileName: 'Busta_Paga_Ottobre_2024.pdf',
            uploadDate: '2024-10-01',
            fileSize: 198765,
            status: 'processed',
            downloadUrl: '#'
          }
        ]
        setDocuments(mockDocuments)
        localStorage.setItem('payroll_documents_history', JSON.stringify(mockDocuments))
      }
    } catch {}
  }, [])

  const saveToHistory = (analysis: PayrollAnalysis) => {
    const newHistory = [analysis, ...scanHistory.slice(0, 9)] // Mantieni ultimi 10
    setScanHistory(newHistory)
    try {
      localStorage.setItem('payroll_scan_history', JSON.stringify(newHistory))
    } catch {}
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDocumentIcon = (type: string): string => {
    switch (type) {
      case 'busta_paga': return '💰'
      case 'cu': return '📄'
      case 'analisi': return '🔍'
      default: return '📁'
    }
  }

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'busta_paga': return 'Busta Paga'
      case 'cu': return 'Certificato Unico'
      case 'analisi': return 'Analisi AI'
      default: return 'Documento'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'processed': return 'text-green-600 bg-green-100'
      case 'uploaded': return 'text-blue-600 bg-blue-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file)
    } else {
      alert('Seleziona un file immagine valido (JPG, PNG, etc.)')
    }
  }

  const scanPayroll = async () => {
    if (!uploadedFile) return
    
    setIsScanning(true)
    
    try {
      // Simula chiamata API per scansione AI
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Analisi simulata (in produzione useresti una vera API AI)
      const mockAnalysis: PayrollAnalysis = {
        employeeName: session?.user?.name || 'Dipendente',
        month: 'Dicembre',
        year: '2024',
        grossSalary: 2500.00,
        netSalary: 1950.00,
        deductions: [
          { type: 'IRPEF', amount: 350.00, description: 'Imposta sul reddito' },
          { type: 'INPS', amount: 150.00, description: 'Contributi previdenziali' },
          { type: 'IRAP', amount: 50.00, description: 'Imposta regionale' }
        ],
        bonuses: [
          { type: 'Tredicesima', amount: 200.00, description: 'Tredicesima mensilità' },
          { type: 'Bonus', amount: 100.00, description: 'Bonus performance' }
        ],
        errors: [
          { type: 'warning', message: 'Mancano detrazioni per figli a carico', suggestion: 'Verifica se hai figli a carico per richiedere detrazioni' },
          { type: 'info', message: 'Possibile detrazione spese mediche', suggestion: 'Raccogli ricevute spese mediche per detrazione' }
        ],
        recommendations: [
          {
            category: 'deduction',
            title: 'Detrazione Figli a Carico',
            description: 'Se hai figli a carico, puoi richiedere detrazioni fino a €950 per figlio',
            potentialSavings: 950
          },
          {
            category: 'deduction',
            title: 'Detrazione Spese Mediche',
            description: 'Spese mediche superiori a €129,11 sono detraibili al 19%',
            potentialSavings: 200
          },
          {
            category: 'bonus',
            title: 'Bonus Renzi',
            description: 'Verifica se hai diritto al bonus Renzi (€80-100 mensili)',
            potentialSavings: 100
          }
        ]
      }
      
      setAnalysis(mockAnalysis)
      saveToHistory(mockAnalysis)
      
    } catch (error) {
      console.error('Errore scansione:', error)
      alert('Errore durante la scansione. Riprova.')
    } finally {
      setIsScanning(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-lg">Caricamento...</div>
    </div>
  }

  if (!session) return null

  return (
    <PermissionGuard requiredPermission="canViewPayroll">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Indietro</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">💰 Analisi Buste Paga</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Navigazione Tab */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setSelectedTab('scan')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === 'scan'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🔍 Scansiona Busta Paga
                  </button>
                  <button
                    onClick={() => setSelectedTab('history')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === 'history'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 Storico Analisi
                  </button>
                  <button
                    onClick={() => setSelectedTab('documents')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === 'documents'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📁 Documenti Azienda
                  </button>
                </nav>
              </div>
            </div>

            {/* Contenuto Tab */}
            {selectedTab === 'scan' && (
              <>
                {/* Sezione Scansione */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">🔍 Scansiona Busta Paga</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Carica una foto della tua busta paga per analisi AI e suggerimenti di ottimizzazione
                </p>
              </div>
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="payroll-upload"
                  />
                  <label
                    htmlFor="payroll-upload"
                    className="cursor-pointer flex flex-col items-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {uploadedFile ? uploadedFile.name : 'Clicca per caricare busta paga'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Supporta JPG, PNG, PDF (max 10MB)
                      </p>
                    </div>
                  </label>
                </div>
                
                {uploadedFile && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={scanPayroll}
                      disabled={isScanning}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isScanning ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Scansione in corso...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Scansiona con AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Risultati Analisi */}
            {analysis && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    📊 Analisi: {analysis.employeeName} - {analysis.month} {analysis.year}
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  
                  {/* Riepilogo Stipendi */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Stipendio Lordo</div>
                      <div className="text-2xl font-bold text-gray-900">€{analysis.grossSalary.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Stipendio Netto</div>
                      <div className="text-2xl font-bold text-green-600">€{analysis.netSalary.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Totale Detrazioni</div>
                      <div className="text-2xl font-bold text-red-600">
                        €{analysis.deductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Errori e Avvisi */}
                  {analysis.errors.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Avvisi e Suggerimenti</h3>
                      <div className="space-y-2">
                        {analysis.errors.map((error, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                            error.type === 'error' ? 'bg-red-50 border-red-400' :
                            error.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                            'bg-blue-50 border-blue-400'
                          }`}>
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                error.type === 'error' ? 'bg-red-400' :
                                error.type === 'warning' ? 'bg-yellow-400' :
                                'bg-blue-400'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{error.message}</p>
                                {error.suggestion && (
                                  <p className="text-sm text-gray-600 mt-1">{error.suggestion}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raccomandazioni */}
                  {analysis.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Raccomandazioni di Ottimizzazione</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysis.recommendations.map((rec, idx) => (
                          <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                              </div>
                              {rec.potentialSavings && (
                                <div className="text-right">
                                  <div className="text-sm text-green-600 font-semibold">
                                    +€{rec.potentialSavings}
                                  </div>
                                  <div className="text-xs text-gray-500">potenziale</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dettagli Detrazioni e Bonus */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">📉 Detrazioni</h3>
                      <div className="space-y-2">
                        {analysis.deductions.map((ded, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                            <div>
                              <div className="font-medium text-gray-900">{ded.type}</div>
                              <div className="text-sm text-gray-600">{ded.description}</div>
                            </div>
                            <div className="font-semibold text-red-600">-€{ded.amount.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Bonus</h3>
                      <div className="space-y-2">
                        {analysis.bonuses.map((bonus, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <div>
                              <div className="font-medium text-gray-900">{bonus.type}</div>
                              <div className="text-sm text-gray-600">{bonus.description}</div>
                            </div>
                            <div className="font-semibold text-green-600">+€{bonus.amount.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

              </>
            )}

            {/* Tab Storico Analisi */}
            {selectedTab === 'history' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">📊 Storico Analisi AI</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Cronologia delle analisi effettuate con AI
                  </p>
                </div>
                <div className="p-6">
                  {scanHistory.length > 0 ? (
                    <div className="space-y-3">
                      {scanHistory.map((scan, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div>
                            <div className="font-medium text-gray-900">{scan.employeeName}</div>
                            <div className="text-sm text-gray-600">{scan.month} {scan.year}</div>
                            <div className="text-xs text-gray-500">
                              {scan.recommendations.length} raccomandazioni • {scan.errors.length} avvisi
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">€{scan.netSalary.toFixed(2)}</div>
                            <div className="text-sm text-gray-600">netto</div>
                            <div className="text-xs text-green-600">
                              +€{scan.recommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0).toFixed(0)} potenziale
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🔍</div>
                      <p>Nessuna analisi effettuata</p>
                      <p className="text-sm">Scansiona una busta paga per iniziare</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Documenti Azienda */}
            {selectedTab === 'documents' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">📁 Documenti Azienda</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Buste paga e certificati unici ricevuti dall'azienda
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{getDocumentIcon(doc.type)}</div>
                          <div>
                            <div className="font-medium text-gray-900">{doc.fileName}</div>
                            <div className="text-sm text-gray-600">
                              {getDocumentTypeLabel(doc.type)} • {doc.month} {doc.year}
                            </div>
                            <div className="text-xs text-gray-500">
                              Caricato il {new Date(doc.uploadDate).toLocaleDateString('it-IT')} • {formatFileSize(doc.fileSize)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                            {doc.status === 'processed' ? 'Processato' : 
                             doc.status === 'uploaded' ? 'Caricato' : 'Errore'}
                          </span>
                          <button
                            onClick={() => {
                              // Simula download
                              alert(`Download: ${doc.fileName}`)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            📥 Scarica
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Statistiche */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {documents.filter(d => d.type === 'busta_paga').length}
                      </div>
                      <div className="text-sm text-gray-600">Buste Paga</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {documents.filter(d => d.type === 'cu').length}
                      </div>
                      <div className="text-sm text-gray-600">Certificati Unici</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {documents.filter(d => d.status === 'processed').length}
                      </div>
                      <div className="text-sm text-gray-600">Processati</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
