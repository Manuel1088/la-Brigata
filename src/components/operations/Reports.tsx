'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useCompanyData } from '@/hooks/useCompanyData'

interface Report {
  id: string
  name: string
  type: 'bookings' | 'customers' | 'revenue' | 'utilization' | 'custom'
  description: string
  lastGenerated?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'on-demand'
  status: 'active' | 'paused' | 'error'
  parameters: Record<string, any>
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  type: string
  icon: string
}

export default function OperationsReports() {
  const { data: session } = useSession()
  const { data: companyData } = useCompanyData(session?.user?.id)
  const [reports, setReports] = useState<Report[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportForm, setReportForm] = useState<Partial<Report>>({})
  const [isGenerating, setIsGenerating] = useState<string | null>(null)

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'daily_bookings',
      name: 'Report Prenotazioni Giornaliero',
      description: 'Prenotazioni confermate, cancellate e in attesa per ogni giorno',
      type: 'bookings',
      icon: '📅'
    },
    {
      id: 'weekly_customers',
      name: 'Report Clienti Settimanale',
      description: 'Nuovi clienti, clienti fedeli e analisi comportamentale',
      type: 'customers',
      icon: '👥'
    },
    {
      id: 'monthly_revenue',
      name: 'Report Ricavi Mensile',
      description: 'Analisi dettagliata dei ricavi per area e periodo',
      type: 'revenue',
      icon: '💰'
    },
    {
      id: 'utilization_analysis',
      name: 'Analisi Utilizzo Aree',
      description: 'Performance e utilizzo di ogni area del ristorante',
      type: 'utilization',
      icon: '🏢'
    },
    {
      id: 'peak_hours_analysis',
      name: 'Analisi Orari di Punta',
      description: 'Identificazione degli orari e giorni più trafficati',
      type: 'custom',
      icon: '⏰'
    },
    {
      id: 'customer_loyalty',
      name: 'Report Fedeltà Clienti',
      description: 'Analisi della retention e dei clienti VIP',
      type: 'customers',
      icon: '⭐'
    }
  ]

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = () => {
    try {
      const raw = localStorage.getItem('operations_reports_v1')
      if (raw) {
        setReports(JSON.parse(raw))
      } else {
        // Genera report predefiniti per demo
        generateDefaultReports()
      }
    } catch (error) {
      console.error('Errore nel caricamento report:', error)
    }
  }

  const generateDefaultReports = () => {
    const defaultReports: Report[] = [
      {
        id: 'daily_bookings_default',
        name: 'Report Prenotazioni Giornaliero',
        type: 'bookings',
        description: 'Prenotazioni confermate, cancellate e in attesa per ogni giorno',
        frequency: 'daily',
        status: 'active',
        parameters: { includeCancelled: true, groupByArea: true },
        lastGenerated: new Date().toISOString()
      },
      {
        id: 'weekly_customers_default',
        name: 'Report Clienti Settimanale',
        type: 'customers',
        description: 'Nuovi clienti, clienti fedeli e analisi comportamentale',
        frequency: 'weekly',
        status: 'active',
        parameters: { includeNewCustomers: true, includeVipAnalysis: true },
        lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'monthly_revenue_default',
        name: 'Report Ricavi Mensile',
        type: 'revenue',
        description: 'Analisi dettagliata dei ricavi per area e periodo',
        frequency: 'monthly',
        status: 'active',
        parameters: { groupByArea: true, includeProjections: true },
        lastGenerated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    setReports(defaultReports)
    try {
      localStorage.setItem('operations_reports_v1', JSON.stringify(defaultReports))
    } catch {}
  }

  const saveReports = (updatedReports: Report[]) => {
    setReports(updatedReports)
    try {
      localStorage.setItem('operations_reports_v1', JSON.stringify(updatedReports))
    } catch {}
  }

  const handleCreateReport = () => {
    if (!selectedTemplate) return

    const newReport: Report = {
      id: crypto.randomUUID(),
      name: selectedTemplate.name,
      type: selectedTemplate.type as any,
      description: selectedTemplate.description,
      frequency: reportForm.frequency || 'on-demand',
      status: 'active',
      parameters: reportForm.parameters || {},
      lastGenerated: undefined
    }

    const updatedReports = [...reports, newReport]
    saveReports(updatedReports)
    setShowCreateModal(false)
    setSelectedTemplate(null)
    setReportForm({})
  }

  const handleGenerateReport = async (reportId: string) => {
    setIsGenerating(reportId)
    try {
      // Simula generazione report
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const updatedReports = reports.map(report => 
        report.id === reportId 
          ? { ...report, lastGenerated: new Date().toISOString() }
          : report
      )
      saveReports(updatedReports)
    } catch (error) {
      console.error('Errore nella generazione report:', error)
    } finally {
      setIsGenerating(null)
    }
  }

  const handleToggleReport = (reportId: string) => {
    const updatedReports = reports.map(report => 
      report.id === reportId 
        ? { ...report, status: report.status === 'active' ? 'paused' : 'active' }
        : report
    )
    saveReports(updatedReports)
  }

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo report?')) {
      const updatedReports = reports.filter(report => report.id !== reportId)
      saveReports(updatedReports)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attivo'
      case 'paused': return 'Pausato'
      case 'error': return 'Errore'
      default: return status
    }
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Giornaliero'
      case 'weekly': return 'Settimanale'
      case 'monthly': return 'Mensile'
      case 'quarterly': return 'Trimestrale'
      case 'yearly': return 'Annuale'
      case 'on-demand': return 'Su richiesta'
      default: return frequency
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Mai'
    return new Date(dateString).toLocaleString('it-IT')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📊 Report Operazioni</h2>
            <p className="text-gray-600 mt-1">Genera e gestisci report dettagliati delle operazioni</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ➕ Nuovo Report
          </button>
        </div>
      </div>

      {/* Statistiche report */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
          <div className="text-sm text-blue-700">Report Totali</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {reports.filter(r => r.status === 'active').length}
          </div>
          <div className="text-sm text-green-700">Attivi</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {reports.filter(r => r.status === 'paused').length}
          </div>
          <div className="text-sm text-yellow-700">Pausati</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {reports.filter(r => r.lastGenerated && 
              new Date(r.lastGenerated) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length}
          </div>
          <div className="text-sm text-purple-700">Aggiornati Oggi</div>
        </div>
      </div>

      {/* Lista report */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Report Configurati</h3>
        </div>
        
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-500">Nessun report configurato</p>
              <p className="text-sm text-gray-400 mt-1">Crea il tuo primo report per iniziare</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {getStatusLabel(report.status)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {getFrequencyLabel(report.frequency)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Tipo:</span>
                          <span className="ml-2 font-medium capitalize">{report.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Frequenza:</span>
                          <span className="ml-2 font-medium">{getFrequencyLabel(report.frequency)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ultimo aggiornamento:</span>
                          <span className="ml-2 font-medium">{formatDate(report.lastGenerated)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleGenerateReport(report.id)}
                        disabled={isGenerating === report.id}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                      >
                        {isGenerating === report.id ? '⏳' : '📊'} Genera
                      </button>
                      
                      <button
                        onClick={() => handleToggleReport(report.id)}
                        className={`px-3 py-1 rounded transition text-sm ${
                          report.status === 'active' 
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {report.status === 'active' ? '⏸️' : '▶️'} {report.status === 'active' ? 'Pausa' : 'Attiva'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                      >
                        ❌ Elimina
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal creazione report */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Crea Nuovo Report</h3>
            
            {!selectedTemplate ? (
              // Selezione template
              <div>
                <p className="text-gray-600 mb-4">Scegli un template per il tuo report:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {template.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Configurazione report
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">{selectedTemplate.icon}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedTemplate.name}</h4>
                    <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Report</label>
                    <input
                      type="text"
                      value={reportForm.name || selectedTemplate.name}
                      onChange={(e) => setReportForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequenza</label>
                    <select
                      value={reportForm.frequency || 'on-demand'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="on-demand">Su richiesta</option>
                      <option value="daily">Giornaliero</option>
                      <option value="weekly">Settimanale</option>
                      <option value="monthly">Mensile</option>
                      <option value="quarterly">Trimestrale</option>
                      <option value="yearly">Annuale</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
                    <textarea
                      value={reportForm.description || selectedTemplate.description}
                      onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setSelectedTemplate(null)
                  setReportForm({})
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Annulla
              </button>
              
              {selectedTemplate && (
                <button
                  onClick={handleCreateReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  💾 Crea Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
