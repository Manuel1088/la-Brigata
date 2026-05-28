'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

// ── Types ──────────────────────────────────────────────────────────────────

type TaskPriority = 'ALTA' | 'MEDIA' | 'BASSA'
type TaskStatus = 'DA_FARE' | 'IN_CORSO' | 'COMPLETATO'
type TaskRecurring = 'GIORNALIERO' | 'SETTIMANALE' | 'MENSILE'

type TaskUser = {
  id: string
  firstName: string | null
  lastName: string | null
  name: string | null
  role?: string | null
}

type Task = {
  id: string
  title: string
  description: string | null
  assignedToId: string | null
  assignedToRole: string | null
  assignedById: string
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  isRecurring: boolean
  recurringType: TaskRecurring | null
  completedAt: string | null
  completedById: string | null
  createdAt: string
  updatedAt: string
  assignedTo: TaskUser | null
  assignedBy: TaskUser
  completedBy: TaskUser | null
}

type RestaurantUser = {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  role: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<TaskPriority, string> = { ALTA: 'Alta', MEDIA: 'Media', BASSA: 'Bassa' }
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  ALTA: 'bg-red-100 text-red-700',
  MEDIA: 'bg-amber-100 text-amber-700',
  BASSA: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<TaskStatus, string> = {
  DA_FARE: 'Da fare',
  IN_CORSO: 'In corso',
  COMPLETATO: 'Completato',
}
const STATUS_COLOR: Record<TaskStatus, string> = {
  DA_FARE: 'bg-blue-50 text-blue-700',
  IN_CORSO: 'bg-amber-50 text-amber-700',
  COMPLETATO: 'bg-green-50 text-green-700',
}
const RECURRING_LABEL: Record<TaskRecurring, string> = {
  GIORNALIERO: 'Giornaliero',
  SETTIMANALE: 'Settimanale',
  MENSILE: 'Mensile',
}

// Default templates per ruolo
const ROLE_TEMPLATES: Record<string, Array<{ title: string; recurringType: TaskRecurring; priority: TaskPriority }>> = {
  SOMMELIER: [
    { title: 'Inventario cantina', recurringType: 'MENSILE', priority: 'ALTA' },
    { title: 'Aggiornamento carta vini', recurringType: 'SETTIMANALE', priority: 'MEDIA' },
  ],
  MAITRE: [
    { title: 'Smontaggio vetri terrazza', recurringType: 'SETTIMANALE', priority: 'MEDIA' },
    { title: 'Report sala mensile', recurringType: 'MENSILE', priority: 'ALTA' },
  ],
  EXECUTIVE_CHEF: [
    { title: 'Cambio menu stagionale', recurringType: 'MENSILE', priority: 'ALTA' },
    { title: 'Briefing cucina settimanale', recurringType: 'SETTIMANALE', priority: 'MEDIA' },
  ],
  HEAD_BARMAN: [
    { title: 'Inventario bar', recurringType: 'MENSILE', priority: 'ALTA' },
    { title: 'Ordine scorte bar', recurringType: 'SETTIMANALE', priority: 'MEDIA' },
  ],
  CAPO_PASTICCERE: [
    { title: 'Inventario pasticceria', recurringType: 'MENSILE', priority: 'ALTA' },
    { title: 'Pianificazione dessert settimanale', recurringType: 'SETTIMANALE', priority: 'MEDIA' },
  ],
}

// ── Helper functions ───────────────────────────────────────────────────────

function displayName(u: TaskUser | null | undefined): string {
  if (!u) return '—'
  if (u.firstName || u.lastName) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
  return u.name ?? '—'
}

function formatDueDate(iso: string | null): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!iso) return { label: '', isOverdue: false, isToday: false }
  const due = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isToday = due >= today && due < tomorrow
  const isOverdue = due < today
  const label = isToday
    ? 'Oggi'
    : isOverdue
      ? `Scaduto ${due.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
      : due.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return { label, isOverdue, isToday }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TaskCard({
  task,
  currentUserId,
  isManager,
  onStatusChange,
  onEdit,
  onDelete,
  showAssignee = false,
}: {
  task: Task
  currentUserId: string
  isManager: boolean
  onStatusChange: (id: string, status: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  showAssignee?: boolean
}) {
  const due = formatDueDate(task.dueDate)
  const isCompleted = task.status === 'COMPLETATO'
  const isAssignedToMe =
    task.assignedToId === currentUserId ||
    task.assignedToId === null

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm transition ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox complete */}
        <button
          type="button"
          onClick={() => onStatusChange(task.id, isCompleted ? 'DA_FARE' : 'COMPLETATO')}
          title={isCompleted ? 'Riapri task' : 'Segna completato'}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : isAssignedToMe
                ? 'border-gray-300 hover:border-green-400'
                : 'border-gray-200 cursor-not-allowed opacity-50'
          }`}
          disabled={!isAssignedToMe && !isManager}
        >
          {isCompleted && <span className="text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>
                {PRIORITY_LABEL[task.priority]}
              </span>
              {task.isRecurring && task.recurringType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                  🔄 {RECURRING_LABEL[task.recurringType]}
                </span>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Status */}
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>

            {/* Due date */}
            {due.label && (
              <span className={`text-xs font-medium ${
                due.isOverdue && !isCompleted ? 'text-red-600' : due.isToday ? 'text-amber-600' : 'text-gray-400'
              }`}>
                📅 {due.label}
              </span>
            )}

            {/* Assignee */}
            {showAssignee && (
              <span className="text-xs text-gray-400">
                → {task.assignedToId ? displayName(task.assignedTo) : task.assignedToRole ? `Tutti ${task.assignedToRole}` : 'Tutti'}
              </span>
            )}

            {/* Completed info */}
            {isCompleted && task.completedBy && (
              <span className="text-xs text-green-600">
                ✓ {displayName(task.completedBy)} {task.completedAt ? new Date(task.completedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions (manager only) */}
        {isManager && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => onEdit(task)}
              title="Modifica"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              title="Elimina"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* In corso button */}
      {!isCompleted && task.status === 'DA_FARE' && (isAssignedToMe || isManager) && (
        <button
          type="button"
          onClick={() => onStatusChange(task.id, 'IN_CORSO')}
          className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          Segna in corso →
        </button>
      )}
    </div>
  )
}

function StatusFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const opts = [
    { v: '', label: 'Tutti' },
    { v: 'today', label: 'Oggi' },
    { v: 'overdue', label: 'In scadenza' },
    { v: 'COMPLETATO', label: 'Completati' },
  ]
  return (
    <div className="flex gap-2 flex-wrap">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            value === o.v ? 'bg-orange-500 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Modal: Create / Edit task ─────────────────────────────────────────────

type FormData = {
  title: string
  description: string
  assignedToId: string
  assignedToRole: string
  dueDate: string
  priority: TaskPriority
  isRecurring: boolean
  recurringType: TaskRecurring | ''
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  assignedToId: '',
  assignedToRole: '',
  dueDate: '',
  priority: 'MEDIA',
  isRecurring: false,
  recurringType: '',
}

function TaskModal({
  task,
  teamMembers,
  onSave,
  onClose,
  loading,
}: {
  task: Task | null
  teamMembers: RestaurantUser[]
  onSave: (data: FormData, id?: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<FormData>(
    task
      ? {
          title: task.title,
          description: task.description ?? '',
          assignedToId: task.assignedToId ?? '',
          assignedToRole: task.assignedToRole ?? '',
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
          priority: task.priority,
          isRecurring: task.isRecurring,
          recurringType: task.recurringType ?? '',
        }
      : { ...EMPTY_FORM }
  )

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const roleOptions = Object.keys(ROLE_TEMPLATES)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{task ? 'Modifica task' : 'Nuovo task'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Titolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Es. Inventario cantina"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Template per ruolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template rapido</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_TEMPLATES).map(([role, templates]) =>
                templates.map((tpl) => (
                  <button
                    key={`${role}:${tpl.title}`}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        title: tpl.title,
                        assignedToRole: role,
                        isRecurring: true,
                        recurringType: tpl.recurringType,
                        priority: tpl.priority,
                      }))
                    }
                    className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-1 hover:bg-purple-100"
                  >
                    {role}: {tpl.title}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priorità */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as TaskPriority)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BASSA">Bassa</option>
              </select>
            </div>

            {/* Scadenza */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Assegna a persona */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assegna a persona specifica</label>
            <select
              value={form.assignedToId}
              onChange={(e) => { set('assignedToId', e.target.value); if (e.target.value) set('assignedToRole', '') }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">— Non specificato —</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.name ?? m.id}
                  {m.role ? ` (${m.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Assegna a ruolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oppure assegna a tutto un ruolo</label>
            <select
              value={form.assignedToRole}
              onChange={(e) => { set('assignedToRole', e.target.value); if (e.target.value) set('assignedToId', '') }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">— Non specificato —</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Ricorrenza */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={form.isRecurring}
              onChange={(e) => set('isRecurring', e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="recurring" className="text-sm font-medium text-gray-700">Task ricorrente</label>
          </div>

          {form.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo ricorrenza</label>
              <select
                value={form.recurringType}
                onChange={(e) => set('recurringType', e.target.value as TaskRecurring)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">— Seleziona —</option>
                <option value="GIORNALIERO">Giornaliero</option>
                <option value="SETTIMANALE">Settimanale</option>
                <option value="MENSILE">Mensile</option>
              </select>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Annulla
          </button>
          <button
            type="button"
            disabled={!form.title.trim() || loading}
            onClick={() => onSave(form, task?.id)}
            className="px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
          >
            {loading ? 'Salvataggio…' : task ? 'Salva modifiche' : 'Crea task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'mine' | 'department' | 'manage'>('mine')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [savingModal, setSavingModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<RestaurantUser[]>([])

  const { canCreateTasks, canManageTasks } = usePermissions()
  const currentUser = session?.user
  const userId = currentUser?.id ?? ''
  const isManager = canManageTasks()
  const canCreate = canCreateTasks()

  // Redirect
  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  // Load team members (for assignment dropdown)
  useEffect(() => {
    if (!canCreate) return
    fetch('/api/employees', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { employees: [] }))
      .then((d) => {
        const emps = (d.employees ?? []) as RestaurantUser[]
        setTeamMembers(emps)
      })
      .catch(() => {})
  }, [isManager])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/tasks?scope=${activeTab === 'mine' ? 'mine' : activeTab === 'department' ? 'department' : 'all'}`
      if (filter === 'today') url += '&due=today'
      else if (filter === 'overdue') url += '&due=overdue'
      else if (filter === 'COMPLETATO') url += '&status=COMPLETATO'

      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { tasks: Task[] }
      setTasks(data.tasks)
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, filter])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      void loadTasks()
    } catch {
      /* ignore */
    }
  }

  const handleSave = async (form: FormData, id?: string) => {
    setSavingModal(true)
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignedToId: form.assignedToId || null,
        assignedToRole: form.assignedToRole || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        priority: form.priority,
        isRecurring: form.isRecurring,
        recurringType: form.isRecurring && form.recurringType ? form.recurringType : null,
      }
      const res = await fetch(id ? `/api/tasks/${id}` : '/api/tasks', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setEditingTask(null)
      void loadTasks()
    } catch {
      alert('Errore nel salvataggio. Riprova.')
    } finally {
      setSavingModal(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setDeleteConfirm(null)
      void loadTasks()
    } catch {
      alert('Errore nell\'eliminazione.')
    }
  }

  const tabs = [
    { id: 'mine' as const, label: 'I miei task', icon: '📋' },
    ...(canCreate ? [{ id: 'department' as const, label: 'Del reparto', icon: '👥' }] : []),
    ...(isManager ? [{ id: 'manage' as const, label: 'Gestione', icon: '⚙️' }] : []),
  ]

  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETATO')
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETATO')
  const showAssignee = activeTab === 'department' || activeTab === 'manage'

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

            {/* Header row: titolo + pulsante nuovo task */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">Task</h1>
                {!loading && (
                  <span className="text-sm text-gray-500">
                    {activeTasks.length} attivi · {completedTasks.length} completati
                  </span>
                )}
              </div>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => { setEditingTask(null); setModalOpen(true) }}
                  className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg text-sm hover:bg-orange-600 transition"
                >
                  + Nuovo task
                </button>
              )}
            </div>

            {/* Tab bar */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex min-w-max -mb-px px-2 sm:px-4" aria-label="Task">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setFilter('') }}
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

            {/* Content */}
            <div className="p-4 sm:p-6">
              {/* Filters */}
              <div className="mb-5">
                <StatusFilter value={filter} onChange={setFilter} />
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-5xl mb-4">📋</p>
                  <p className="text-lg font-medium text-gray-500">Nessun task trovato</p>
                  <p className="text-sm mt-1">
                    {activeTab === 'mine'
                      ? 'Non hai task assegnati in questo momento'
                      : 'Nessun task corrisponde ai filtri selezionati'}
                  </p>
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => { setEditingTask(null); setModalOpen(true) }}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                    >
                      Crea il primo task
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {activeTasks.length > 0 && (
                    <div className="space-y-3">
                      {filter !== 'COMPLETATO' && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Da fare / In corso ({activeTasks.length})
                        </p>
                      )}
                      {activeTasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          currentUserId={userId}
                          isManager={isManager}
                          onStatusChange={handleStatusChange}
                          onEdit={(task) => { setEditingTask(task); setModalOpen(true) }}
                          onDelete={(id) => setDeleteConfirm(id)}
                          showAssignee={showAssignee}
                        />
                      ))}
                    </div>
                  )}

                  {completedTasks.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Completati ({completedTasks.length})
                      </p>
                      {completedTasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          currentUserId={userId}
                          isManager={isManager}
                          onStatusChange={handleStatusChange}
                          onEdit={(task) => { setEditingTask(task); setModalOpen(true) }}
                          onDelete={(id) => setDeleteConfirm(id)}
                          showAssignee={showAssignee}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal create/edit */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          teamMembers={teamMembers}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTask(null) }}
          loading={savingModal}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Elimina task</h3>
            <p className="text-sm text-gray-600 mb-5">
              Sei sicuro di voler eliminare questo task? L'operazione è irreversibile.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
