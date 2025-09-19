'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.ok) {
      router.push('/dashboard')
    } else {
      alert('Credenziali non valide')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍝 LA BRIGATA
          </h1>
          <p className="text-gray-600">Accedi al tuo account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="tua-email@esempio.it"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-3 font-medium">🔑 Account collegati ai dipendenti (demo):</p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-600">👑 Admin/Proprietario →</span><span className="text-gray-800">Giuseppe Rossi (Proprietario A, id 1) — admin@brigata.it / admin123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">👑 Proprietario →</span><span className="text-gray-800">Giuseppe Rossi (Proprietario B, id 1) — proprietario@brigata.it / prop123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">👔 Direttore →</span><span className="text-gray-800">Anna Bianchi (Direttore, id 2) — direttore@brigata.it / dir123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">📊 Manager →</span><span className="text-gray-800">Anna Bianchi (Manager, id 2) — manager@brigata.it / mgr123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">👨‍🍳 Head Chef →</span><span className="text-gray-800">Giuseppe Rossi (Head Chef, id 1) — headchef@brigata.it / chef123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">🍽️ Responsabile Sala →</span><span className="text-gray-800">Sofia Neri (id 4) — responsabile@brigata.it / resp123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">💰 Cassiere →</span><span className="text-gray-800">Luca Blu (id 5) — cassiere@brigata.it / cassa123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">🍸 Head Barman →</span><span className="text-gray-800">Paolo Barman (id 6) — headbarman@brigata.it / hb123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">🍷 Head Sommelier →</span><span className="text-gray-800">Chiara Sommelier (id 7) — sommelier@brigata.it / som123</span></div>
            <div className="flex justify-between"><span className="text-gray-600">👤 Dipendente →</span><span className="text-gray-800">Marco Verdi (id 3) — dipendente@brigata.it / dip123</span></div>
          </div>
        </div>

        {/* Freccia indietro */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            aria-label="Torna indietro"
            title="Torna indietro"
          >
            <span className="text-lg mr-2">←</span>
            Indietro
          </button>
        </div>
      </div>
    </div>
  )
}
