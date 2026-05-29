'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { PermissionGuard } from '@/components/PermissionGuard'

interface WalkinEntry {
  id: string
  date: string
  time: string
  tableNumber: number | null
  covers: number
  areaId: string
  createdAt: string
}

export default function WalkinsReport() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [areas, setAreas] = useState<Array<{id: string, name: string}>>([])
  const [walkins, setWalkins] = useState<WalkinEntry[]>([])

  const { data: session } = useSession()
  const restaurantId = session?.user?.restaurantId as string | undefined

  // Carica le Sale attive del ristorante dal DB (stesse di /company)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!restaurantId) return
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/locations`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('load failed')
        const data = await res.json()
        const list = ((data.locations ?? []) as Array<{
          id: string
          name: string
          outletName: string
          isActive: boolean
        }>)
          .filter((l) => l.isActive)
          .map((l) => ({ id: l.id, name: l.outletName?.trim() || l.name }))
        if (!cancelled) {
          setAreas(list)
          setSelectedArea((prev) => prev || (list.length > 0 ? list[0].id : ''))
        }
      } catch {
        if (!cancelled) setAreas([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [restaurantId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!selectedDate) return
      try {
        const params = new URLSearchParams({ date: selectedDate })
        if (selectedArea) params.set('area', selectedArea)
        const res = await fetch(`/api/walkins?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('load failed')
        const data = await res.json()
        if (!cancelled) {
          const list: WalkinEntry[] = (data.walkins ?? []).map(
            (w: { id: string; date: string; time: string | null; tableNumber: number | null; covers: number; areaId: string | null; createdAt: string }) => ({
              id: w.id,
              date: w.date,
              time: w.time ?? '',
              tableNumber: w.tableNumber,
              covers: w.covers,
              areaId: w.areaId ?? '',
              createdAt: w.createdAt,
            })
          )
          setWalkins(list)
        }
      } catch {
        if (!cancelled) setWalkins([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedDate, selectedArea])

  const totals = useMemo(() => {
    const total = walkins.reduce((sum, w) => sum + (w.covers || 0), 0)
    const lunch = walkins.filter(w => w.time >= '12:00' && w.time < '16:00').reduce((s, w) => s + (w.covers || 0), 0)
    const dinner1 = walkins.filter(w => w.time >= '19:00' && w.time < '21:00').reduce((s, w) => s + (w.covers || 0), 0)
    const dinner2 = walkins.filter(w => w.time >= '21:00').reduce((s, w) => s + (w.covers || 0), 0)
    return { total, lunch, dinner1, dinner2 }
  }, [walkins])

  return (
    <PermissionGuard permission="bookings_view">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🚶 Passanti</h2>
              <p className="text-gray-600 mt-1">Report dei coperti passanti per data e area</p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-600">Totale</div>
            <div className="text-2xl font-bold text-gray-900">{totals.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-600">Pranzo</div>
            <div className="text-2xl font-bold text-gray-900">{totals.lunch}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-600">Cena 1 (19-21)</div>
            <div className="text-2xl font-bold text-gray-900">{totals.dinner1}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-600">Cena 2 (21-chiusura)</div>
            <div className="text-2xl font-bold text-gray-900">{totals.dinner2}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Dettagli passanti</h3>
          </div>
          <div className="p-6">
            {walkins.length === 0 ? (
              <div className="text-sm text-gray-500">Nessun passante registrato</div>
            ) : (
              <div className="space-y-2">
                {walkins
                  .sort((a,b) => a.time.localeCompare(b.time))
                  .map(w => (
                  <div key={w.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">{w.time}</span>
                      <span className="font-medium text-gray-900">{w.covers} copert{w.covers === 1 ? 'o' : 'i'}</span>
                      <span className="text-gray-600">{w.tableNumber ? `Tavolo ${w.tableNumber}` : 'Tavolo non specificato'}</span>
                    </div>
                    <button
                      onClick={async () => {
                        const prev = walkins
                        setWalkins(prev.filter(x => x.id !== w.id))
                        try {
                          const res = await fetch(`/api/walkins/${w.id}`, {
                            method: 'DELETE',
                            credentials: 'include',
                          })
                          if (!res.ok) throw new Error('delete failed')
                        } catch {
                          setWalkins(prev)
                        }
                      }}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}


