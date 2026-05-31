'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import TipsInsert from '@/components/tips/Insert'
import TipsManage from '@/components/tips/Manage'
import TipsDaily from '@/components/tips/Daily'
import TipsHistory from '@/components/tips/History'
import MyTipsTab from './MyTipsTab'

type ManceTabId = 'mine' | 'insert' | 'division' | 'gestione' | 'storico'

const TAB_DEFS: Array<{ id: ManceTabId; label: string; icon: string }> = [
  { id: 'mine', label: 'Le mie mance', icon: '💰' },
  { id: 'insert', label: 'Inserisci', icon: '➕' },
  { id: 'division', label: 'Divisione', icon: '⚖️' },
  { id: 'gestione', label: 'Gestione', icon: '📋' },
  { id: 'storico', label: 'Storico', icon: '📊' },
]

export default function MancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canInsertTips, canManageTips } = usePermissions()

  const canUseManagerTabs = canInsertTips() || canManageTips()
  const showInsert = canUseManagerTabs
  const showDivision = canUseManagerTabs
  const showGestione = canUseManagerTabs

  const visibleTabs = useMemo(
    () =>
      TAB_DEFS.filter((tab) => {
        if (tab.id === 'mine' || tab.id === 'storico') return true
        if (tab.id === 'insert') return showInsert
        if (tab.id === 'division') return showDivision
        if (tab.id === 'gestione') return showGestione
        return false
      }),
    [showInsert, showDivision, showGestione]
  )

  const tabFromUrl = searchParams.get('tab') as ManceTabId | null
  const [activeTab, setActiveTab] = useState<ManceTabId>('mine')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (visibleTabs.length === 0) return
    if (tabFromUrl && visibleTabs.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl)
      return
    }
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [tabFromUrl, visibleTabs, activeTab])

  const monthLabel = currentMonth.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })

  const isCurrentMonth =
    new Date().getFullYear() === currentMonth.getFullYear() &&
    new Date().getMonth() === currentMonth.getMonth()

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() - 1)
      return d
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() + 1)
      return d
    })
  }

  const handleTabChange = (tabId: ManceTabId) => {
    setActiveTab(tabId)
    router.replace(`/mance?tab=${tabId}`, { scroll: false })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-xl text-gray-700">Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-gray-900">Mance</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                  aria-label="Mese precedente"
                >
                  ←
                </button>
                <span
                  className={`text-sm font-medium capitalize min-w-[140px] text-center ${
                    isCurrentMonth ? 'text-orange-600' : 'text-gray-800'
                  }`}
                >
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                  aria-label="Mese successivo"
                >
                  →
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex min-w-max -mb-px px-2 sm:px-4" aria-label="Mance">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`whitespace-nowrap py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 sm:p-6">
              {activeTab === 'mine' && <MyTipsTab currentMonth={currentMonth} />}
              {activeTab === 'insert' && showInsert && <TipsInsert />}
              {activeTab === 'division' && showDivision && <TipsManage />}
              {activeTab === 'gestione' && showGestione && <TipsDaily />}
              {activeTab === 'storico' && <TipsHistory />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
