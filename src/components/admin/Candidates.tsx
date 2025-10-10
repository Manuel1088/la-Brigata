'use client'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudit } from '@/hooks/useAudit'

interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position: string
  experience: string
  skills: string[]
  status: 'pending' | 'approved' | 'rejected' | 'hired'
  createdAt: Date
  notes?: string
  resumeUrl?: string
}

export default function AdminCandidates() {
  const { notifyCustom } = useNotifications()
  const { logReadAction } = useAudit()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [positionFilter, setPositionFilter] = useState<string>('all')

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      // TODO: Implementare API per candidati reali (CV esterni)
      // Per ora mostra lista vuota fino a quando non arrivano CV reali
      const response = await fetch('/api/candidates')
      
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.candidates || [])
      } else {
        // Se API non esiste ancora, mostra array vuoto
        setCandidates([])
      }
    } catch (error) {
      console.error('Errore nel caricamento candidati:', error)
      notifyCustom('ERROR', 'SYSTEM', 'Errore', 'Errore nel caricamento candidati')
      // In caso di errore, mostra array vuoto (nessun candidato)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const handleCandidateAction = async (candidateId: string, action: 'approve' | 'reject' | 'hire') => {
    try {
      const candidate = candidates.find(c => c.id === candidateId)
      if (!candidate) return

      switch (action) {
        case 'approve':
          setCandidates(prev => prev.map(c => 
            c.id === candidateId ? { ...c, status: 'approved' } : c
          ))
          notifyCustom('SUCCESS', 'PERSONNEL', 'Candidato Approvato', `Candidato ${candidate.name} approvato con successo`)
          logReadAction('candidate_approved', candidateId)
          break
        case 'reject':
          setCandidates(prev => prev.map(c => 
            c.id === candidateId ? { ...c, status: 'rejected' } : c
          ))
          notifyCustom('WARNING', 'PERSONNEL', 'Candidato Rifiutato', `Candidato ${candidate.name} rifiutato`)
          logReadAction('candidate_rejected', candidateId)
          break
        case 'hire':
          setCandidates(prev => prev.map(c => 
            c.id === candidateId ? { ...c, status: 'hired' } : c
          ))
          notifyCustom('SUCCESS', 'PERSONNEL', 'Candidato Assunto', `Candidato ${candidate.name} assunto con successo`)
          logReadAction('candidate_hired', candidateId)
          break
      }
    } catch (error) {
      notifyCustom('ERROR', 'SYSTEM', 'Errore', 'Errore nell\'operazione')
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter
    const matchesPosition = positionFilter === 'all' || candidate.position === positionFilter
    
    return matchesSearch && matchesStatus && matchesPosition
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'hired': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'In Attesa'
      case 'approved': return 'Approvato'
      case 'rejected': return 'Rifiutato'
      case 'hired': return 'Assunto'
      default: return status
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'Chef de Partie': return '👨‍🍳'
      case 'Responsabile Sala': return '🍽️'
      case 'Dipendente Sala': return '👤'
      case 'Cassiere': return '💰'
      case 'Barista': return '🍹'
      default: return '💼'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT')
  }

  const formatDaysAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Oggi'
    if (days === 1) return 'Ieri'
    return `${days} giorni fa`
  }

  // 🔥 RIGA 185 - Stats sicure con fallback
  const stats = {
    total: candidates?.length || 0,
    pending: candidates?.filter(c => c.status === 'pending').length || 0,
    approved: candidates?.filter(c => c.status === 'approved').length || 0,
    rejected: candidates?.filter(c => c.status === 'rejected').length || 0,
    hired: candidates?.filter(c => c.status === 'hired').length || 0
  }

  // 🔥 RIGA 193 - Filtra positions valide
  const positions = Array.from(
    new Set(
      candidates
        ?.map(c => c.position)
        ?.filter(p => p && typeof p === 'string' && p.trim() !== '') || [] // ← Filtra valori invalidi
    )
  ).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-xl text-gray-700">Caricamento candidati...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          <div className="text-sm text-blue-700">Totali</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          <div className="text-sm text-yellow-700">In Attesa</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
          <div className="text-sm text-green-700">Approvati</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
          <div className="text-sm text-red-700">Rifiutati</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.hired || 0}</div>
          <div className="text-sm text-purple-700">Assunti</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome, email o posizione..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="pending">In Attesa</option>
              <option value="approved">Approvati</option>
              <option value="rejected">Rifiutati</option>
              <option value="hired">Assunti</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Posizione</label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutte</option>
              {positions.map((position, index) => (
                <option key={`position-${index}`} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadCandidates}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Lista Candidati */}
      <div className="space-y-4">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {candidates.length === 0 ? 'Nessun CV ricevuto' : 'Nessun candidato trovato'}
            </h3>
            <p className="text-gray-500 mb-4">
              {candidates.length === 0 
                ? 'Non sono ancora arrivati curriculum vitae da candidati esterni'
                : 'Modifica i filtri per vedere più risultati'}
            </p>
            {candidates.length === 0 && (
              <div className="mt-6 text-sm text-gray-400">
                <p>💡 I candidati appariranno qui quando:</p>
                <p className="mt-2">• Riceverai CV tramite form di candidatura</p>
                <p>• Importerai CV da altre fonti</p>
                <p>• Aggiungerai manualmente candidati</p>
              </div>
            )}
          </div>
        ) : (
          filteredCandidates.map(candidate => (
            <div key={candidate.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{getPositionIcon(candidate.position)}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{candidate.name}</h3>
                      <p className="text-gray-600">{candidate.position} • {candidate.experience}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(candidate.status)}`}>
                      {getStatusLabel(candidate.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <div className="font-medium">{candidate.email}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Telefono:</span>
                      <div className="font-medium">{candidate.phone || 'Non fornito'}</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-gray-600 text-sm">Competenze:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {candidate.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {candidate.notes && (
                    <div className="mb-3">
                      <span className="text-gray-600 text-sm">Note:</span>
                      <p className="text-sm text-gray-900 mt-1">{candidate.notes}</p>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600">
                    Candidato il {formatDate(candidate.createdAt)} ({formatDaysAgo(candidate.createdAt)})
                  </div>
                </div>
                
                {/* Azioni */}
                <div className="flex gap-2 ml-4">
                  {candidate.resumeUrl && (
                    <button
                      onClick={() => window.open(candidate.resumeUrl, '_blank')}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
                    >
                      📄 CV
                    </button>
                  )}
                  
                  {candidate.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleCandidateAction(candidate.id, 'approve')}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                      >
                        ✅ Approva
                      </button>
                      <button
                        onClick={() => handleCandidateAction(candidate.id, 'reject')}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                      >
                        ❌ Rifiuta
                      </button>
                    </>
                  )}
                  
                  {candidate.status === 'approved' && (
                    <button
                      onClick={() => handleCandidateAction(candidate.id, 'hire')}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                    >
                      💼 Assumi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
