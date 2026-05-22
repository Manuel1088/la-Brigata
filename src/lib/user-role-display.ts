/** Etichette leggibili per UserRole (campo role su users). */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Amministratore',
  PROPRIETARIO: 'Proprietario',
  PROPRIETARIO_OPERATIVO: 'Proprietario operativo',
  DIRETTORE: 'Direttore',
  DIRETTORE_GENERALE: 'Direttore generale',
  VICE_DIRETTORE: 'Vice Direttore',
  MANAGER: 'Manager',
  RESTAURANT_MANAGER: 'Restaurant Manager',
  ASSISTANT_MANAGER: 'Assistant Manager',
  RESPONSABILE_SALA: 'Responsabile sala',
  MAITRE: 'Maitre',
  CASSIERE: 'Cassiere',
  EXECUTIVE_CHEF: 'Executive Chef',
  HEAD_CHEF: 'Head Chef',
  SOUS_CHEF: 'Sous Chef',
  CHEF_DE_PARTIE: 'Chef de Partie',
  CHEF: 'Cuoco',
  CAPO_PARTITA: 'Capo partita',
  CAPO_PASTICCERE: 'Capo Pasticcere',
  EVENT_COORDINATOR: 'Event Coordinator',
  HEAD_SOMMELIER: 'Head Sommelier',
  SOMMELIER: 'Sommelier',
  HEAD_BARMAN: 'Head Barman',
  BARMAN: 'Barman',
  CAMERIERE_QUALIFICATO: 'Chef de Rang',
  CAMERIERE: 'Cameriere',
  COMMIS_DI_SALA: 'Commis di sala',
  RUNNER: 'Runner',
  COMMIS_DE_CUISINE: 'Commis di cucina',
  LAVAPIATTI: 'Lavapiatti',
  DIPENDENTE: 'Dipendente',
}

function titleCaseRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Titolo in UI: position dal DB se presente, altrimenti etichetta del role. */
export function userDisplayTitle(
  position?: string | null,
  role?: string | null
): string {
  const pos = position?.trim()
  if (pos) return pos

  const key = (role || '').toUpperCase().trim()
  if (!key) return 'Dipendente'
  return ROLE_LABELS[key] ?? titleCaseRole(key)
}
