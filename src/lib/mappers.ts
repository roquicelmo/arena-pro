import type { Competitor, Run } from '../types/roping';
import type { EventSummary } from '../types/events';

export interface PersistedAthlete {
  id: string;
  registrationNo: string | null;
  name: string;
  city: string | null;
  headHandicap: number | string;
  heelHandicap: number | string;
  ownerId?: string | null;
  owner?: { name: string | null };
}

export interface PersistedRun {
  id: string;
  runNumber: number;
  phase: number;
  round: number;
  battery: number;
  headGroup: string | null;
  heelGroup: string | null;
  combinedHandicap: number | string;
  numberOfBulls: number;
  totalTime: number | string | null;
  averageTime: number | string | null;
  isNt: boolean;
  headAthlete: PersistedAthlete;
  heelAthlete: PersistedAthlete;
  times: Array<{ bullNumber: number; timeSeconds: number | string | null; isNt: boolean }>;
}

export type DbEventStatus = 'DRAFT' | 'OPEN' | 'DRAWN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export interface PersistedEvent {
  id: string;
  name: string;
  eventDate: Date | string;
  status: DbEventStatus;
  arena: { name: string };
  createdBy: { id: string; name: string | null; email: string };
  _count: { registrations: number; draws: number };
}

export const toCompetitor = (athlete: PersistedAthlete, role: 'head' | 'heel' = 'head'): Competitor => {
  const headHandicap = Number(athlete.headHandicap);
  const heelHandicap = Number(athlete.heelHandicap);
  return {
    id: athlete.id,
    registrationNo: athlete.registrationNo ?? undefined,
    nome: athlete.name,
    cidade: athlete.city ?? undefined,
    handicap: role === 'head' ? headHandicap : heelHandicap,
    headHandicap,
    heelHandicap,
    ownerId: athlete.ownerId ?? undefined,
    ownerName: athlete.owner?.name ?? undefined,
  };
};

export const mapPersistedRuns = (runs: PersistedRun[]): Run[] => runs.map((run) => {
  const headGroup = run.headGroup ?? '?';
  const heelGroup = run.heelGroup ?? '?';
  const persistedTimes = new Map(run.times.map((time) => [time.bullNumber, time]));
  const boiTime = (bullNumber: number) => persistedTimes.get(bullNumber);
  const first = boiTime(1);
  const second = boiTime(2);
  const third = boiTime(3);
  return {
    id: run.id,
    numero: run.runNumber,
    fase: run.phase,
    faseLabel: `Fase ${run.phase}: Cabeceiros ${headGroup} × Pezeiros ${heelGroup}`,
    bateria: run.battery,
    bateriaLabel: `Bateria ${run.battery}`,
    cruzamento: `${headGroup} × ${heelGroup}`,
    rodada: run.round,
    cabeceiro: toCompetitor(run.headAthlete, 'head'),
    pezeiro: toCompetitor(run.heelAthlete, 'heel'),
    cabeceiroGrupo: headGroup,
    pezeiroGrupo: heelGroup,
    shc: Number(run.combinedHandicap),
    bois: Math.min(3, Math.max(1, run.numberOfBulls)) as 1 | 2 | 3,
    times: {
      boi1: first?.timeSeconds === null || first?.timeSeconds === undefined ? '' : String(first.timeSeconds),
      boi2: second?.timeSeconds === null || second?.timeSeconds === undefined ? '' : String(second.timeSeconds),
      boi3: third?.timeSeconds === null || third?.timeSeconds === undefined ? '' : String(third.timeSeconds),
      boi1Nt: first?.isNt ?? false,
      boi2Nt: second?.isNt ?? false,
      boi3Nt: third?.isNt ?? false,
    },
    totalTime: run.totalTime === null ? null : Number(run.totalTime),
    mediaFinal: run.averageTime === null ? null : Number(run.averageTime),
    isNt: run.isNt,
  };
});

const statusLabels: Record<DbEventStatus, EventSummary['status']> = {
  DRAFT: 'ABERTA',
  OPEN: 'ABERTA',
  DRAWN: 'SORTEADA',
  IN_PROGRESS: 'EM ANDAMENTO',
  FINISHED: 'FINALIZADA',
  CANCELLED: 'CANCELADA',
};

export const eventStatusLabel = (status: DbEventStatus): EventSummary['status'] => statusLabels[status];

export const toEventSummary = (event: PersistedEvent): EventSummary => ({
  id: event.id,
  name: event.name,
  date: new Intl.DateTimeFormat('pt-BR').format(new Date(event.eventDate)),
  format: 'Todos x Todos',
  arena: event.arena.name,
  status: eventStatusLabel(event.status),
  registeredAthletes: event._count.registrations,
  runs: event._count.draws,
  steward: event.createdBy.name ?? undefined,
  ownerId: event.createdBy.id,
  ownerName: event.createdBy.name ?? event.createdBy.email,
});
