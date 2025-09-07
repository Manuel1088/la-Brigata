export type FixedDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Lunedì ... 6=Domenica

export interface RestRule {
  employeeName: string
  weeklyRestDays: 1 | 2
  fixedDayIndices?: FixedDayIndex[] // opzionale: fino a 2 giorni fissi di riposo (0=Lunedì)
}

// Mock storage in-memory. In produzione: DB.
const defaultRules: RestRule[] = [
  { employeeName: 'Giuseppe Chef', weeklyRestDays: 1 },
  { employeeName: 'Maria Cameriera', weeklyRestDays: 1 },
  { employeeName: 'Luca Barista', weeklyRestDays: 1 },
  { employeeName: 'Anna Sous Chef', weeklyRestDays: 1 },
  { employeeName: 'Marco Cameriere', weeklyRestDays: 1 }
]

const STORAGE_KEY = 'rest_rules'

function loadRules(): RestRule[] {
  if (typeof window === 'undefined') return [...defaultRules]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...defaultRules]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...defaultRules]
    return parsed
  } catch {
    return [...defaultRules]
  }
}

function saveRules(rules: RestRule[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  window.dispatchEvent(new CustomEvent('rest_rules_updated'))
}

let rules: RestRule[] = loadRules()

export function getRestRules(): RestRule[] {
  // ricarica sempre dallo storage per avere l'ultimo stato
  rules = loadRules()
  return [...rules]
}

export function getRestRuleFor(name: string): RestRule | undefined {
  const current = getRestRules()
  return current.find(r => r.employeeName === name)
}

export function updateRestRule(name: string, updates: Partial<Omit<RestRule, 'employeeName'>>): RestRule {
  const idx = rules.findIndex(r => r.employeeName === name)
  if (idx === -1) {
    const created: RestRule = { employeeName: name, weeklyRestDays: (updates.weeklyRestDays as 1 | 2) || 1, fixedDayIndices: updates.fixedDayIndices }
    rules.push(created)
    saveRules(rules)
    return created
  }
  rules[idx] = { ...rules[idx], ...updates }
  saveRules(rules)
  return rules[idx]
}

export function resetRestRules(): void {
  rules = [...defaultRules]
  saveRules(rules)
}


