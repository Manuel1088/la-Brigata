'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Ruoli proposti nel wizard → mappati al department richiesto da /api/employees/new
const ROLE_OPTIONS: Array<{ value: string; label: string; department: string }> = [
  { value: 'CAMERIERE', label: 'Cameriere/a', department: 'sala' },
  { value: 'RESPONSABILE_SALA', label: 'Responsabile di Sala', department: 'sala' },
  { value: 'CHEF', label: 'Chef / Cuoco', department: 'cucina' },
  { value: 'SOUS_CHEF', label: 'Sous Chef', department: 'cucina' },
  { value: 'LAVAPIATTI', label: 'Lavapiatti', department: 'cucina' },
  { value: 'BARMAN', label: 'Barman', department: 'beverage' },
  { value: 'SOMMELIER', label: 'Sommelier', department: 'beverage' },
  { value: 'CASSIERE', label: 'Cassiere/a', department: 'accoglienza' },
  { value: 'MANAGER', label: 'Manager / Direttore', department: 'dirigenti' },
]

type TeamMember = {
  firstName: string
  lastName: string
  email: string
  role: string
}

function emptyMember(): TeamMember {
  return { firstName: '', lastName: '', email: '', role: ROLE_OPTIONS[0].value }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [checking, setChecking] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 — Sale
  const [roomInput, setRoomInput] = useState('')
  const [rooms, setRooms] = useState<string[]>([])
  const [savingRooms, setSavingRooms] = useState(false)
  const [roomsError, setRoomsError] = useState<string | null>(null)

  // Step 2 — Team
  const [members, setMembers] = useState<TeamMember[]>([emptyMember()])
  const [savingTeam, setSavingTeam] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  // ── Guard: solo titolare/manager senza Sale ──────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || !session) {
      router.replace('/login')
      return
    }
    const wantStep2 =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('step') === '2'
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/onboarding/status', { credentials: 'include' })
        const data = await res.json()
        if (cancelled) return
        // Non titolare/manager o senza ristorante → via alla dashboard
        if (!data.isOwnerOrManager || !data.restaurantId) {
          router.replace('/dashboard')
          return
        }
        // Ristorante già configurato (ha Sale)
        if (data.hasLocations) {
          // Dal banner "Aggiungi ora →" si entra direttamente allo step team
          if (wantStep2) {
            setRestaurantId(data.restaurantId)
            setStep(2)
            setChecking(false)
            return
          }
          router.replace('/dashboard')
          return
        }
        // Nessuna Sala → step 1 bloccante
        setRestaurantId(data.restaurantId)
        setChecking(false)
      } catch {
        if (!cancelled) router.replace('/dashboard')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, status, router])

  // ── Step 1 handlers ──────────────────────────────────────────────────────
  const addRoom = () => {
    const name = roomInput.trim()
    if (!name) return
    if (rooms.some((r) => r.toLowerCase() === name.toLowerCase())) {
      setRoomInput('')
      return
    }
    setRooms((prev) => [...prev, name])
    setRoomInput('')
  }

  const removeRoom = (name: string) => {
    setRooms((prev) => prev.filter((r) => r !== name))
  }

  const submitRooms = async () => {
    if (rooms.length === 0 || !restaurantId) return
    setSavingRooms(true)
    setRoomsError(null)
    try {
      for (const name of rooms) {
        const res = await fetch(`/api/restaurants/${restaurantId}/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, outletName: name, type: 'RISTORANTE' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `Errore nel salvataggio della sala "${name}"`)
        }
      }
      setStep(2)
    } catch (e) {
      setRoomsError(e instanceof Error ? e.message : 'Errore nel salvataggio delle sale')
    } finally {
      setSavingRooms(false)
    }
  }

  // ── Step 2 handlers ──────────────────────────────────────────────────────
  const updateMember = (index: number, patch: Partial<TeamMember>) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  const addMemberRow = () => setMembers((prev) => [...prev, emptyMember()])

  const removeMemberRow = (index: number) => {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const goToDashboard = () => router.push('/dashboard')

  const saveTeamAndContinue = async () => {
    const filled = members.filter(
      (m) => m.firstName.trim() && m.lastName.trim() && m.email.trim()
    )
    if (filled.length === 0) {
      goToDashboard()
      return
    }
    setSavingTeam(true)
    setTeamError(null)
    const failures: string[] = []
    for (const m of filled) {
      const dept = ROLE_OPTIONS.find((r) => r.value === m.role)?.department ?? 'sala'
      try {
        const res = await fetch('/api/employees/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firstName: m.firstName.trim(),
            lastName: m.lastName.trim(),
            email: m.email.trim(),
            role: m.role,
            department: dept,
            workSchedule: 'full-time',
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          failures.push(`${m.firstName} ${m.lastName}: ${err.error || 'errore'}`)
        }
      } catch {
        failures.push(`${m.firstName} ${m.lastName}: errore di connessione`)
      }
    }
    setSavingTeam(false)
    if (failures.length > 0) {
      setTeamError(`Alcuni membri non sono stati aggiunti:\n${failures.join('\n')}`)
      return
    }
    goToDashboard()
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-xl text-gray-500">Caricamento…</div>
      </div>
    )
  }

  const canContinueStep1 = rooms.length > 0 && !savingRooms

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`} />
          <span className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`} />
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Benvenuto su La Brigata! Come è strutturato il tuo ristorante?
            </h1>
            <p className="text-gray-500 mb-6">
              Aggiungi le sale del tuo locale (es. Sala interna, Dehors, Privé). Servono per
              prenotazioni, turni e coperti.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">Nome sala</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addRoom()
                  }
                }}
                placeholder="Es. Sala principale"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={addRoom}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition"
              >
                Aggiungi
              </button>
            </div>

            {rooms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {rooms.map((room) => (
                  <span
                    key={room}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-800 rounded-full text-sm border border-orange-200"
                  >
                    {room}
                    <button
                      type="button"
                      onClick={() => removeRoom(room)}
                      className="text-orange-500 hover:text-orange-700 leading-none"
                      aria-label={`Rimuovi ${room}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {roomsError && (
              <p className="mt-4 text-sm text-red-600">{roomsError}</p>
            )}

            <button
              type="button"
              onClick={submitRooms}
              disabled={!canContinueStep1}
              className="w-full mt-8 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingRooms ? 'Salvataggio…' : 'Continua →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Aggiungi il tuo team</h1>
            <p className="text-gray-500 mb-6">Puoi farlo ora o dopo dalla dashboard.</p>

            <div className="space-y-4">
              {members.map((m, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Membro {i + 1}</span>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMemberRow(i)}
                        className="text-sm text-gray-400 hover:text-red-500"
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nome"
                      value={m.firstName}
                      onChange={(e) => updateMember(i, { firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="Cognome"
                      value={m.lastName}
                      onChange={(e) => updateMember(i, { lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={m.email}
                      onChange={(e) => updateMember(i, { email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <select
                      value={m.role}
                      onChange={(e) => updateMember(i, { role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addMemberRow}
              className="mt-4 text-orange-600 font-medium hover:text-orange-700"
            >
              + Aggiungi altro membro
            </button>

            {teamError && (
              <p className="mt-4 text-sm text-red-600 whitespace-pre-line">{teamError}</p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={saveTeamAndContinue}
                disabled={savingTeam}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-40"
              >
                {savingTeam ? 'Salvataggio…' : 'Vai alla dashboard →'}
              </button>
              <button
                type="button"
                onClick={goToDashboard}
                disabled={savingTeam}
                className="flex-1 sm:flex-none px-6 py-3 text-gray-600 rounded-lg hover:bg-gray-100 transition font-medium disabled:opacity-40"
              >
                Fai dopo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
