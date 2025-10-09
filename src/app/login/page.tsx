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

      {/* Account Admin */}
      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🛡️</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-900 mb-2">Account Super Admin</p>
            <div className="bg-white rounded p-2 mb-2">
              <div className="text-xs text-gray-600">Email:</div>
              <div className="font-mono text-sm text-blue-600">admin@brigata.it</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Password:</div>
              <div className="font-mono text-sm text-blue-600">admin123</div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Livello 11 - Accesso completo al sistema
            </p>
          </div>
        </div>
      </div>

      {/* Info dipendenti database */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 <strong>Altri utenti:</strong> I dipendenti accedono con le loro credenziali registrate nel database.
        </p>
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
