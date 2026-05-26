'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { EmployeeFull } from '@/lib/employees'
import { formatEuro } from '@/lib/utils'
import { useEmployees } from '@/hooks/useEmployees'
import { userDisplayTitle } from '@/lib/user-role-display'
import { joinFullName } from '@/lib/profile-fields'
import {
  CCNL_LEVEL_ORDER,
  CCNL_LEVELS,
  formatCcnlLevelLabel,
  getCcnlMonthlyBase,
  isCcnlLevel,
} from '@/lib/ccnl'

type ProfileTab = 'personale' | 'lavoro' | 'sicurezza' | 'documenti'

type ProfileForm = {
  firstName: string
  lastName: string
  phone: string
  secondaryEmail: string
  birthDate: string
  birthPlace: string
  maritalStatus: string
  childrenCount: string
  education: string
  languages: string
  hobbies: string
  sports: string
  emergencyContact: string
  emergencyPhone: string
}

type ProfileMeta = {
  email: string
  avatar: string
  role: string
  department: string
  position: string
}

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  phone: '',
  secondaryEmail: '',
  birthDate: '',
  birthPlace: '',
  maritalStatus: '',
  childrenCount: '0',
  education: '',
  languages: '',
  hobbies: '',
  sports: '',
  emergencyContact: '',
  emergencyPhone: '',
}

const getBaseForLevel = (level?: number | string | null) => {
  if (!level && level !== 0) return 0
  const key = String(level).toUpperCase()
  if (isCcnlLevel(key)) return getCcnlMonthlyBase(key)
  return 0
}

function formatDepartmentLabel(department: string): string {
  switch (department) {
    case 'cucina':
      return '🍳 Cucina'
    case 'sala':
      return '🍽️ Sala'
    case 'beverage':
      return '🍷 Beverage'
    case 'direzione':
      return '👔 Direzione'
  }
  return department
}

const profileFieldsGridClass =
  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'

function FieldRow({
  label,
  value,
  editing,
  children,
}: {
  label: string
  value?: string
  editing: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <span className="block text-sm text-gray-600 mb-1">{label}</span>
      {editing && children ? (
        children
      ) : (
        <p className="text-gray-900 font-medium break-words">{value || '—'}</p>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
      {children}
    </h4>
  )
}

function ProfileSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 last:mb-0">
      <SectionTitle>{title}</SectionTitle>
      <div className={profileFieldsGridClass}>{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ProfileTab>('personale')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [meta, setMeta] = useState<ProfileMeta>({
    email: '',
    avatar: '👤',
    role: '',
    department: '',
    position: '',
  })
  const [myEmployee, setMyEmployee] = useState<EmployeeFull | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const { employees: employeesList } = useEmployees({ active: true })

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true)
    try {
      const res = await fetch('/api/profile', { credentials: 'include' })
      if (!res.ok) throw new Error('Caricamento profilo fallito')
      const data = await res.json()
      const p = data.profile as ProfileForm & ProfileMeta & { childrenCount: number }
      setForm({
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        phone: p.phone ?? '',
        secondaryEmail: p.secondaryEmail ?? '',
        birthDate: p.birthDate ?? '',
        birthPlace: p.birthPlace ?? '',
        maritalStatus: p.maritalStatus ?? '',
        childrenCount: String(p.childrenCount ?? 0),
        education: p.education ?? '',
        languages: p.languages ?? '',
        hobbies: p.hobbies ?? '',
        sports: p.sports ?? '',
        emergencyContact: p.emergencyContact ?? '',
        emergencyPhone: p.emergencyPhone ?? '',
      })
      setMeta({
        email: p.email ?? '',
        avatar: p.avatar ?? '👤',
        role: p.role ?? '',
        department: p.department ?? '',
        position: p.position ?? '',
      })
    } catch {
      setMessage('❌ Impossibile caricare il profilo')
    } finally {
      setIsLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    void loadProfile()
  }, [session, status, router, loadProfile])

  useEffect(() => {
    if (!session?.user?.id) return
    const emp =
      (employeesList as EmployeeFull[]).find((e) => e.id === session.user!.id) || null
    setMyEmployee(emp)
  }, [employeesList, session?.user?.id])

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || session?.user?.name || 'Utente'
  const roleLabel = userDisplayTitle(meta.position || session?.user?.position, meta.role || session?.user?.role)
  const departmentLabel = formatDepartmentLabel(meta.department || session?.user?.department || '')

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return

    setIsSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: session.user.id,
          name: joinFullName(form.firstName, form.lastName),
          phone: form.phone,
          secondaryEmail: form.secondaryEmail,
          birthDate: form.birthDate || null,
          birthPlace: form.birthPlace,
          maritalStatus: form.maritalStatus,
          childrenCount: form.childrenCount === '' ? 0 : Number(form.childrenCount),
          education: form.education,
          languages: form.languages,
          hobbies: form.hobbies,
          sports: form.sports,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Errore nel salvataggio')
      }

      await updateSession({
        name: joinFullName(form.firstName, form.lastName),
        phone: form.phone || null,
      })

      setMessage('✅ Profilo aggiornato')
      setIsEditing(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? `❌ ${error.message}` : '❌ Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!session?.user?.id) return

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage('❌ Compila tutti i campi password')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('❌ Le password non coincidono')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage('❌ La nuova password deve essere di almeno 8 caratteri')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore nel cambio password')
      }

      setMessage('✅ Password cambiata con successo')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? `❌ ${error.message}` : '❌ Errore nel cambio password')
    } finally {
      setIsSaving(false)
    }
  }

  const maritalLabel = (value: string) => {
    switch (value) {
      case 'single':
        return 'Celibe/Nubile'
      case 'married':
        return 'Coniugato/a'
      case 'divorced':
        return 'Divorziato/a'
      case 'widowed':
        return 'Vedovo/a'
      default:
        return '—'
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm'

  if (status === 'loading' || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-700">Caricamento profilo...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const userRole = session.user?.role || 'DIPENDENTE'
  const showWorkTab = Boolean(myEmployee) && userRole !== 'PROPRIETARIO'

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'personale', label: 'Personale' },
    ...(showWorkTab ? [{ id: 'lavoro' as const, label: 'Lavoro' }] : []),
    { id: 'sicurezza', label: 'Sicurezza' },
    { id: 'documenti', label: 'Documenti' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="flex-1 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center sm:gap-6">
                <div className="text-6xl shrink-0">{meta.avatar}</div>
                <div className="mt-3 sm:mt-0 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{displayName}</h1>
                  <p className="text-gray-700 mt-1">{roleLabel}</p>
                  {departmentLabel && departmentLabel !== '' && (
                    <p className="text-gray-600 text-sm mt-0.5">{departmentLabel}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        void loadProfile()
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile()}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Modifica
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto px-4" aria-label="Profilo">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-3 px-4 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'personale' && (
              <div>
                <ProfileSection title="Contatti">
                  <FieldRow label="Nome" value={form.firstName} editing={isEditing}>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Cognome" value={form.lastName} editing={isEditing}>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Telefono" value={form.phone} editing={isEditing}>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+39 ..."
                    />
                  </FieldRow>
                  <FieldRow
                    label="Email secondaria"
                    value={form.secondaryEmail}
                    editing={isEditing}
                  >
                    <input
                      type="email"
                      value={form.secondaryEmail}
                      onChange={(e) => setForm({ ...form, secondaryEmail: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                </ProfileSection>

                <ProfileSection title="Anagrafica">
                  <FieldRow label="Data di nascita" value={form.birthDate} editing={isEditing}>
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Luogo di nascita" value={form.birthPlace} editing={isEditing}>
                    <input
                      type="text"
                      value={form.birthPlace}
                      onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow
                    label="Stato civile"
                    value={maritalLabel(form.maritalStatus)}
                    editing={isEditing}
                  >
                    <select
                      value={form.maritalStatus}
                      onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Seleziona...</option>
                      <option value="single">Celibe/Nubile</option>
                      <option value="married">Coniugato/a</option>
                      <option value="divorced">Divorziato/a</option>
                      <option value="widowed">Vedovo/a</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Numero figli" value={form.childrenCount} editing={isEditing}>
                    <input
                      type="number"
                      min={0}
                      value={form.childrenCount}
                      onChange={(e) => setForm({ ...form, childrenCount: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                </ProfileSection>

                <ProfileSection title="Formazione">
                  <FieldRow label="Titolo di studio" value={form.education} editing={isEditing}>
                    <input
                      type="text"
                      value={form.education}
                      onChange={(e) => setForm({ ...form, education: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Lingue parlate" value={form.languages} editing={isEditing}>
                    <input
                      type="text"
                      value={form.languages}
                      onChange={(e) => setForm({ ...form, languages: e.target.value })}
                      className={inputClass}
                      placeholder="Es. Italiano, Inglese"
                    />
                  </FieldRow>
                </ProfileSection>

                <ProfileSection title="Interessi">
                  <FieldRow label="Hobby" value={form.hobbies} editing={isEditing}>
                    <input
                      type="text"
                      value={form.hobbies}
                      onChange={(e) => setForm({ ...form, hobbies: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Sport" value={form.sports} editing={isEditing}>
                    <input
                      type="text"
                      value={form.sports}
                      onChange={(e) => setForm({ ...form, sports: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                </ProfileSection>

                <ProfileSection title="Emergenza">
                  <FieldRow
                    label="Contatto emergenza"
                    value={form.emergencyContact}
                    editing={isEditing}
                  >
                    <input
                      type="text"
                      value={form.emergencyContact}
                      onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow
                    label="Telefono emergenza"
                    value={form.emergencyPhone}
                    editing={isEditing}
                  >
                    <input
                      type="tel"
                      value={form.emergencyPhone}
                      onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                </ProfileSection>
              </div>
            )}

            {activeTab === 'lavoro' && showWorkTab && myEmployee && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <span className="text-sm text-gray-600">Mansione</span>
                  <p className="font-medium text-gray-900">
                    {myEmployee.role?.replace(/_/g, ' ') || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Livello CCNL</span>
                  <p className="font-medium text-gray-900">
                    {formatCcnlLevelLabel(
                      isCcnlLevel(myEmployee.ccnlLevel ?? undefined)
                        ? myEmployee.ccnlLevel
                        : CCNL_LEVEL_ORDER.find(
                            (lvl) =>
                              CCNL_LEVELS[lvl].hierarchy === Number(myEmployee.level)
                          ) ??
                          (isCcnlLevel(String(myEmployee.level))
                            ? String(myEmployee.level)
                            : null)
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Tipo contratto</span>
                  <p className="font-medium text-gray-900">
                    {myEmployee.contractTypeEnum === 'DETERMINATO' ? 'Determinato' : 'Indeterminato'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Full-time / Part-time</span>
                  <p className="font-medium text-gray-900">
                    {myEmployee.contractType === 'part-time' ? 'Part-time' : 'Full-time'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Ore settimanali</span>
                  <p className="font-medium text-gray-900">
                    {myEmployee.contractType === 'part-time'
                      ? (myEmployee.weeklyHours ?? '—')
                      : 40}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Paga base</span>
                  <p className="font-medium text-gray-900">
                    {formatEuro(
                      myEmployee.baseSalary
                        ? myEmployee.baseSalary
                        : getBaseForLevel(myEmployee.level)
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Reparto</span>
                  <p className="font-medium text-gray-900">{myEmployee.department || '—'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Data assunzione</span>
                  <p className="font-medium text-gray-900">
                    {myEmployee.startDate
                      ? new Date(myEmployee.startDate).toLocaleDateString('it-IT')
                      : '—'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'sicurezza' && (
              <div className="max-w-md space-y-6">
                <div>
                  <span className="text-sm text-gray-600">Email di accesso</span>
                  <p className="font-medium text-gray-900 mt-1">{meta.email || session.user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Solo lettura — contatta l&apos;amministratore per modificarla.</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Cambio password</h4>
                  {!isChangingPassword ? (
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(true)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Cambia password
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Password attuale</label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Nuova password</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                          }
                          className={inputClass}
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimo 8 caratteri</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Conferma password</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(false)
                            setPasswordForm({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: '',
                            })
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleChangePassword()}
                          disabled={isSaving}
                          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                          {isSaving ? 'Salvataggio...' : 'Salva password'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documenti' && (
              <div className="text-center py-12 text-gray-600">
                <div className="text-4xl mb-3">📁</div>
                <p className="font-medium text-gray-800">Prossimamente</p>
                <p className="text-sm mt-2">Buste paga, CU e contratti saranno disponibili qui.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
