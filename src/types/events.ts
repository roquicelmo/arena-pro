export type EventStatus = 'ABERTA' | 'SORTEADA' | 'EM ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';

export interface EventSummary {
  id: string;
  name: string;
  date: string;
  isoDate: string; // AAAA-MM-DD (UTC)
  format: string;
  arena: string;
  status: EventStatus;
  registeredAthletes?: number;
  fixedPairs?: number;
  runs: number;
  steward?: string;
  ownerId?: string;
  ownerName?: string;
}
