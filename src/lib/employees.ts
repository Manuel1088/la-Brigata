export interface EmployeeFull {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: 'cucina' | 'sala' | 'bar'
  level: number
  hourlyRate: number
  contractType: 'full-time' | 'part-time'
  startDate: string
  isActive: boolean
  avatar: string
  skills: string[]
  personalInfo: {
    fiscalCode?: string
    address?: string
    emergencyContact?: string
  }
  notes?: string
}

export interface SimpleEmployee {
  name: string
  role: string
  department: 'cucina' | 'sala' | 'bar'
}

const DEFAULT_EMPLOYEES_FULL: EmployeeFull[] = [
  {
    id: '1', name: 'Giuseppe Rossi', email: 'giuseppe.rossi@brigata.it', phone: '+39 333 123 4567',
    role: 'EXECUTIVE_CHEF', department: 'cucina', level: 5, hourlyRate: 25.00, contractType: 'full-time', startDate: '2020-03-15', isActive: true,
    avatar: '👨‍🍳', skills: ['Cucina Italiana', 'Menu Design', 'Team Management', 'Cost Control'],
    personalInfo: { fiscalCode: 'RSSGPP80A01H501U', address: 'Via Roma 123, 20100 Milano', emergencyContact: 'Maria Rossi - +39 333 987 6543' },
    notes: 'Chef esperto con 15 anni di esperienza. Specializzato in cucina tradizionale italiana.'
  },
  {
    id: '2', name: 'Anna Bianchi', email: 'anna.bianchi@brigata.it', phone: '+39 333 234 5678',
    role: 'SOUS_CHEF', department: 'cucina', level: 4, hourlyRate: 20.00, contractType: 'full-time', startDate: '2021-06-01', isActive: true,
    avatar: '👩‍🍳', skills: ['Pastry', 'Sauces', 'Kitchen Organization', 'Training'],
    personalInfo: { fiscalCode: 'BNCNNA85B02H501V', address: 'Corso Italia 456, 20100 Milano', emergencyContact: 'Marco Bianchi - +39 333 876 5432' },
    notes: 'Sous chef talentuosa, esperta in pasticceria e formazione del personale.'
  },
  {
    id: '3', name: 'Marco Verdi', email: 'marco.verdi@brigata.it', phone: '+39 333 345 6789',
    role: 'CHEF_DE_PARTIE', department: 'cucina', level: 3, hourlyRate: 16.00, contractType: 'full-time', startDate: '2022-01-10', isActive: true,
    avatar: '👨‍🍳', skills: ['Grill', 'Pasta', 'Quality Control', 'Inventory'],
    personalInfo: { fiscalCode: 'VRDMRC90C03H501W', address: 'Piazza Duomo 789, 20100 Milano', emergencyContact: 'Sofia Verdi - +39 333 765 4321' },
    notes: 'Chef de partie affidabile, specializzato in griglia e pasta fresca.'
  },
  {
    id: '4', name: 'Sofia Neri', email: 'sofia.neri@brigata.it', phone: '+39 333 456 7890',
    role: 'DIPENDENTE_SALA', department: 'sala', level: 2, hourlyRate: 12.00, contractType: 'part-time', startDate: '2022-09-15', isActive: true,
    avatar: '👩‍💼', skills: ['Customer Service', 'Wine Knowledge', 'Table Service', 'Upselling'],
    personalInfo: { fiscalCode: 'NRISFI95D04H501X', address: 'Via Brera 321, 20100 Milano', emergencyContact: 'Luca Neri - +39 333 654 3210' },
    notes: 'Cameriera professionale con ottime competenze nel servizio e conoscenza dei vini.'
  },
  {
    id: '5', name: 'Luca Blu', email: 'luca.blu@brigata.it', phone: '+39 333 567 8901',
    role: 'DIPENDENTE_BAR', department: 'bar', level: 2, hourlyRate: 13.00, contractType: 'full-time', startDate: '2023-02-20', isActive: true,
    avatar: '👨‍💼', skills: ['Cocktails', 'Coffee Art', 'Bar Management', 'Inventory'],
    personalInfo: { fiscalCode: 'BLULCA88E05H501Y', address: 'Via Navigli 654, 20100 Milano', emergencyContact: 'Giulia Blu - +39 333 543 2109' },
    notes: 'Barista esperto, specializzato in cocktail classici e caffè artigianale.'
  }
]

const STORAGE_KEY_FULL = 'employees_list_full'

export function getEmployeesFullClient(): EmployeeFull[] {
  if (typeof window === 'undefined') return DEFAULT_EMPLOYEES_FULL
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FULL)
    if (!raw) return DEFAULT_EMPLOYEES_FULL
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULT_EMPLOYEES_FULL
    return arr
  } catch {
    return DEFAULT_EMPLOYEES_FULL
  }
}

export function setEmployeesFullClient(list: EmployeeFull[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_FULL, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('employees_updated'))
}

export function addEmployeeFullClient(emp: EmployeeFull) {
  const list = getEmployeesFullClient()
  setEmployeesFullClient([...list, emp])
}

export function getEmployeesClient(): SimpleEmployee[] {
  const full = getEmployeesFullClient()
  return full.map(e => ({ name: e.name, role: e.role, department: e.department }))
}

export function setEmployeesClient(list: SimpleEmployee[]) {
  // map to full with defaults
  const full: EmployeeFull[] = list.map((s, idx) => ({
    id: (idx + 1).toString(),
    name: s.name,
    email: `${s.name.toLowerCase().replace(/\s+/g,'\.')}@brigata.it`,
    phone: '+39 333 000 0000',
    role: s.role,
    department: s.department,
    level: 2,
    hourlyRate: 12,
    contractType: 'full-time',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    avatar: '👤',
    skills: [],
    personalInfo: {}
  }))
  setEmployeesFullClient(full)
}

export function addEmployeeClient(emp: SimpleEmployee) {
  const fullList = getEmployeesFullClient()
  const newFull: EmployeeFull = {
    id: (fullList.length + 1).toString(),
    name: emp.name,
    email: `${emp.name.toLowerCase().replace(/\s+/g,'\.')}@brigata.it`,
    phone: '+39 333 000 0000',
    role: emp.role,
    department: emp.department,
    level: 2,
    hourlyRate: 12,
    contractType: 'full-time',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    avatar: '👤',
    skills: [],
    personalInfo: {}
  }
  addEmployeeFullClient(newFull)
}

export async function getEmployeesByCompany(companyId: string, opts?: { active?: boolean }) {
  const q = new URLSearchParams({ companyId })
  if (opts?.active) q.set('active', 'true')
  const res = await fetch(`/api/employees?${q.toString()}`)
  if (!res.ok) throw new Error('Failed to load employees')
  const data = await res.json()
  return data.employees as EmployeeFull[]
}


