'use client'
import { useSession } from 'next-auth/react'
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

export default function PayrollSection() {
  const { data: session } = useSession()
  const { canViewPayroll, canManagePayroll } = usePermissions()
  
  const [isScanning, setIsScanning] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<PayrollAnalysis | null>(null)
  const [scanHistory, setScanHistory] = useState<PayrollAnalysis[]>([])
  const [documents, setDocuments] = useState<PayrollDocument[]>([])
  const [selectedTab, setSelectedTab] = useState<'scan' | 'history' | 'documents'>('scan')

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
            month: 'Dicembre',
            year: '2024',
            fileName: 'CU_Dicembre_2024.pdf',
            uploadDate: '2024-12-15',
            fileSize: 156432,
            status: 'processed',
            downloadUrl: '#'
          },
          {
            id: 'doc_3',
            type: 'analisi',
            month: 'Novembre',
            year: '2024',
            fileName: 'Analisi_Payroll_Novembre_2024.pdf',
            uploadDate: '2024-11-30',
            fileSize: 321654,
            status: 'processed',
            downloadUrl: '#'
          }
        ]
        setDocuments(mockDocuments)
        localStorage.setItem('payroll_documents_history', JSON.stringify(mockDocuments))
      }
    } catch {}
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleScanDocument = async () => {
    if (!uploadedFile) return

    setIsScanning(true)
    
    try {
      // Simula scansione AI (in produzione sarebbe una chiamata API)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Genera analisi mock
      const mockAnalysis: PayrollAnalysis = {
        employeeName: session?.user?.name || 'Dipendente',
        month: 'Gennaio',
        year: '2025',
        grossSalary: 2500.00,
        netSalary: 1850.00,
        deductions: [
          { type: 'INPS', amount: 275.00, description: 'Contributi previdenziali' },
          { type: 'IRPEF', amount: 375.00, description: 'Imposta sul reddito' }
        ],
        bonuses: [
          { type: 'Produzione', amount: 150.00, description: 'Bonus produzione mensile' },
          { type: 'Puntualità', amount: 50.00, description: 'Bonus puntualità' }
        ],
        errors: [
          { type: 'warning', message: 'Contributo INPS leggermente superiore alla media', suggestion: 'Verificare il calcolo del reddito imponibile' },
          { type: 'info', message: 'Bonus produzione applicato correttamente' }
        ],
        recommendations: [
          {
            category: 'optimization',
            title: 'Ottimizzazione fiscale',
            description: 'Considerare l\'applicazione di detrazioni per spese mediche',
            potentialSavings: 120.00
          },
          {
            category: 'bonus',
            title: 'Bonus performance',
            description: 'Valutare l\'applicazione di bonus per obiettivi raggiunti',
            potentialSavings: 200.00
          }
        ]
      }
      
      setAnalysis(mockAnalysis)
      
      // Salva nello storico
      const updatedHistory = [mockAnalysis, ...scanHistory]
      setScanHistory(updatedHistory)
      localStorage.setItem('payroll_scan_history', JSON.stringify(updatedHistory))
      
    } catch (error) {
      console.error('Errore nella scansione:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-100 text-green-800'
      case 'uploaded': return 'bg-blue-100 text-blue-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'processed': return 'Elaborato'
      case 'uploaded': return 'Caricato'
      case 'error': return 'Errore'
      default: return status
    }
  }

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getRecommendationIcon = (category: string) => {
    switch (category) {
      case 'deduction': return '💰'
      case 'bonus': return '🎯'
      case 'optimization': return '⚡'
      default: return '💡'
    }
  }

  return (
    <PermissionGuard permission="payroll_view">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">💰 Buste Paga</h3>
              <p className="text-sm text-gray-600 mt-1">Analisi AI e gestione documenti payroll</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedTab('scan')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedTab === 'scan' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🤖 Scansione
              </button>
              <button
                onClick={() => setSelectedTab('history')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedTab === 'history' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Storico
              </button>
              <button
                onClick={() => setSelectedTab('documents')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedTab === 'documents' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📁 Documenti
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Tab Scansione */}
          {selectedTab === 'scan' && (
            <div className="space-y-6">
              {/* Upload File */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">📄</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Carica Documento Payroll</h4>
                <p className="text-gray-600 mb-4">
                  Carica busta paga, CU o altri documenti per l'analisi AI
                </p>
                
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
                >
                  📁 Seleziona File
                </label>
                
                {uploadedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>File selezionato:</strong> {uploadedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Dimensione: {formatFileSize(uploadedFile.size)}
                    </p>
                  </div>
                )}
              </div>

              {/* Pulsante Scansione */}
              {uploadedFile && (
                <div className="text-center">
                  <button
                    onClick={handleScanDocument}
                    disabled={isScanning}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Analizzando documento...
                      </>
                    ) : (
                      <>
                        🤖 Avvia Analisi AI
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Risultati Analisi */}
              {analysis && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-800 mb-2">
                      ✅ Analisi Completata
                    </h4>
                    <p className="text-green-700">
                      Documento analizzato con successo per {analysis.employeeName} - {analysis.month} {analysis.year}
                    </p>
                  </div>

                  {/* Riepilogo Finanziario */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(analysis.grossSalary)}
                      </div>
                      <div className="text-sm text-blue-700">Stipendio Lordo</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        -{formatCurrency(analysis.deductions.reduce((sum, d) => sum + d.amount, 0))}
                      </div>
                      <div className="text-sm text-red-700">Detrazioni</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(analysis.netSalary)}
                      </div>
                      <div className="text-sm text-green-700">Stipendio Netto</div>
                    </div>
                  </div>

                  {/* Dettagli Detrazioni e Bonus */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detrazioni */}
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-3">📉 Detrazioni</h5>
                      <div className="space-y-2">
                        {analysis.deductions.map((deduction, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <div className="font-medium text-gray-900">{deduction.type}</div>
                              <div className="text-sm text-gray-600">{deduction.description}</div>
                            </div>
                            <div className="font-semibold text-red-600">
                              -{formatCurrency(deduction.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bonus */}
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-3">🎯 Bonus</h5>
                      <div className="space-y-2">
                        {analysis.bonuses.map((bonus, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <div className="font-medium text-gray-900">{bonus.type}</div>
                              <div className="text-sm text-gray-600">{bonus.description}</div>
                            </div>
                            <div className="font-semibold text-green-600">
                              +{formatCurrency(bonus.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Errori e Avvisi */}
                  {analysis.errors.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-semibold text-yellow-800 mb-3">⚠️ Avvisi e Note</h5>
                      <div className="space-y-2">
                        {analysis.errors.map((error, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-lg">{getErrorIcon(error.type)}</span>
                            <div>
                              <div className="font-medium text-yellow-800">{error.message}</div>
                              {error.suggestion && (
                                <div className="text-sm text-yellow-700 mt-1">{error.suggestion}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raccomandazioni */}
                  {analysis.recommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-800 mb-3">💡 Raccomandazioni AI</h5>
                      <div className="space-y-3">
                        {analysis.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <span className="text-lg">{getRecommendationIcon(rec.category)}</span>
                            <div className="flex-1">
                              <div className="font-medium text-blue-800">{rec.title}</div>
                              <div className="text-sm text-blue-700 mt-1">{rec.description}</div>
                              {rec.potentialSavings && (
                                <div className="text-sm font-medium text-green-600 mt-1">
                                  Potenziale risparmio: {formatCurrency(rec.potentialSavings)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab Storico */}
          {selectedTab === 'history' && (
            <div className="space-y-4">
              {scanHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-gray-500">Nessuna analisi precedente</p>
                  <p className="text-sm text-gray-400 mt-1">Carica un documento per iniziare</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanHistory.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.employeeName}</h4>
                          <p className="text-sm text-gray-600">{item.month} {item.year}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(item.netSalary)}
                          </div>
                          <div className="text-sm text-gray-600">Netto</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Lordo:</span>
                          <div className="font-medium">{formatCurrency(item.grossSalary)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Detrazioni:</span>
                          <div className="font-medium text-red-600">
                            -{formatCurrency(item.deductions.reduce((sum, d) => sum + d.amount, 0))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Bonus:</span>
                          <div className="font-medium text-green-600">
                            +{formatCurrency(item.bonuses.reduce((sum, b) => sum + b.amount, 0))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span>{item.errors.length} avvisi</span>
                        <span>{item.recommendations.length} raccomandazioni</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Documenti */}
          {selectedTab === 'documents' && (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-gray-500">Nessun documento caricato</p>
                  <p className="text-sm text-gray-400 mt-1">I documenti caricati appariranno qui</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {doc.type === 'busta_paga' ? '💰' : doc.type === 'cu' ? '📋' : '📊'}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{doc.fileName}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{doc.month} {doc.year}</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                                {getStatusLabel(doc.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm">
                            📥 Scarica
                          </button>
                          <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm">
                            🔍 Analizza
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}
