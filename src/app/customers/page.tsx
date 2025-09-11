'use client'

import { useEffect, useState } from 'react'
import { getCustomers, Customer } from '@/lib/customers'
import { useRouter } from 'next/navigation'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])

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
                  <tr key={c.id} className="border-b hover:bg-gray-50">
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
      </main>
    </div>
  )
}


