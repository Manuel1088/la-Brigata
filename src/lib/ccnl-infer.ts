/** Inferisce il livello CCNL dal ruolo utente (allineato al login NextAuth). */
export function inferCcnlFromRole(role: string): string {
  const r = (role || '').toString().trim().toUpperCase().replace(/\s+/g, '_')

  if (
    ['ADMIN', 'PROPRIETARIO', 'DIRETTORE_GENERALE', 'FB_MANAGER', 'EXECUTIVE_CHEF'].includes(
      r
    )
  ) {
    return 'QA'
  }
  if (['DIRETTORE', 'SOUS_CHEF', 'CAPO_PASTICCERE'].includes(r)) {
    return 'QB'
  }
  if (
    [
      'MANAGER',
      'ASSISTANT_MANAGER',
      'VICE_DIRETTORE',
      'HEAD_CHEF',
      'HEAD_BARMAN',
      'HEAD_SOMMELIER',
      'RESPONSABILE_SALA',
      'CHEF_DE_PARTIE',
      'RESTAURANT_MANAGER',
    ].includes(r)
  ) {
    return 'LIVELLO_1'
  }
  if (r === 'SECONDO_PASTICCERE') {
    return 'LIVELLO_2'
  }
  if (
    [
      'MAITRE',
      'SOMMELIER',
      'CAMERIERE',
      'BARMAN',
      'CHEF',
      'CAMERIERE_QUALIFICATO',
      'RECEPTIONIST',
      'EVENT_COORDINATOR',
      'CAPO_PARTITA',
    ].includes(r)
  ) {
    return 'LIVELLO_3'
  }
  if (['CASSIERE', 'BARTENDER'].includes(r)) {
    return 'LIVELLO_4'
  }
  if (
    [
      'COMMIS_DI_SALA',
      'COMMIS_DE_CUISINE',
      'COMMIS_BAR',
      'COMMIS_SOMMELIER',
      'HOSTESS',
      'RUNNER',
    ].includes(r)
  ) {
    return 'LIVELLO_5'
  }
  if (['LAVAPIATTI', 'DIPENDENTE'].includes(r)) {
    return 'LIVELLO_6'
  }
  return 'LIVELLO_6'
}
