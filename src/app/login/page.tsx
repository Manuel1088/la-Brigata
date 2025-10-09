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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12">
      <div className="container mx-auto px-4">
        {/* Titolo e sottotitolo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🍽️ LA BRIGATA
          </h1>
          <p className="text-2xl text-gray-600">
            Gestione digitale per la ristorazione italiana
          </p>
        </div>

        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          {/* Freccia indietro e titolo */}
          <div className="relative mb-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="absolute left-0 text-gray-600 hover:text-gray-900 text-2xl"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold text-center">Accedi</h2>
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
        </div>
        
        {/* Descrizioni funzionalità */}
        <div className="grid md:grid-cols-4 gap-6 mt-16 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="font-semibold">Gestione Turni</h3>
            <p className="text-sm text-gray-600">AI ottimizzata</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-semibold">Mance Digitali</h3>
            <p className="text-sm text-gray-600">Distribuzione automatica</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">🏖️</div>
            <h3 className="font-semibold">Ferie & Permessi</h3>
            <p className="text-sm text-gray-600">Workflow digitale</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold">Reports</h3>
            <p className="text-sm text-gray-600">Analytics avanzate</p>
          </div>
        </div>
      </div>
    </div>
  )
}
