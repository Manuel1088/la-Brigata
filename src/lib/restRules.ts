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

let rules: RestRule[] = [...defaultRules]

export function getRestRules(): RestRule[] {
  return [...rules]
}

export function getRestRuleFor(name: string): RestRule | undefined {
  return rules.find(r => r.employeeName === name)
}

export function updateRestRule(name: string, updates: Partial<Omit<RestRule, 'employeeName'>>): RestRule {
  const idx = rules.findIndex(r => r.employeeName === name)
  if (idx === -1) {
    const created: RestRule = { employeeName: name, weeklyRestDays: (updates.weeklyRestDays as 1 | 2) || 1, fixedDayIndices: updates.fixedDayIndices }
    rules.push(created)
    return created
  }
  rules[idx] = { ...rules[idx], ...updates }
  return rules[idx]
}

export function resetRestRules(): void {
  rules = [...defaultRules]
}


