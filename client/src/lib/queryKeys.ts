export const QUERY_KEYS = {
  contracts: (contextId: string | null) => ['/api/contracts', contextId] as const,
  contract: (id: string) => [`/api/contracts/${id}`], 
  virtualOffices: () => ['/api/virtual-offices'],
  virtualOffice: (id: string) => [`/api/virtual-offices/${id}`],
  // Kľúč pre zoznam uložených doložiek
  attestations: () => ['/api/attestations'] as const,
  // Kľúč pre Knižnicu dokumentov (Moje dokumenty)
  documents: (contextId: string | null) => ['/api/documents', contextId] as const,
} as const;

export const OWNER_EMAIL = 'jan.novak@example.com';
