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
          <p className="text-sm text-gray-600 mb-3 font-medium">🔑 Account Demo:</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">👑 Proprietario:</span>
              <span className="text-gray-500">admin@brigata.it / admin123</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">👔 Direttore:</span>
              <span className="text-gray-500">direttore@brigata.it / dir123</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">📊 Manager:</span>
              <span className="text-gray-500">manager@brigata.it / mgr123</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">💰 Cassiere:</span>
              <span className="text-gray-500">cassiere@brigata.it / cassa123</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">👤 Dipendente:</span>
              <span className="text-gray-500">dipendente@brigata.it / dip123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
