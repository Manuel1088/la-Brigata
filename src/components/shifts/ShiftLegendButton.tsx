'use client'

import { HelpCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const LEGEND_ITEMS = [
  {
    swatch: 'bg-blue-100 border-blue-300',
    label: 'Turno lavorativo',
  },
  {
    swatch: 'bg-gray-100 border-gray-300',
    label: 'Riposo',
  },
  {
    swatch: 'bg-red-100 border-red-300',
    label: 'Ferie',
  },
  {
    swatch: 'bg-gray-50 border-gray-200',
    label: 'Cella vuota',
  },
] as const

export default function ShiftLegendButton() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition"
        aria-label="Legenda colori turni"
        aria-expanded={open}
      >
        <HelpCircle className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Legenda turni"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Legenda
          </p>
          <ul className="space-y-2">
            {LEGEND_ITEMS.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
                <span
                  className={`h-5 w-8 shrink-0 rounded border ${item.swatch}`}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
