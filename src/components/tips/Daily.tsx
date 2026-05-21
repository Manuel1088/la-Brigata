'use client'

import { useCallback, useEffect, useState } from 'react'

type TipEntryRow = {
  id: string
  date: string
  location: string
  locationId: string
  type: 'cash' | 'card' | 'foreign'
  amount: number
  notes?: string | null
  createdAt?: string
}

type DistributionRow = {
  id: string
  date: string
  locationId: string
  locationName: string
  amount: number
  employeeScore: number
  totalTips: number
  totalPoints: number
  isPresent: boolean
}

type ByDayEmployee = {
  date: string
  amount: number
  items: DistributionRow[]
}

type ByDayManager = {
  date: string
  amount: number
  items: TipEntryRow[]
}

type EntriesResponse = {
  view: 'manager' | 'employee'
  month: number
  year: number
  monthLabel: string
  byDay: ByDayEmployee[] | ByDayManager[]
  capabilities?: { canEditTips: boolean; canDeleteTips: boolean }
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

const typeLabel = (type: TipEntryRow['type']) =>
  type === 'cash' ? 'Contanti' : type === 'card' ? 'Carta' : 'Monete estere'

const typeBadgeClass = (type: TipEntryRow['type']) =>
  type === 'cash'
    ? 'bg-green-100 text-green-800'
    : type === 'card'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800'

const toIsoDate = (d: Date) => {
  const z = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function ManagerEntryRow({
  entry,
  canEdit,
  canDelete,
  onUpdated,
  onDeleted,
}: {
  entry: TipEntryRow
  canEdit: boolean
  canDelete: boolean
  onUpdated: (entry: TipEntryRow) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftAmount, setDraftAmount] = useState(String(entry.amount))
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) setDraftAmount(String(entry.amount))
  }, [entry.amount, editing])

  const saveAmount = async () => {
    const amount = parseFloat(draftAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Inserisci un importo valido maggiore di zero')
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/tips/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'Salvataggio fallito')
      }
      const updated = (body as { entry: TipEntryRow }).entry
      onUpdated(updated)
      setEditing(false)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Errore salvataggio')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    const ok = window.confirm(
      `Eliminare l'inserimento di ${formatCurrency(entry.amount)} (${typeLabel(entry.type)}) per ${entry.location}?`
    )
    if (!ok) return
    setBusy(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/tips/${entry.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'Eliminazione fallita')
      }
      onDeleted(entry.id)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Errore eliminazione')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
            📍 {entry.location}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadgeClass(entry.type)}`}
          >
            {typeLabel(entry.type)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {editing ? (
            <>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                disabled={busy}
                className="w-28 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                aria-label="Nuovo importo"
              />
              <button
                type="button"
                onClick={() => void saveAmount()}
                disabled={busy}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Salva
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setDraftAmount(String(entry.amount))
                  setActionError(null)
                }}
                disabled={busy}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annulla
              </button>
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-900 text-base">
                {formatCurrency(entry.amount)}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  Modifica
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  disabled={busy}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Elimina
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {entry.notes ? (
        <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-500">Note: </span>
          {entry.notes}
        </p>
      ) : null}
      {actionError ? <p className="mt-2 text-sm text-red-600">{actionError}</p> : null}
    </div>
  )
}

export default function TipsDaily() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => toIsoDate(new Date()))
  const [data, setData] = useState<EntriesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tips/entries?year=${year}&month=${month}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Errore caricamento')
      }
      setData((await res.json()) as EntriesResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void load()
  }, [load])

  const isEmployee = data?.view === 'employee'
  const managerByDay = !isEmployee ? (data?.byDay as ByDayManager[] | undefined) ?? [] : []
  const managerDayDates = managerByDay.map((d) => d.date).sort()

  useEffect(() => {
    if (isEmployee || !data) return
    const todayIso = toIsoDate(new Date())
    const inMonth =
      currentMonth.getFullYear() === new Date().getFullYear() &&
      currentMonth.getMonth() === new Date().getMonth()
    if (inMonth && managerDayDates.includes(todayIso)) {
      setSelectedDay(todayIso)
    } else if (managerDayDates.length > 0) {
      setSelectedDay(managerDayDates[managerDayDates.length - 1])
    } else {
      setSelectedDay(toIsoDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)))
    }
  }, [data, isEmployee, year, month, managerDayDates.join(',')])

  const canEditTips = data?.capabilities?.canEditTips ?? false
  const canDeleteTips = data?.capabilities?.canDeleteTips ?? false

  const handleEntryUpdated = useCallback(
    (updated: TipEntryRow) => {
      setData((prev) => {
        if (!prev || prev.view !== 'manager') return prev
        const byDay = (prev.byDay as ByDayManager[]).map((day) => {
          const items = day.items.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item
          )
          const amount = items.reduce((s, e) => s + e.amount, 0)
          return { ...day, items, amount }
        })
        return { ...prev, byDay }
      })
    },
    []
  )

  const handleEntryDeleted = useCallback((deletedId: string) => {
    setData((prev) => {
      if (!prev || prev.view !== 'manager') return prev
      const byDay = (prev.byDay as ByDayManager[])
        .map((day) => {
          const items = day.items.filter((item) => item.id !== deletedId)
          const amount = items.reduce((s, e) => s + e.amount, 0)
          return { ...day, items, amount }
        })
        .filter((day) => day.items.length > 0)
      return { ...prev, byDay }
    })
  }, [])

  const selectedDayEntries =
    managerByDay.find((d) => d.date === selectedDay)?.items ?? []
  const selectedDayTotal = selectedDayEntries.reduce((s, e) => s + e.amount, 0)

  const shiftSelectedDay = (delta: number) => {
    if (managerDayDates.length === 0) return
    const idx = managerDayDates.indexOf(selectedDay)
    const nextIdx =
      idx === -1
        ? delta > 0
          ? 0
          : managerDayDates.length - 1
        : Math.max(0, Math.min(managerDayDates.length - 1, idx + delta))
    setSelectedDay(managerDayDates[nextIdx])
  }

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

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Caricamento...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button type="button" onClick={() => void load()} className="block mt-2 text-sm underline">
          Riprova
        </button>
      </div>
    )
  }

  const byDay = data?.byDay ?? []

  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">📅 Le tue mance giornaliere</h2>
              <p className="text-sm text-gray-500 mt-1 capitalize">{data?.monthLabel}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                aria-label="Mese precedente"
              >
                ←
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                aria-label="Mese successivo"
              >
                →
              </button>
            </div>
          </div>

          <div className="p-6">
            {byDay.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessuna distribuzione in questo mese</p>
            ) : (
              <div className="space-y-6">
                {byDay.map((day) => (
                  <div key={day.date} className="border rounded-lg">
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                      <div className="font-medium">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </div>
                      <div className="text-sm text-gray-700">
                        Totale:{' '}
                        <span className="font-semibold">{formatCurrency(day.amount)}</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {(day as ByDayEmployee).items.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-white">
                              {d.locationName}
                            </span>
                            <span className="text-gray-500">
                              Punti {d.employeeScore}/{d.totalPoints} · pool{' '}
                              {formatCurrency(d.totalTips)}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(d.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">📊 Inserimenti mance del ristorante</h2>
            <p className="text-sm text-gray-500 mt-1 capitalize">{data?.monthLabel}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              aria-label="Mese precedente"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              aria-label="Mese successivo"
            >
              →
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b bg-orange-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftSelectedDay(-1)}
              disabled={managerDayDates.length === 0}
              className="px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Giorno precedente"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
            <button
              type="button"
              onClick={() => shiftSelectedDay(1)}
              disabled={managerDayDates.length === 0}
              className="px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Giorno successivo"
            >
              →
            </button>
          </div>
          <div className="text-sm text-gray-700">
            Totale giorno:{' '}
            <span className="font-semibold text-gray-900">{formatCurrency(selectedDayTotal)}</span>
            {selectedDayEntries.length > 0 && (
              <span className="text-gray-500 ml-2">
                · {selectedDayEntries.length} inseriment
                {selectedDayEntries.length === 1 ? 'o' : 'i'}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {managerDayDates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nessuna mancia registrata in questo mese</p>
          ) : selectedDayEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nessun inserimento per{' '}
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <p className="font-medium text-gray-900">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  TipEntry · location, tipo pagamento, importo e note
                </p>
              </div>
              <div className="px-4 divide-y divide-gray-100">
                {selectedDayEntries.map((entry) => (
                  <ManagerEntryRow
                    key={entry.id}
                    entry={entry}
                    canEdit={canEditTips}
                    canDelete={canDeleteTips}
                    onUpdated={handleEntryUpdated}
                    onDeleted={handleEntryDeleted}
                  />
                ))}
              </div>
            </div>
          )}

          {managerDayDates.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Giorni con inserimenti nel mese
              </p>
              <div className="flex flex-wrap gap-2">
                {managerDayDates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDay(date)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      date === selectedDay
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {new Date(date + 'T12:00:00').toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
