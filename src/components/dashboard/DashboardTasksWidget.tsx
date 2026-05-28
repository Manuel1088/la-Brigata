'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type TaskPriority = 'ALTA' | 'MEDIA' | 'BASSA'
type TaskStatus = 'DA_FARE' | 'IN_CORSO' | 'COMPLETATO'

type Task = {
  id: string
  title: string
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  assignedToRole: string | null
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  ALTA: 'bg-red-500',
  MEDIA: 'bg-amber-400',
  BASSA: 'bg-gray-300',
}

function isDueToday(iso: string | null): boolean {
  if (!iso) return false
  const due = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return due >= today && due < tomorrow
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  const due = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function formatShort(iso: string | null): string {
  if (!iso) return ''
  const due = new Date(iso)
  if (isDueToday(iso)) return 'Oggi'
  if (isOverdue(iso)) return `Sc. ${due.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
  return due.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function DashboardTasksWidget() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks?scope=mine&status=DA_FARE', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d: { tasks: Task[] }) => {
        // Sort: overdue first, then today, then by priority (ALTA first), take top 3
        const sorted = (d.tasks ?? [])
          .filter((t) => t.status !== 'COMPLETATO')
          .sort((a, b) => {
            const aOver = isOverdue(a.dueDate) ? 0 : isDueToday(a.dueDate) ? 1 : 2
            const bOver = isOverdue(b.dueDate) ? 0 : isDueToday(b.dueDate) ? 1 : 2
            if (aOver !== bOver) return aOver - bOver
            const pOrder: Record<TaskPriority, number> = { ALTA: 0, MEDIA: 1, BASSA: 2 }
            return pOrder[a.priority] - pOrder[b.priority]
          })
          .slice(0, 3)
        setTasks(sorted)
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || tasks.length === 0) return null

  const handleComplete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETATO' }),
      })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <h3 className="text-sm font-semibold text-gray-800">I tuoi task urgenti</h3>
            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            className="text-xs text-orange-500 font-semibold hover:underline"
          >
            Vedi tutti →
          </button>
        </div>

        <div className="divide-y">
          {tasks.map((task) => {
            const dueLbl = formatShort(task.dueDate)
            const overdue = isOverdue(task.dueDate)
            const today = isDueToday(task.dueDate)

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => router.push('/tasks')}
              >
                <button
                  type="button"
                  onClick={(e) => void handleComplete(task.id, e)}
                  title="Segna completato"
                  className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition"
                />
                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                <p className="flex-1 text-sm text-gray-800 truncate">{task.title}</p>
                {dueLbl && (
                  <span className={`text-xs flex-shrink-0 font-medium ${
                    overdue ? 'text-red-500' : today ? 'text-amber-500' : 'text-gray-400'
                  }`}>
                    {dueLbl}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
