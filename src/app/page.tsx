"use client"
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🍝 LA BRIGATA
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Gestione digitale per la ristorazione italiana
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Login Proprietario/Manager */}
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">👨‍💼 Gestione</h2>
              <p className="text-gray-600 mb-6">
                Accesso per proprietari, manager e responsabili
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
              >
                Accedi Gestione
              </button>
            </div>
            
            {/* Login Dipendenti */}
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">👨‍🍳 Dipendenti</h2>
              <p className="text-gray-600 mb-6">
                Visualizza turni, mance e richiedi permessi
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Accedi Dipendenti
              </button>
            </div>
          </div>
        </div>
        
        {/* Features Preview */}
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