'use client'

import { useEffect, useState } from 'react'
import { getCustomers, saveCustomers, Customer } from '@/lib/customers'
import { useRouter } from 'next/navigation'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editForm, setEditForm] = useState<{ allergies: string; recurrences: string; preferences: string; notes: string }>({ allergies: '', recurrences: '', preferences: '', notes: '' })

  useEffect(() => {
    const load = () => setCustomers(getCustomers())
    load()
    const h = () => load()
    window.addEventListener('customers_updated', h)
    return () => window.removeEventListener('customers_updated', h)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button
              onClick={() => router.push('/bookings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Indietro</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">📒 Clienti</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-900 border-b">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Telefono</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Totale prenotazioni</th>
                  <th className="py-2 pr-4">Coperti totali</th>
                  <th className="py-2 pr-4">Ultima visita</th>
                  <th className="py-2 pr-4">Pranzi</th>
                  <th className="py-2 pr-4">Cene</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onDoubleClick={() => setSelected(c)}>
                    <td className="py-2 pr-4 text-gray-900">{c.name}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.phone || '-'}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.email || '-'}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.totalBookings}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.totalGuests}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.lastVisitDate}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.lunchCount}</td>
                    <td className="py-2 pr-4 text-gray-900">{c.dinnerCount}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-gray-500" colSpan={8}>Nessun cliente registrato</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {selected && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">👤 Dettagli Cliente</h3>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button onClick={() => { if (selected) setEditForm({ allergies: selected.allergies || '', recurrences: selected.recurrences || '', preferences: selected.preferences || '', notes: selected.notes || '' }); setIsEditing(true) }} className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Modifica</button>
                  )}
                  {isEditing && (
                    <>
                      <button
                        onClick={() => {
                          if (!selected) return
                          const updated = customers.map(c => c.id === selected.id ? { ...c, ...editForm } : c)
                          setCustomers(updated)
                          try { saveCustomers(updated) } catch {}
                          const sel = updated.find(c => c.id === selected.id) || null
                          setSelected(sel)
                          setIsEditing(false)
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Salva
                      </button>
                      <button onClick={() => { setIsEditing(false); if (selected) setEditForm({ allergies: selected.allergies || '', recurrences: selected.recurrences || '', preferences: selected.preferences || '', notes: selected.notes || '' }) }} className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Annulla</button>
                    </>
                  )}
                  <button onClick={() => { setIsEditing(false); setSelected(null) }} className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Chiudi</button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-900">
                <div><span className="font-medium">Nome:</span> {selected.name}</div>
                <div><span className="font-medium">Telefono:</span> {selected.phone || '-'}</div>
                <div><span className="font-medium">Email:</span> {selected.email || '-'}</div>
                <div className="pt-2 border-t">
                  <div className="font-medium mb-1">Allergie</div>
                  {isEditing ? (
                    <textarea value={editForm.allergies} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded" rows={2} />
                  ) : (
                    <div className="text-gray-800">{selected.allergies || '—'}</div>
                  )}
                </div>
                <div>
                  <div className="font-medium mb-1">Ricorrenze</div>
                  {isEditing ? (
                    <textarea value={editForm.recurrences} onChange={(e) => setEditForm({ ...editForm, recurrences: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded" rows={2} />
                  ) : (
                    <div className="text-gray-800">{selected.recurrences || '—'}</div>
                  )}
                </div>
                <div>
                  <div className="font-medium mb-1">Preferenze</div>
                  {isEditing ? (
                    <textarea value={editForm.preferences} onChange={(e) => setEditForm({ ...editForm, preferences: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded" rows={2} />
                  ) : (
                    <div className="text-gray-800">{selected.preferences || '—'}</div>
                  )}
                </div>
                <div>
                  <div className="font-medium mb-1">Note</div>
                  {isEditing ? (
                    <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded" rows={2} />
                  ) : (
                    <div className="text-gray-800">{selected.notes || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


