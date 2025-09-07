export interface SimpleEmployee {
  name: string
  role: string
  department: 'cucina' | 'sala' | 'bar'
}

const DEFAULT_EMPLOYEES: SimpleEmployee[] = [
  { name: 'Giuseppe Chef', role: 'CHEF', department: 'cucina' },
  { name: 'Maria Cameriera', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Luca Barista', role: 'DIPENDENTE_BAR', department: 'bar' },
  { name: 'Anna Sous Chef', role: 'CAPO_PARTITA', department: 'cucina' },
  { name: 'Marco Cameriere', role: 'DIPENDENTE_SALA', department: 'sala' },
  { name: 'Sofia Cassiera', role: 'CASSIERE', department: 'sala' }
]

const STORAGE_KEY = 'employees_list'

export function getEmployeesClient(): SimpleEmployee[] {
  if (typeof window === 'undefined') return DEFAULT_EMPLOYEES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_EMPLOYEES
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULT_EMPLOYEES
    return arr
  } catch {
    return DEFAULT_EMPLOYEES
  }
}

export function setEmployeesClient(list: SimpleEmployee[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('employees_updated'))
}

export function addEmployeeClient(emp: SimpleEmployee) {
  const list = getEmployeesClient()
  setEmployeesClient([...list, emp])
}


