export type FixedDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Lunedì ... 6=Domenica

export interface RestRule {
  employeeName: string
  weeklyRestDays: 1 | 2
  fixedDayIndices?: FixedDayIndex[] // opzionale: fino a 2 giorni fissi di riposo (0=Lunedì)
  // Per riposo a scalare: giorno iniziale della rotazione (0=Lunedì)
  rotatingStartDayIndex?: FixedDayIndex
}

// Mock storage in-memory. In produzione: DB.
const defaultRules: RestRule[] = [
  { employeeName: 'Giuseppe Rossi', weeklyRestDays: 1 }, // cucina
  { employeeName: 'Anna Bianchi', weeklyRestDays: 1 },   // cucina
  { employeeName: 'Marco Verdi', weeklyRestDays: 1 },    // cucina
  { employeeName: 'Sofia Neri', weeklyRestDays: 1 },     // sala
  { employeeName: 'Luca Blu', weeklyRestDays: 1 }        // bar
]

const STORAGE_KEY = 'rest_rules'

function normalizeAndMigrateRules(list: RestRule[]): RestRule[] {
  // Mappa nomi legacy ai nomi attuali presenti in lib/employees
  const LEGACY_NAME_MAP: Record<string, string> = {
    'Giuseppe Chef': 'Giuseppe Rossi',
    'Maria Cameriera': 'Sofia Neri',
    'Luca Barista': 'Luca Blu',
    'Anna Sous Chef': 'Anna Bianchi',
    'Marco Cameriere': 'Marco Verdi'
  }
  const seen = new Set<string>()
  const migrated: RestRule[] = []
  for (const r of list) {
    const newName = LEGACY_NAME_MAP[r.employeeName] || r.employeeName
    if (seen.has(newName)) continue
    seen.add(newName)
    migrated.push({
      employeeName: newName,
      weeklyRestDays: ((r.weeklyRestDays as 1 | 2) || 1),
      fixedDayIndices: r.fixedDayIndices as FixedDayIndex[] | undefined,
      rotatingStartDayIndex: r.rotatingStartDayIndex as FixedDayIndex | undefined
    })
  }
  return migrated
}

function loadRules(): RestRule[] {
  if (typeof window === 'undefined') return [...defaultRules]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...defaultRules]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...defaultRules]
    const normalized = normalizeAndMigrateRules(parsed)
    // Se è cambiato rispetto ai dati salvati, aggiorna lo storage
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    }
    return normalized
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


