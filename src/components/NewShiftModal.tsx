import { useState } from 'react'

type Department = 'direzione' | 'cucina' | 'sala' | 'beverage' | 'accoglienza'
interface NewShift {
	id: string
	date: string
	startTime: string
	endTime: string
	department: Department
	employee: string
	role: string
	status: 'scheduled' | 'pending' | 'completed' | 'cancelled'
}

interface NewShiftModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (shift: NewShift) => void
	selectedDate: string
}

export default function NewShiftModal({ isOpen, onClose, onSave, selectedDate }: NewShiftModalProps) {
	const [formData, setFormData] = useState({
		employee: '',
		role: '',
		department: '' as Department | '',
		startTime: '',
		endTime: ''
	})

	const employees: Array<{ name: string; role: string; department: Department }> = [
		{ name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
		{ name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
		{ name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'beverage' },
		{ name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
		{ name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
		{ name: 'Sofia Cassiera', role: 'CASSIERE', department: 'accoglienza' }
	]

	const handleEmployeeChange = (employeeName: string) => {
		const employee = employees.find(e => e.name === employeeName)
		if (employee) {
			setFormData({
				...formData,
				employee: employeeName,
				role: employee.role,
				department: employee.department
			})
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
    
		const newShift: NewShift = {
			id: Date.now().toString(),
			date: selectedDate,
			startTime: formData.startTime,
			endTime: formData.endTime,
			department: (formData.department || 'sala') as Department,
			employee: formData.employee,
			role: formData.role,
			status: 'scheduled'
		}
    
		onSave(newShift)
    
		// Reset form
		setFormData({
			employee: '',
			role: '',
			department: '',
			startTime: '',
			endTime: ''
		})
    
		onClose()
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold">📅 Nuovo Turno</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Data Turno
						</label>
						<input
							type="date"
							value={selectedDate}
							disabled
							className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Dipendente
						</label>
						<select
							value={formData.employee}
							onChange={(e) => handleEmployeeChange(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
							required
						>
							<option value="">Seleziona dipendente...</option>
							{employees.map((employee) => (
								<option key={employee.name} value={employee.name}>
									{employee.name} ({employee.role.replace('DIPENDENTE_', '').replace('_', ' ')})
								</option>
							))}
						</select>
					</div>

					{formData.employee && (
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Ruolo
								</label>
								<input
									type="text"
									value={formData.role.replace('DIPENDENTE_', '').replace('_', ' ')}
									disabled
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
								/>
							</div>
              
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Reparto
								</label>
								<input
									type="text"
									value={formData.department}
									disabled
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
								/>
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Ora Inizio
							</label>
							<input
								type="time"
								value={formData.startTime}
								onChange={(e) => setFormData({...formData, startTime: e.target.value})}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								required
							/>
						</div>
            
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Ora Fine
							</label>
							<input
								type="time"
								value={formData.endTime}
								onChange={(e) => setFormData({...formData, endTime: e.target.value})}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								required
							/>
						</div>
					</div>

					<div className="flex space-x-4 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
						>
							Annulla
						</button>
						<button
							type="submit"
							className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
						>
							Salva Turno
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
