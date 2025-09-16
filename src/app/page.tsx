"use client"
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🍽️ LA BRIGATA
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Gestione digitale per la ristorazione italiana
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">🔐 Accesso Sistema</h2>
              <p className="text-gray-600 mb-6">
                Entra nel sistema di gestione del ristorante
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 rounded-lg hover:from-orange-700 hover:to-red-700 transition text-lg font-medium"
              >
                Accedi
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Per tutto il personale: manager, chef, camerieri, barista
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-6 mt-16">
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