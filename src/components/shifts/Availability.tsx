'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useEmployees } from '@/hooks/useEmployees'
import { useNotifications } from '@/hooks/useNotifications'

interface AvailabilityRule {
  id: string
  employeeName: string
  dayOfWeek: number // 0 = Domenica, 1 = Lunedì, etc.
  startTime: string
  endTime: string
  isAvailable: boolean
  notes?: string
}

export default function ShiftsAvailability() {
  const { data: session } = useSession()
  const { notifyCustom } = useNotifications()
  const { data: employeesData } = useEmployees((session?.user as any)?.companyId, true)
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<number>(1) // Lunedì
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endTime, setEndTime] = useState<string>('17:00')
  const [isAvailable, setIsAvailable] = useState<boolean>(true)
  const [notes, setNotes] = useState<string>('')

  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

  // Carica regole di disponibilità
  useEffect(() => {
    loadAvailabilityRules()
  }, [])

  const loadAvailabilityRules = () => {
    try {
      const raw = localStorage.getItem('availability_rules_v1')
      if (raw) {
        setAvailabilityRules(JSON.parse(raw))
      }
    } catch (error) {
      console.error('Errore nel caricamento regole disponibilità:', error)
    }
  }

  const saveAvailabilityRules = (rules: AvailabilityRule[]) => {
    try {
      localStorage.setItem('availability_rules_v1', JSON.stringify(rules))
      setAvailabilityRules(rules)
    } catch (error) {
      console.error('Errore nel salvataggio regole disponibilità:', error)
    }
  }

  // Aggiungi nuova regola
  const handleAddRule = () => {
    if (!selectedEmployee) {
      notifyCustom('Seleziona un dipendente', 'error')
      return
    }

    const newRule: AvailabilityRule = {
      id: crypto.randomUUID(),
      employeeName: selectedEmployee,
      dayOfWeek: selectedDay,
      startTime,
      endTime,
      isAvailable,
      notes: notes.trim() || undefined
    }

    const updatedRules = [...availabilityRules, newRule]
    saveAvailabilityRules(updatedRules)
    notifyCustom('Regola di disponibilità aggiunta!', 'success')
    
    // Reset form
    setSelectedEmployee('')
    setStartTime('09:00')
    setEndTime('17:00')
    setIsAvailable(true)
    setNotes('')
  }

  // Rimuovi regola
  const handleRemoveRule = (ruleId: string) => {
    const updatedRules = availabilityRules.filter(rule => rule.id !== ruleId)
    saveAvailabilityRules(updatedRules)
    notifyCustom('Regola rimossa', 'info')
  }

  // Filtra regole per dipendente
  const getRulesForEmployee = (employeeName: string) => {
    return availabilityRules.filter(rule => rule.employeeName === employeeName)
  }

  // Genera orari
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900">✅ Disponibilità Dipendenti</h2>
        <p className="text-gray-600 mt-1">Gestisci gli orari di disponibilità per ogni dipendente</p>
      </div>

      {/* Form aggiunta regola */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">➕ Aggiungi Regola di Disponibilità</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dipendente</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona dipendente</option>
              {employeesData?.map((emp: any) => (
                <option key={emp.name} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giorno della settimana</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dayNames.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={isAvailable ? 'available' : 'unavailable'}
              onChange={(e) => setIsAvailable(e.target.value === 'available')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="available">Disponibile</option>
              <option value="unavailable">Non Disponibile</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ora inizio</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ora fine</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note (opzionale)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Solo weekend"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleAddRule}
            disabled={!selectedEmployee}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            ➕ Aggiungi Regola
          </button>
        </div>
      </div>

      {/* Lista regole per dipendente */}
      <div className="space-y-4">
        {employeesData?.map((emp: any) => {
          const employeeRules = getRulesForEmployee(emp.name)
          if (employeeRules.length === 0) return null

          return (
            <div key={emp.name} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{emp.name}</h3>
                <p className="text-sm text-gray-600">{employeeRules.length} regole di disponibilità</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {employeeRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${rule.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="font-medium">
                            {dayNames[rule.dayOfWeek]} - {rule.startTime} / {rule.endTime}
                          </div>
                          {rule.notes && (
                            <div className="text-sm text-gray-600">{rule.notes}</div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                      >
                        ❌ Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Riepilogo disponibilità */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Riepilogo Disponibilità</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {availabilityRules.filter(r => r.isAvailable).length}
            </div>
            <div className="text-sm text-green-700">Regole Disponibili</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {availabilityRules.filter(r => !r.isAvailable).length}
            </div>
            <div className="text-sm text-red-700">Regole Non Disponibili</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {new Set(availabilityRules.map(r => r.employeeName)).size}
            </div>
            <div className="text-sm text-blue-700">Dipendenti con Regole</div>
          </div>
        </div>
      </div>
    </div>
  )
}
