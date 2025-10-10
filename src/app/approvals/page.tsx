'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import ApprovalsSwaps from '@/components/approvals/Swaps'
import ApprovalsEmployees from '@/components/approvals/Employees'
import ApprovalsPayroll from '@/components/approvals/Payroll'

export interface ApprovalItem {
  id: string
  type: 'leave' | 'swap' | 'employee' | 'payroll' | 'expense' | 'schedule'
  title: string
  description: string
  requester: string
  requesterRole: string
  department: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: string
  dueDate?: string
  metadata: Record<string, any>
  actions: string[]
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('swaps')
  const [pendingCount, setPendingCount] = useState(0)
  const { 
    canManageEmployees, 
    canManagePayroll,
    canManageShifts 
  } = usePermissions()
  const { notifyCustom } = useNotifications()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Gestisci query param ?tab=payroll
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['swaps', 'employees', 'payroll'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Calcola conteggio approvazioni in sospeso (ESCLUSE FERIE - ora in Time Management)
  useEffect(() => {
    const calculatePendingCount = () => {
      let count = 0
      
      try {
        // Conteggio richieste swap turni
        if (canManageShifts()) {
          const swapRequests = JSON.parse(localStorage.getItem('shift_swap_requests_v1') || '[]')
          count += swapRequests.filter((req: any) => req.status === 'PENDING').length
        }
        
        // Conteggio richieste dipendenti
        if (canManageEmployees()) {
          const employeeRequests = JSON.parse(localStorage.getItem('employee_requests') || '[]')
          count += employeeRequests.filter((req: any) => req.status === 'pending').length
        }
        
        // Conteggio richieste payroll
        if (canManagePayroll()) {
          const payrollRequests = JSON.parse(localStorage.getItem('payroll_requests') || '[]')
          count += payrollRequests.filter((req: any) => req.status === 'pending').length
        }
      } catch (error) {
        console.error('Errore nel calcolo approvazioni:', error)
      }
      
      setPendingCount(count)
    }
    
    calculatePendingCount()
    
    // Listener per aggiornamenti
    const handleUpdate = () => calculatePendingCount()
    window.addEventListener('approvals_updated', handleUpdate)
    window.addEventListener('shift_swaps_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('approvals_updated', handleUpdate)
      window.removeEventListener('shift_swaps_updated', handleUpdate)
    }
  }, [canManageEmployees, canManagePayroll, canManageShifts])

  const tabs = [
    { 
      id: 'swaps', 
      label: 'Cambi Turno', 
      icon: '🔄', 
      component: ApprovalsSwaps,
      permission: canManageShifts(),
      badge: 0 // Sarà calcolato dinamicamente
    },
    { 
      id: 'employees', 
      label: 'Dipendenti', 
      icon: '👥', 
      component: ApprovalsEmployees,
      permission: canManageEmployees(),
      badge: 0 // Sarà calcolato dinamicamente
    },
    { 
      id: 'payroll', 
      label: 'Payroll', 
      icon: '💰', 
      component: ApprovalsPayroll,
      permission: canManagePayroll(),
      badge: 0 // Sarà calcolato dinamicamente
    }
  ]

  const visibleTabs = tabs.filter(tab => tab.permission)

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  const handleBulkAction = async (action: string, itemIds: string[]) => {
    try {
      // Implementa azioni bulk
      switch (action) {
        case 'approve_all':
          notifyCustom('✅ Tutte le richieste sono state approvate', 'success')
          break
        case 'reject_all':
          notifyCustom('❌ Tutte le richieste sono state rifiutate', 'warning')
          break
        default:
          notifyCustom(`Azione ${action} completata`, 'info')
      }
      
      // Aggiorna conteggio
      window.dispatchEvent(new CustomEvent('approvals_updated'))
    } catch (error) {
      notifyCustom('Errore nell\'esecuzione dell\'azione', 'error')
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-700">Caricamento...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition text-lg mt-1"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">✅ Approvazioni</h1>
                <p className="text-gray-600 mt-2">Gestisci tutte le richieste in sospeso</p>
              </div>
            </div>
            
            {pendingCount > 0 && (
              <div className="flex items-center gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="text-lg font-semibold text-red-800">{pendingCount}</div>
                      <div className="text-sm text-red-700">Richieste in sospeso</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('approve_all', [])}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    ✅ Approva Tutto
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject_all', [])}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    ❌ Rifiuta Tutto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center relative
                  `}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {visibleTabs.map((tab) => (
              <div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
                <tab.component 
                  onUpdate={() => window.dispatchEvent(new CustomEvent('approvals_updated'))}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
